// Army Service for PF2e Kingdom Lite
// Manages army operations, NPC actor integration, and support calculations

import { updateKingdom, getKingdomActor, currentFaction } from '../../stores/KingdomStore';
import { get } from 'svelte/store';
import type { Army } from '../../models/Army';
import type { Settlement } from '../../models/Settlement';
import { SettlementTierConfig } from '../../models/Settlement';
import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM, type OwnershipValue } from '../../types/ownership';
import { logger } from '../../utils/Logger';
import { positionToOffset, offsetToHexId } from '../hex-selector/coordinates';

/**
 * Represents an army's location on the scene map
 */
export interface ArmyLocation {
  /** Hex coordinate ID in "row.col" format (e.g., "50.18") */
  hexId: string;
  /** Army name */
  name: string;
  /** Army type (cavalry, infantry, etc.) */
  type: string | undefined;
  /** Army level */
  level: number;
  /** Faction leading this army (PLAYER_KINGDOM or faction ID) */
  ledBy: OwnershipValue;
  /** Internal army ID */
  armyId: string;
  /** Foundry actor ID */
  actorId: string;
}

export class ArmyService {
  /**
   * Create a new army with NPC actor (routes through GM via ActionDispatcher)
   * Auto-assigns to random settlement with available capacity
   * 
   * @param name - Army name
   * @param level - Army level (typically party level)
   * @param options - Optional army options (type, image, custom actor data, settlement assignment, upkeep exemption, ledBy faction, supportedBy faction)
   * @returns Created army with actorId
   */
  async createArmy(name: string, level: number, options?: { type?: string; portraitImage?: string; tokenImage?: string; actorData?: any; settlementId?: string | null; exemptFromUpkeep?: boolean; ledBy?: string; supportedBy?: string }): Promise<Army> {
    const { actionDispatcher } = await import('../ActionDispatcher');

    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }

    return await actionDispatcher.dispatch('createArmy', {
      name,
      level,
      type: options?.type,
      portraitImage: options?.portraitImage,
      tokenImage: options?.tokenImage,
      actorData: options?.actorData,
      settlementId: options?.settlementId,
      exemptFromUpkeep: options?.exemptFromUpkeep,
      ledBy: options?.ledBy,
      supportedBy: options?.supportedBy
    });
  }

  /**
   * Internal method - Create army with direct GM permissions
   * This is called by the socket handler on the GM's client
   * DO NOT call this directly from UI - use createArmy() instead
   * 
   * @internal
   */
  async _createArmyInternal(name: string, level: number, type?: string, portraitImage?: string, tokenImage?: string, actorData?: any, settlementId?: string | null, exemptFromUpkeep?: boolean, ledBy?: string, supportedBy?: string): Promise<Army> {

    // Generate unique army ID
    const armyId = `army-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create NPC actor in Foundry with army type images
    // Determine alliance based on faction attitude
    const factionId = ledBy || get(currentFaction) || PLAYER_KINGDOM;
    const actorId = await this.createNPCActor(name, level, portraitImage, tokenImage, actorData, factionId);
    
    // Determine which settlement to assign to (for support tracking)
    let supportSettlement: Settlement | null = null;
    if (settlementId) {
      // Use specified settlement for support
      const actor = getKingdomActor();
      const kingdom = actor?.getKingdomData();
      supportSettlement = kingdom?.settlements?.find((s: Settlement) => s.id === settlementId) || null;
    } else {
      // Auto-assign to random settlement with capacity
      supportSettlement = this.findRandomSettlementWithCapacity();
    }
    
    // Determine placement location (for token)
    // If unsupported, place at capital; otherwise place at support settlement
    let placementSettlement: Settlement | null = supportSettlement;
    if (!supportSettlement) {
      // Find capital for unsupported army placement
      const actor = getKingdomActor();
      const kingdom = actor?.getKingdomData();
      const capital = kingdom?.settlements?.find((s: Settlement) => 
        s.isCapital && (s.location.x !== 0 || s.location.y !== 0)
      );
      
      // Fallback to first valid settlement if no capital is marked
      if (!capital) {
        placementSettlement = kingdom?.settlements?.find((s: Settlement) => 
          s.location.x !== 0 || s.location.y !== 0
        ) || null;
      } else {
        placementSettlement = capital;
      }
    }
    
    // Create army record
    // Use provided ledBy (for allied armies), or default to current faction
    const faction = ledBy || get(currentFaction) || PLAYER_KINGDOM;
    
    const army: Army = {
      id: armyId,
      name,
      level,
      type,
      ledBy: faction,
      supportedBy: supportedBy || PLAYER_KINGDOM,
      isSupported: !!supportSettlement,
      supportedBySettlementId: supportSettlement?.id || null,
      turnsUnsupported: 0,
      actorId,
      exemptFromUpkeep
    };
    
    // Add to kingdom armies
    await updateKingdom((kingdom: KingdomData) => {
      if (!kingdom.armies) {
        kingdom.armies = [];
      }
      kingdom.armies.push(army);
      
      // Update settlement's supportedUnits
      if (supportSettlement) {
        const s = kingdom.settlements.find((s: Settlement) => s.id === supportSettlement.id);
        if (s) {
          s.supportedUnits.push(armyId);
        }
      }
    });
    
    // Add metadata flag to actor for identification
    await this.addArmyMetadata(actorId, armyId, type);
    
    // Place token at placement settlement location (only for player kingdom armies)
    // NPC faction armies don't need tokens on the map
    const isPlayerArmy = faction === PLAYER_KINGDOM;
    if (isPlayerArmy && placementSettlement && actorId) {
      const locationName = supportSettlement 
        ? `${placementSettlement.name} (support)` 
        : `${placementSettlement.name} (capital/default placement)`;
      
      logger.info(`🗺️ [ArmyService] Checking token placement for ${name} at ${locationName} (${placementSettlement.location.x}, ${placementSettlement.location.y})`);
      
      const hasLocation = placementSettlement.location && (placementSettlement.location.x !== 0 || placementSettlement.location.y !== 0);
      
      if (!hasLocation) {
        logger.warn(`⚠️ [ArmyService] Settlement ${placementSettlement.name} has invalid location (0,0), skipping token placement`);
      } else {
        try {
          logger.info(`🎯 [ArmyService] Attempting to place token for ${name} at ${locationName}`);
          const { placeArmyTokenAtSettlement } = await import('../../utils/armyHelpers');
          await placeArmyTokenAtSettlement(this, actorId, placementSettlement, name);
          logger.info(`✅ [ArmyService] Successfully placed token for ${name} at ${locationName}`);
        } catch (error) {
          logger.error(`❌ [ArmyService] Failed to place token for ${name}:`, error);
          // Don't fail army creation if token placement fails
        }
      }
    } else if (!isPlayerArmy) {
      logger.info(`ℹ️ [ArmyService] Skipping token placement for NPC faction army ${name}`);
    } else {
      logger.warn(`⚠️ [ArmyService] Cannot place token - placementSettlement: ${!!placementSettlement}, actorId: ${!!actorId}`);
    }
    
    const supportMsg = supportSettlement 
      ? ` assigned to ${supportSettlement.name}`
      : ' (unsupported - no available settlement capacity)';

    return army;
  }
  
  /**
   * Link an existing NPC actor to an army
   * Validates actor exists, is an NPC, and is not already linked
   * 
   * @param armyId - Army ID to link
   * @param actorId - Actor ID to link to army
   * @throws Error if validation fails
   */
  async linkExistingActor(armyId: string, actorId: string): Promise<void> {
    const game = (globalThis as any).game;
    
    // Validate actor exists and is NPC
    const actor = game?.actors?.get(actorId);
    if (!actor) {
      throw new Error('Actor not found');
    }
    
    if (actor.type !== 'npc') {
      throw new Error('Only NPC actors can be linked to armies');
    }
    
    // Check if actor already linked to another army
    const existingMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    if (existingMetadata) {
      const kingdom = getKingdomActor()?.getKingdomData();
      const linkedArmy = kingdom?.armies?.find(a => a.id === existingMetadata.armyId);
      throw new Error(`Actor already linked to army: ${linkedArmy?.name || existingMetadata.armyId}`);
    }
    
    // Update actor's prototype token to enable actorLink
    await actor.update({
      'prototypeToken.actorLink': true
    });
    logger.info(`✅ [ArmyService] Set actorLink: true on ${actor.name}`);
    
    // Update army record
    await updateKingdom((k: KingdomData) => {
      const army = k.armies.find((a: any) => a.id === armyId);
      if (!army) {
        throw new Error('Army not found');
      }
      army.actorId = actorId;
    });
    
    // Add metadata to actor
    const kingdom = getKingdomActor()?.getKingdomData();
    const army = kingdom?.armies?.find(a => a.id === armyId);
    await this.addArmyMetadata(actorId, armyId, army?.type);
    
    // Sync name/level from army to actor
    await this.syncArmyToActor(armyId);
    
    logger.info(`🔗 [ArmyService] Linked actor ${actor.name} to army ${army?.name}`);
  }
  
  /**
   * Unlink an actor from an army
   * Removes metadata from actor and clears actorId from army
   * Does NOT delete either the actor or the army
   * 
   * @param armyId - Army ID to unlink
   * @throws Error if army not found or has no linked actor
   */
  async unlinkActor(armyId: string): Promise<void> {
    const kingdom = getKingdomActor()?.getKingdomData();
    const army = kingdom?.armies?.find(a => a.id === armyId);
    
    if (!army) {
      throw new Error('Army not found');
    }
    
    if (!army.actorId) {
      throw new Error('Army has no linked actor');
    }
    
    const game = (globalThis as any).game;
    const actor = game?.actors?.get(army.actorId);
    
    // Remove metadata from actor (if actor still exists)
    if (actor) {
      await actor.unsetFlag('pf2e-reignmaker', 'army-metadata');
      logger.info(`🔓 [ArmyService] Removed army metadata from actor ${actor.name}`);
    }
    
    // Remove actorId from army
    await updateKingdom((k: KingdomData) => {
      const a = k.armies.find((army: any) => army.id === armyId);
      if (a) {
        a.actorId = undefined;
      }
    });
    
    logger.info(`🔓 [ArmyService] Unlinked actor from army ${army.name}`);
  }
  
  /**
   * Disband an army (routes through GM via ActionDispatcher)
   * 
   * @param armyId - ID of army to disband
   * @param deleteActor - Whether to delete the linked actor (default: true)
   * @returns Refund amount and army details
   */
  async disbandArmy(armyId: string, deleteActor: boolean = true): Promise<{ 
    armyName: string; 
    refund: number;
    actorId?: string;
  }> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('disbandArmy', { armyId, deleteActor });
  }
  
  /**
   * Place army token on scene (routes through GM via ActionDispatcher)
   * 
   * @param actorId - Actor ID of the army
   * @param sceneId - Scene ID where token should be placed
   * @param x - X coordinate in pixels
   * @param y - Y coordinate in pixels
   */
  async placeArmyToken(actorId: string, sceneId: string, x: number, y: number): Promise<void> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('placeArmyToken', {
      actorId,
      sceneId,
      x,
      y
    });
  }

  /**
   * Internal method - Place army token with direct GM permissions
   * This is called by the socket handler on the GM's client
   * DO NOT call this directly from UI - use placeArmyToken() instead
   * 
   * @internal
   */
  async _placeArmyTokenInternal(actorId: string, sceneId: string, x: number, y: number): Promise<void> {

    const game = (globalThis as any).game;
    const scene = game?.scenes?.get(sceneId);
    
    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    
    // Get the actor to access its prototype token data
    const actor = game?.actors?.get(actorId);
    if (!actor) {
      throw new Error(`Actor not found: ${actorId}`);
    }
    
    // Create token data using actor's prototype token (initial position at hex center)
    const tokenData = {
      actorId: actorId,
      x: x,
      y: y,
      hidden: false,
      actorLink: true, // Link token to actor (changes to actor affect all tokens)
      // Explicitly set token image from actor's prototype token
      texture: {
        src: actor.prototypeToken?.texture?.src || actor.img
      },
      displayName: actor.prototypeToken?.displayName ?? 30 // Hover by Anyone (copy from prototype)
    };
    
    // Create the token first
    const createdTokens = await scene.createEmbeddedDocuments('Token', [tokenData]);
    const createdToken = createdTokens[0];
    
    // Get canvas for grid size
    const canvas = (globalThis as any).canvas;
    const gridSize = canvas?.grid?.size || 100;
    
    // Calculate pixel dimensions from the CREATED token
    const widthPx = createdToken.width * gridSize;
    const heightPx = createdToken.height * gridSize;
    
    // Calculate centered position (Foundry positions tokens by top-left corner)
    const centeredX = x - widthPx / 2;
    const centeredY = y - heightPx / 2;
    
    logger.info(`🎯 [ArmyService] Token dimensions: ${widthPx}x${heightPx}px (${createdToken.width}x${createdToken.height} grid units), adjusting position from (${x},${y}) to (${centeredX},${centeredY})`);
    
    // Update token position to center it on the hex
    await createdToken.update({
      x: centeredX,
      y: centeredY
    });

  }
  
  /**
   * Internal method - Disband army with direct GM permissions
   * This is called by the socket handler on the GM's client
   * DO NOT call this directly from UI - use disbandArmy() instead
   * 
   * @param armyId - Army ID to disband
   * @param deleteActor - Whether to delete the linked actor (default: true)
   * @internal
   */
  async _disbandArmyInternal(armyId: string, deleteActor: boolean = true): Promise<{ 
    armyName: string; 
    refund: number;
    actorId?: string;
  }> {
    logger.info(`🔧 [ArmyService] _disbandArmyInternal called: armyId=${armyId}, deleteActor=${deleteActor}`);

    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    // Find the army
    const army = kingdom.armies?.find((a: Army) => a.id === armyId);
    if (!army) {
      throw new Error(`Army with ID ${armyId} not found`);
    }
    
    const actorId = army.actorId;
    logger.info(`🔧 [ArmyService] Found army: ${army.name}, actorId: ${actorId}`);
    
    // Remove all tokens for this army from all scenes
    if (actorId) {
      logger.info(`🗑️ [ArmyService] Removing tokens for actorId: ${actorId}`);
      await this._removeArmyTokensFromAllScenes(actorId, army.name);
    } else {
      logger.warn(`⚠️ [ArmyService] No actorId found for army ${army.name}, skipping token removal`);
    }
    
    // Remove army from kingdom (no refund)
    logger.info(`🗑️ [ArmyService] Removing army from kingdom data`);
    await updateKingdom((kingdom: KingdomData) => {
      kingdom.armies = kingdom.armies.filter((a: Army) => a.id !== armyId);
      
      // Also remove from any settlement's supportedUnits
      kingdom.settlements.forEach((s: Settlement) => {
        s.supportedUnits = s.supportedUnits.filter((id: string) => id !== armyId);
      });
    });
    
    // Delete the NPC actor if requested and it exists
    if (deleteActor && actorId) {
      const game = (globalThis as any).game;
      const npcActor = game?.actors?.get(actorId);
      
      logger.info(`🗑️ [ArmyService] Attempting to delete actor: ${actorId}, found: ${!!npcActor}`);
      
      if (npcActor) {
        // Remove metadata before deleting to prevent hook interference
        await npcActor.unsetFlag('pf2e-reignmaker', 'army-metadata');
        await npcActor.delete();
        logger.info(`🗑️ [ArmyService] Deleted actor ${npcActor.name} with army`);
      } else {
        logger.warn(`⚠️ [ArmyService] Actor ${actorId} not found in game.actors`);
      }
    } else if (!deleteActor && actorId) {
      // Unlink the actor (remove metadata only)
      const game = (globalThis as any).game;
      const npcActor = game?.actors?.get(actorId);
      if (npcActor) {
        await npcActor.unsetFlag('pf2e-reignmaker', 'army-metadata');
        logger.info(`🔓 [ArmyService] Unlinked actor ${npcActor.name} from disbanded army`);
      }
    }

    logger.info(`✅ [ArmyService] Disband complete for ${army.name}`);
    return {
      armyName: army.name,
      refund: 0,
      actorId: actorId
    };
  }
  
  /**
   * Remove all tokens for an army actor from all scenes
   * Called when disbanding an army to clean up the map
   * 
   * @param actorId - Actor ID of the army
   * @param armyName - Name of the army (for logging)
   * @internal
   */
  async _removeArmyTokensFromAllScenes(actorId: string, armyName: string): Promise<void> {
    const game = (globalThis as any).game;
    
    if (!game?.scenes) {
      logger.warn(`⚠️ [ArmyService] Cannot remove tokens - scenes not available`);
      return;
    }
    
    let totalTokensRemoved = 0;
    
    // Iterate through all scenes
    for (const scene of game.scenes) {
      try {
        // Find all tokens for this actor in this scene
        const tokensToDelete = scene.tokens.filter((token: any) => token.actorId === actorId);
        
        if (tokensToDelete.length > 0) {
          const tokenIds = tokensToDelete.map((token: any) => token.id);
          await scene.deleteEmbeddedDocuments('Token', tokenIds);
          totalTokensRemoved += tokenIds.length;
          logger.info(`🗑️ [ArmyService] Removed ${tokenIds.length} token(s) for ${armyName} from scene ${scene.name}`);
        }
      } catch (error) {
        logger.error(`❌ [ArmyService] Failed to remove tokens from scene ${scene.name}:`, error);
        // Continue with other scenes even if one fails
      }
    }
    
    if (totalTokensRemoved > 0) {
      logger.info(`✅ [ArmyService] Removed ${totalTokensRemoved} total token(s) for ${armyName} from all scenes`);
    } else {
      logger.info(`ℹ️ [ArmyService] No tokens found for ${armyName} on any scene`);
    }
  }
  
  /**
   * Create NPC actor in Foundry for an army
   * Places actor in "ReignMaker/Armies" folder for player armies
   * Places actor in "ReignMaker/Armies/npcArmies" folder for NPC faction armies
   * 
   * @param name - Actor name
   * @param level - Actor level
   * @param image - Optional image path for portrait and token
   * @param customData - Optional custom actor data
   * @param factionId - Optional faction ID to determine alliance and folder
   * @returns Actor ID
   * @throws Error if Foundry not ready or creation fails
   */
  async createNPCActor(name: string, level: number, portraitImage?: string, tokenImage?: string, customData?: any, factionId?: string): Promise<string> {

    const { createNPCInFolder } = await import('../actors/folderManager');
    const game = (globalThis as any).game;

    // Determine alliance based on faction attitude
    let alliance: "party" | "neutral" | "opposition" = "party";
    const isNPCFaction = factionId && factionId !== PLAYER_KINGDOM;

    if (isNPCFaction) {
      // Get faction attitude to determine alliance
      const actor = getKingdomActor();
      const kingdom = actor?.getKingdomData();
      const faction = kingdom?.factions?.find((f: any) => f.id === factionId);

      if (faction) {
        // Indifferent or better = neutral, worse than indifferent = opposition
        const attitudeOrder = ['Helpful', 'Friendly', 'Indifferent', 'Unfriendly', 'Hostile'];
        const attitudeIndex = attitudeOrder.indexOf(faction.attitude);
        const indifferentIndex = attitudeOrder.indexOf('Indifferent');

        if (attitudeIndex >= indifferentIndex) {
          // Indifferent or better
          alliance = "neutral";
        } else {
          // Worse than indifferent
          alliance = "opposition";
        }
      }
    }

    // Build additional actor data for armies
    // Use portrait image for actor img, token image for prototype token
    const additionalData = customData || {
      img: portraitImage || tokenImage, // Portrait image (fallback to token if not set)
      prototypeToken: {
        texture: {
          src: tokenImage || portraitImage // Token image (fallback to portrait if not set)
        },
        displayName: 30, // Hover by Anyone
        actorLink: true // Link tokens to actor (changes to actor affect all tokens)
      },
      system: {
        details: {
          level: { value: level },
          alliance: alliance, // Set based on faction attitude
          publicNotes: `Kingdom Army Unit - Level ${level}`
        },
        attributes: {
          hp: {
            value: level * 10,
            max: level * 10
          }
        }
      }
    };
    
    // Determine folder: NPC faction armies go in "Armies/npcArmies", player armies in "Armies"
    if (isNPCFaction) {
      // For NPC factions, create nested folder structure and create actor directly
      const npcArmiesFolderId = await this.ensureNestedArmyFolder();
      const game = (globalThis as any).game;
      
      const actorData = {
        name: name,
        type: 'npc',
        folder: npcArmiesFolderId,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        },
        ...additionalData
      };
      
      const npcActor = await game.actors.documentClass.create(actorData);
      
      if (!npcActor?.id) {
        throw new Error(`Failed to create NPC actor: ${name}`);
      }
      
      logger.info(`✅ [ArmyService] Created NPC faction army actor "${name}" in ReignMaker/Armies/npcArmies`);
      
      // Add faction effect to NPC faction army
      // Get actor fresh from game collection to ensure it's fully initialized
      const refreshedActor = game.actors.get(npcActor.id);
      
      if (refreshedActor) {
        try {
          // Get faction name from kingdom data
          const kingdomActor = getKingdomActor();
          const kingdom = kingdomActor?.getKingdomData();
          const faction = kingdom?.factions?.find((f: any) => f.id === factionId);
          const factionName = faction?.name || factionId || 'Unknown Faction';
          
          logger.info(`🎯 [ArmyService] Attempting to add faction effect "${factionName}" to NPC faction army "${name}"`);
          
          const factionEffect = {
            type: 'effect',
            name: factionName,
            img: 'icons/sundries/flags/banner-flag-white.webp',
            system: {
              slug: `faction-${factionId}`,
              badge: null,
              description: {
                value: `<p>This army belongs to ${factionName}.</p>`
              },
              duration: {
                value: -1,
                unit: 'unlimited',
                sustained: false,
                expiry: null
              },
              rules: []
            }
          };
          
          await refreshedActor.createEmbeddedDocuments('Item', [factionEffect]);
          logger.info(`✅ [ArmyService] Successfully added faction effect "${factionName}" to NPC faction army "${name}"`);
        } catch (error) {
          logger.error(`❌ [ArmyService] Failed to add faction effect to NPC faction army "${name}":`, error);
          // Don't fail actor creation if effect addition fails - log and continue
        }
      } else {
        logger.warn(`⚠️ [ArmyService] Could not find refreshed actor ${npcActor.id} after creation, skipping faction effect`);
      }
      
      return npcActor.id;
    } else {
      // For player armies, use regular Armies folder
      const npcActor = await createNPCInFolder(name, 'Armies', additionalData);
      return npcActor.id;
    }
  }
  
  /**
   * Ensure nested folder structure exists: ReignMaker/Armies/npcArmies
   * @returns Folder ID for npcArmies subfolder
   * @internal
   */
  private async ensureNestedArmyFolder(): Promise<string> {
    const game = (globalThis as any).game;
    const { ensureReignmakerFolder } = await import('../actors/folderManager');
    
    // First ensure "Armies" folder exists
    const armiesFolderId = await ensureReignmakerFolder('Armies');
    
    // Then find or create "npcArmies" subfolder inside "Armies"
    const parentFolder = game.folders.get(armiesFolderId);
    if (!parentFolder) {
      throw new Error('Armies folder not found');
    }
    
    const npcArmiesFolderName = 'npcArmies';
    let npcArmiesFolder = game.folders.find((f: any) =>
      f.type === "Actor" && f.name === npcArmiesFolderName && f.folder?.id === armiesFolderId
    );
    
    if (!npcArmiesFolder) {
      logger.info(`📁 [ArmyService] Creating "Armies/${npcArmiesFolderName}" subfolder...`);
      npcArmiesFolder = await game.folders.documentClass.create({
        name: npcArmiesFolderName,
        type: "Actor",
        folder: armiesFolderId,
        color: "#5e0000",
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        }
      });
      
      if (!npcArmiesFolder) {
        throw new Error(`Failed to create "${npcArmiesFolderName}" subfolder`);
      }
      logger.info(`✅ [ArmyService] Created "Armies/${npcArmiesFolderName}" subfolder`);
    }
    
    return npcArmiesFolder.id;
  }
  
  /**
   * Add metadata flag to army actor for identification
   * Should be called after actor creation to link actor to kingdom army data
   * 
   * @param actorId - The NPC actor ID
   * @param armyId - The army ID in kingdom data
   * @param armyType - The army type (cavalry, infantry, etc.)
   */
  async addArmyMetadata(actorId: string, armyId: string, armyType?: string): Promise<void> {

    const game = (globalThis as any).game;
    const npcActor = game?.actors?.get(actorId);
    
    if (!npcActor) {
      throw new Error(`NPC actor not found: ${actorId}`);
    }
    
    const kingdomActor = getKingdomActor();
    
    await npcActor.setFlag('pf2e-reignmaker', 'army-metadata', {
      armyId: armyId,
      armyType: armyType,
      kingdomActorId: kingdomActor?.id
    });

  }
  
  /**
   * Sync army data to its NPC actor
   * Updates name and level
   * 
   * @param armyId - Army ID to sync
   * @throws Error if army has no actor or actor not found
   */
  async syncArmyToActor(armyId: string): Promise<void> {

    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const army = kingdom.armies?.find((a: Army) => a.id === armyId);
    if (!army) {
      throw new Error(`Army with ID ${armyId} not found`);
    }
    
    if (!army.actorId) {
      throw new Error(`Army ${armyId} has no linked actor`);
    }
    
    const game = (globalThis as any).game;
    const npcActor = game?.actors?.get(army.actorId);
    
    if (!npcActor) {
      throw new Error(`NPC actor not found: ${army.actorId}`);
    }
    
    // Update actor name and level
    await npcActor.update({
      name: army.name,
      'system.details.level.value': army.level
    });

  }
  
  /**
   * Sync NPC actor data back to army
   * Useful if actor is edited directly
   * 
   * @param actorId - NPC actor ID
   */
  async syncActorToArmy(actorId: string): Promise<void> {

    const game = (globalThis as any).game;
    const npcActor = game?.actors?.get(actorId);
    
    if (!npcActor) {
      throw new Error(`NPC actor not found: ${actorId}`);
    }
    
    // Find army with this actorId
    await updateKingdom((kingdom: KingdomData) => {
      const army = kingdom.armies?.find((a: Army) => a.actorId === actorId);
      if (army) {
        army.name = npcActor.name;
        army.level = npcActor.system?.details?.level?.value || army.level;

      } else {
        logger.warn(`⚠️ [ArmyService] No army found for actor: ${actorId}`);
      }
    });
  }
  
  /**
   * Update army level
   * Also syncs to NPC actor
   * 
   * @param armyId - Army ID
   * @param newLevel - New level
   */
  async updateArmyLevel(armyId: string, newLevel: number): Promise<void> {

    await updateKingdom((kingdom: KingdomData) => {
      const army = kingdom.armies?.find((a: Army) => a.id === armyId);
      if (army) {
        army.level = newLevel;
      }
    });
    
    // Sync to actor
    await this.syncArmyToActor(armyId);

  }
  
  /**
   * Update army faction ownership (GM only)
   * 
   * @param armyId - Army ID
   * @param newFactionId - New faction ID (e.g., 'player', or a faction UUID)
   */
  async updateArmyFaction(armyId: string, newFactionId: string): Promise<void> {
    await updateKingdom((kingdom: KingdomData) => {
      const army = kingdom.armies?.find((a: Army) => a.id === armyId);
      if (!army) {
        throw new Error(`Army not found: ${armyId}`);
      }
      
      const oldFactionId = army.ledBy;
      
      // Update faction ownership
      army.ledBy = newFactionId;
      army.supportedBy = newFactionId;
      
      // If changing to non-player faction, clear settlement support
      if (newFactionId !== 'player') {
        // Remove from old settlement's supportedUnits
        if (army.supportedBySettlementId) {
          const oldSettlement = kingdom.settlements?.find(s => s.id === army.supportedBySettlementId);
          if (oldSettlement) {
            oldSettlement.supportedUnits = oldSettlement.supportedUnits.filter(id => id !== armyId);
          }
          army.supportedBySettlementId = null;
        }
        // Non-player armies are considered "supported" by their faction
        army.isSupported = true;
      } else {
        // Changing to player - starts unsupported until assigned to settlement
        army.isSupported = false;
      }
      
      logger.info(`[ArmyService] Updated army "${army.name}" faction from "${oldFactionId}" to "${newFactionId}"`);
    });
    
    // Sync to actor
    await this.syncArmyToActor(armyId);
  }
  
  /**
   * Move an army's token to a settlement location.
   * If the army has no token, creates one at the settlement.
   * 
   * @param armyId - Army ID
   * @param settlement - Settlement with location data
   */
  async moveArmyToSettlement(armyId: string, settlement: { id: string; name: string; location: { x: number; y: number } }): Promise<void> {
    const actor = getKingdomActor();
    const kingdom = actor?.getKingdomData();
    
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const army = kingdom.armies?.find((a: Army) => a.id === armyId);
    if (!army) {
      throw new Error(`Army not found: ${armyId}`);
    }
    
    if (!army.actorId) {
      throw new Error('Army has no linked actor');
    }
    
    const game = (globalThis as any).game;
    const canvas = (globalThis as any).canvas;
    const scene = canvas?.scene;
    
    if (!scene || !canvas?.grid) {
      throw new Error('No active scene or canvas available');
    }
    
    // Calculate pixel coordinates for settlement hex
    const i = settlement.location.x; // row
    const j = settlement.location.y; // column
    const center = canvas.grid.getCenterPoint({ i, j });
    
    // Check if token already exists on this scene
    const existingToken = scene.tokens.find((t: any) => t.actorId === army.actorId);
    
    if (existingToken) {
      // Move existing token
      logger.info(`[ArmyService] Moving existing token for ${army.name} to ${settlement.name} (${center.x}, ${center.y})`);
      await existingToken.update({
        x: center.x,
        y: center.y
      });
    } else {
      // Create new token at settlement
      logger.info(`[ArmyService] Creating token for ${army.name} at ${settlement.name} (${center.x}, ${center.y})`);
      await this.placeArmyToken(army.actorId, scene.id, center.x, center.y);
    }
    
    logger.info(`[ArmyService] Army ${army.name} moved to ${settlement.name}`);
  }
  
  /**
   * Update army actor properties (routes through GM via ActionDispatcher)
   * Updates both the actor and syncs changes back to kingdom data
   * 
   * @param actorId - Army actor ID
   * @param updateData - Data to update (name, level, hp, etc.)
   * @returns Updated actor
   */
  async updateArmyActor(actorId: string, updateData: any): Promise<any> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('updateArmyActor', {
      actorId,
      updateData
    });
  }
  
  /**
   * Add an item to an army actor (routes through GM via ActionDispatcher)
   * 
   * @param actorId - Army actor ID
   * @param itemData - Item data to add (name, type, etc.)
   * @returns Created item
   */
  async addItemToArmy(actorId: string, itemData: any): Promise<any> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('addItemToArmy', {
      actorId,
      itemData
    });
  }
  
  /**
   * Remove an item from an army actor (routes through GM via ActionDispatcher)
   * 
   * @param actorId - Army actor ID
   * @param itemId - Item ID to remove
   */
  async removeItemFromArmy(actorId: string, itemId: string): Promise<void> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('removeItemFromArmy', {
      actorId,
      itemId
    });
  }

  /**
   * Update an embedded item on an army actor (routes through GM via ActionDispatcher)
   * Used for updating conditions/effects (e.g., increasing enfeebled value)
   * 
   * @param actorId - Army actor ID
   * @param itemId - Item ID to update
   * @param updateData - Data to update on the item
   * @returns Updated item
   */
  async updateItemOnArmy(actorId: string, itemId: string, updateData: any): Promise<any> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('updateItemOnArmy', {
      actorId,
      itemId,
      updateData
    });
  }
  
  /**
   * Assign army to a settlement for support
   * Validates capacity and updates both army and settlement records
   * 
   * @param armyId - Army ID
   * @param settlementId - Settlement ID (or null to unassign)
   * @throws Error if settlement not found or at capacity
   */
  async assignArmyToSettlement(armyId: string, settlementId: string | null): Promise<void> {

    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    await updateKingdom((k: KingdomData) => {
      const army = k.armies.find((a: any) => a.id === armyId);
      if (!army) {
        throw new Error(`Army not found: ${armyId}`);
      }
      
      // Remove from old settlement
      if (army.supportedBySettlementId) {
        const oldSettlement = k.settlements.find(
          (s: Settlement) => s.id === army.supportedBySettlementId
        );
        if (oldSettlement) {
          oldSettlement.supportedUnits = oldSettlement.supportedUnits.filter(
            (id: string) => id !== armyId
          );
        }
      }
      
      // Add to new settlement (or unassign)
      if (settlementId) {
        const newSettlement = k.settlements.find((s: Settlement) => s.id === settlementId);
        if (!newSettlement) {
          throw new Error(`Settlement not found: ${settlementId}`);
        }
        
        // Validate capacity (allow if army already assigned here)
        const capacity = SettlementTierConfig[newSettlement.tier].armySupport;
        const currentlySupporting = newSettlement.supportedUnits.filter(
          (id: string) => id !== armyId // Exclude current army from count
        ).length;
        
        if (currentlySupporting >= capacity) {
          throw new Error(
            `${newSettlement.name} is at capacity (${capacity}/${capacity})`
          );
        }
        
        // Assign
        newSettlement.supportedUnits.push(armyId);
        army.supportedBySettlementId = settlementId;
        army.isSupported = true;
        army.turnsUnsupported = 0;

      } else {
        // Manually unassigned
        army.supportedBySettlementId = null;
        army.isSupported = false;
        // turnsUnsupported increments during Upkeep phase

      }
    });
  }
  
  /**
   * Find a random settlement with available army support capacity
   * Used for auto-assignment when creating new armies
   * Only includes settlements with valid map locations
   * 
   * @returns Settlement with capacity, or null if none available
   */
  findRandomSettlementWithCapacity(): Settlement | null {
    const actor = getKingdomActor();
    if (!actor) return null;
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) return null;
    
    // Find all settlements with available capacity
    // Only count settlements with valid locations (exclude unmapped at 0,0)
    const available = kingdom.settlements.filter((s: Settlement) => {
      // Must have a valid map location
      const hasLocation = s.location.x !== 0 || s.location.y !== 0;
      if (!hasLocation) return false;
      
      const capacity = SettlementTierConfig[s.tier]?.armySupport || 0;
      const current = s.supportedUnits.length;
      return current < capacity;
    });
    
    if (available.length === 0) {

      return null;
    }
    
    // Pick random
    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];

    return selected;
  }
  
  
  /**
   * Process army support assignments
   * Determines which armies are supported vs unsupported
   * Called during Upkeep phase
   * 
   * @param armies - All armies
   * @param availableSupport - Total support capacity from settlements
   * @returns Sets of supported/unsupported army IDs
   */
  processArmySupport(armies: Army[], availableSupport: number): {
    supported: Set<string>,
    unsupported: Set<string>
  } {

    const supported = new Set<string>();
    const unsupported = new Set<string>();
    
    if (armies.length <= availableSupport) {
      // All armies can be supported
      armies.forEach(army => {
        supported.add(army.id);
      });
    } else {
      // Not enough support - prioritize by level (higher level first)
      // TODO: Add more sophisticated priority system
      const sortedArmies = [...armies].sort((a, b) => b.level - a.level);
      
      sortedArmies.forEach((army, index) => {
        if (index < availableSupport) {
          supported.add(army.id);
        } else {
          unsupported.add(army.id);
        }
      });
    }

    return { supported, unsupported };
  }
  
  /**
   * Calculate total upkeep cost for armies
   * Currently a stub - will be used when economic system is expanded
   * 
   * @param armies - All armies
   * @returns Total upkeep cost in gold
   */
  calculateUpkeepCost(armies: Army[]): number {
    // TODO: Implement upkeep cost calculation
    // For now, return 0 (upkeep not yet in game rules)
    return 0;
  }
  
  /**
   * Calculate morale penalty for an army
   * Based on turns unsupported
   * 
   * @param army - Army to check
   * @returns Morale penalty value
   */
  calculateMoralePenalty(army: Army): number {
    // TODO: Implement morale system
    // Simple formula: -1 per turn unsupported (max -5)
    return Math.min(army.turnsUnsupported, 5);
  }
  
  /**
   * Get armies assigned to a specific settlement
   * 
   * @param settlementId - Settlement ID
   * @returns Armies supported by this settlement
   */
  getArmiesBySettlement(settlementId: string): Army[] {
    // TODO: Implement when we add settlement-army assignments

    return [];
  }
  
  /**
   * Check if kingdom can recruit a new army
   * 
   * @param kingdom - Kingdom data
   * @returns Validation result
   */
  canRecruitArmy(kingdom: KingdomData): { canRecruit: boolean; reason?: string } {
    // Check gold cost (simplified for now)
    const recruitCost = 50; // Base cost
    
    if (kingdom.resources.gold < recruitCost) {
      return {
        canRecruit: false,
        reason: `Insufficient gold (need ${recruitCost}, have ${kingdom.resources.gold})`
      };
    }
    
    // Check support capacity (warning only, not blocking)
    const supportCapacity = kingdom.resources?.armyCapacity || 0;
    const currentArmies = kingdom.armies?.length || 0;
    
    if (currentArmies >= supportCapacity) {
      return {
        canRecruit: true, // Allow but warn
        reason: `Warning: Army will be unsupported (${currentArmies + 1}/${supportCapacity})`
      };
    }
    
    return { canRecruit: true };
  }
  
  /**
   * Check if an army can be trained to a higher level
   * 
   * @param army - Army to train
   * @param targetLevel - Target level
   * @returns Validation result
   */
  canTrainArmy(army: Army, targetLevel: number): { canTrain: boolean; reason?: string } {
    // Army level cannot exceed party level
    // We'll need party level from game actors
    const game = (globalThis as any).game;
    let maxLevel = 20; // Default max
    
    if (game?.actors) {
      const partyActors = Array.from(game.actors).filter((a: any) => 
        a.type === 'character' && a.hasPlayerOwner
      );
      if (partyActors.length > 0) {
        maxLevel = (partyActors[0] as any).level || 20;
      }
    }
    
    if (targetLevel > maxLevel) {
      return {
        canTrain: false,
        reason: `Army level cannot exceed party level (${maxLevel})`
      };
    }
    
    if (targetLevel <= army.level) {
      return {
        canTrain: false,
        reason: `Target level must be higher than current level (${army.level})`
      };
    }
    
    return { canTrain: true };
  }
  
  /**
   * Check morale for one or more armies
   * Opens a floating panel UI for the player to roll morale checks
   * 
   * @param armyIds - IDs of armies that need morale checks
   * @param options - Optional configuration (title for the panel)
   * @returns Array of morale check results
   */
  async checkArmyMorale(armyIds: string[], options?: { title?: string }): Promise<import('../../types/MoraleCheck').MoraleCheckResult[]> {
    const { armyMoralePanel } = await import('./ArmyMoralePanel');
    return await armyMoralePanel.checkArmyMorale(armyIds, options);
  }
  
  /**
   * Get the locations of all armies currently on the active scene
   * Returns army information with hex coordinates for each army token found
   * 
   * @returns Array of army locations with hex coordinates and army details
   */
  getArmyLocationsOnScene(): ArmyLocation[] {
    const canvas = (globalThis as any).canvas;
    
    if (!canvas?.scene || !canvas?.tokens) {
      logger.warn('[ArmyService] Cannot get army locations - canvas not ready');
      return [];
    }
    
    const armyLocations: ArmyLocation[] = [];
    const actor = getKingdomActor();
    const kingdom = actor?.getKingdomData();
    
    if (!kingdom?.armies) {
      logger.info('[ArmyService] No armies in kingdom data');
      return [];
    }
    
    // Iterate through all tokens on the scene
    for (const token of canvas.tokens.placeables) {
      try {
        const tokenDoc = token.document;
        const tokenActor = tokenDoc?.actor;
        
        if (!tokenActor) continue;
        
        // Check if this actor has army metadata
        const armyMetadata = tokenActor.getFlag('pf2e-reignmaker', 'army-metadata');
        if (!armyMetadata?.armyId) continue;
        
        // Find the corresponding army in kingdom data
        const army = kingdom.armies.find((a: Army) => a.id === armyMetadata.armyId);
        if (!army) {
          logger.warn(`[ArmyService] Token has army metadata but army not found in kingdom: ${armyMetadata.armyId}`);
          continue;
        }
        
        // Get token center position (tokens are positioned by top-left corner)
        const gridSize = canvas.grid?.size || 100;
        const tokenCenterX = tokenDoc.x + (tokenDoc.width * gridSize) / 2;
        const tokenCenterY = tokenDoc.y + (tokenDoc.height * gridSize) / 2;
        
        // Convert position to hex coordinates
        const offset = positionToOffset(tokenCenterX, tokenCenterY);
        const hexId = offsetToHexId(offset);
        
        armyLocations.push({
          hexId,
          name: army.name,
          type: army.type,
          level: army.level,
          ledBy: army.ledBy,
          armyId: army.id,
          actorId: army.actorId || tokenActor.id
        });
        
      } catch (error) {
        logger.error('[ArmyService] Error processing token for army location:', error);
      }
    }
    
    logger.info(`[ArmyService] Found ${armyLocations.length} army location(s) on scene`);
    return armyLocations;
  }
}

// Export singleton instance
export const armyService = new ArmyService();
