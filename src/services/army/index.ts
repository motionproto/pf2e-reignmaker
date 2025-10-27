// Army Service for PF2e Kingdom Lite
// Manages army operations, NPC actor integration, and support calculations

import { updateKingdom, getKingdomActor, currentFaction } from '../../stores/KingdomStore';
import { get } from 'svelte/store';
import type { Army } from '../../models/Army';
import type { Settlement } from '../../models/Settlement';
import { SettlementTierConfig } from '../../models/Settlement';
import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { logger } from '../../utils/Logger';

export class ArmyService {
  /**
   * Create a new army with NPC actor (routes through GM via ActionDispatcher)
   * Auto-assigns to random settlement with available capacity
   * 
   * @param name - Army name
   * @param level - Army level (typically party level)
   * @param options - Optional army options (type, image, custom actor data)
   * @returns Created army with actorId
   */
  async createArmy(name: string, level: number, options?: { type?: string; image?: string; actorData?: any }): Promise<Army> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('createArmy', {
      name,
      level,
      type: options?.type,
      image: options?.image,
      actorData: options?.actorData
    });
  }

  /**
   * Internal method - Create army with direct GM permissions
   * This is called by the socket handler on the GM's client
   * DO NOT call this directly from UI - use createArmy() instead
   * 
   * @internal
   */
  async _createArmyInternal(name: string, level: number, type?: string, image?: string, actorData?: any): Promise<Army> {
    logger.debug(`🪖 [ArmyService] Creating army: ${name} (Level ${level})`);
    
    // Generate unique army ID
    const armyId = `army-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create NPC actor in Foundry with army type image
    const actorId = await this.createNPCActor(name, level, image, actorData);
    
    // Auto-assign to random settlement with capacity
    const settlement = this.findRandomSettlementWithCapacity();
    
    // Create army record
    // Default to current faction (PLAYER_KINGDOM if not GM switching factions)
    const faction = get(currentFaction) || PLAYER_KINGDOM;
    
    const army: Army = {
      id: armyId,
      name: name,
      level: level,
      type: type,
      ledBy: faction, // Set ledBy based on current faction view
      isSupported: !!settlement,
      turnsUnsupported: settlement ? 0 : 1,
      actorId: actorId,
      supportedBySettlementId: settlement?.id ?? null
    };
    
    // Add to kingdom armies
    await updateKingdom(kingdom => {
      if (!kingdom.armies) {
        kingdom.armies = [];
      }
      kingdom.armies.push(army);
      
      // Update settlement's supportedUnits
      if (settlement) {
        const s = kingdom.settlements.find(s => s.id === settlement.id);
        if (s) {
          s.supportedUnits.push(armyId);
        }
      }
    });
    
    // Add metadata flag to actor for identification
    await this.addArmyMetadata(actorId, armyId, type);
    
    const supportMsg = settlement 
      ? ` assigned to ${settlement.name}`
      : ' (unsupported - no available settlement capacity)';
    
    logger.debug(`✅ [ArmyService] Army created: ${name}${supportMsg}`);
    return army;
  }
  
  /**
   * Disband an army (routes through GM via ActionDispatcher)
   * 
   * @param armyId - ID of army to disband
   * @returns Refund amount and army details
   */
  async disbandArmy(armyId: string): Promise<{ 
    armyName: string; 
    refund: number;
    actorId?: string;
  }> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('disbandArmy', { armyId });
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
    logger.debug(`🎭 [ArmyService] Placing token for actor ${actorId} at (${x}, ${y})`);
    
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
    
    // Create token data using actor's prototype token
    const tokenData = {
      actorId: actorId,
      x: x,
      y: y,
      hidden: false,
      actorLink: true, // Link token to actor (changes to actor affect all tokens)
      // Explicitly set token image from actor's prototype token
      texture: {
        src: actor.prototypeToken?.texture?.src || actor.img
      }
    };
    
    await scene.createEmbeddedDocuments('Token', [tokenData]);
    
    logger.debug(`✅ [ArmyService] Token placed successfully at (${x}, ${y}) with image: ${tokenData.texture.src} (linked: true)`);
  }
  
  /**
   * Internal method - Disband army with direct GM permissions
   * This is called by the socket handler on the GM's client
   * DO NOT call this directly from UI - use disbandArmy() instead
   * 
   * @internal
   */
  async _disbandArmyInternal(armyId: string): Promise<{ 
    armyName: string; 
    refund: number;
    actorId?: string;
  }> {
    logger.debug(`🪖 [ArmyService] Disbanding army: ${armyId}`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    // Find the army
    const army = kingdom.armies?.find(a => a.id === armyId);
    if (!army) {
      throw new Error(`Army with ID ${armyId} not found`);
    }
    
    const actorId = army.actorId;
    
    // Remove army from kingdom (no refund)
    await updateKingdom(kingdom => {
      kingdom.armies = kingdom.armies.filter(a => a.id !== armyId);
      
      // Also remove from any settlement's supportedUnits
      kingdom.settlements.forEach(s => {
        s.supportedUnits = s.supportedUnits.filter(id => id !== armyId);
      });
    });
    
    // Delete the NPC actor if it exists
    if (actorId) {
      const game = (globalThis as any).game;
      const npcActor = game?.actors?.get(actorId);
      
      if (npcActor) {
        await npcActor.delete();
        logger.debug(`🗑️ [ArmyService] Deleted NPC actor: ${actorId}`);
      }
    }
    
    logger.debug(`✅ [ArmyService] Army disbanded: ${army.name}`);
    
    return {
      armyName: army.name,
      refund: 0,
      actorId: actorId
    };
  }
  
  /**
   * Create NPC actor in Foundry for an army
   * Places actor in "Reignmaker Armies" folder
   * 
   * @param name - Actor name
   * @param level - Actor level
   * @param image - Optional image path for portrait and token
   * @param customData - Optional custom actor data
   * @returns Actor ID
   * @throws Error if Foundry not ready or creation fails
   */
  async createNPCActor(name: string, level: number, image?: string, customData?: any): Promise<string> {
    logger.debug(`🎭 [ArmyService] Creating NPC actor: ${name} (Level ${level})`);
    
    const game = (globalThis as any).game;
    
    // Fail fast if Foundry not ready
    if (!game?.actors || !game?.folders) {
      throw new Error('Foundry VTT not initialized - cannot create actors');
    }
    
    // Find "Reignmaker Armies" folder (should be created by initialization hook)
    const folderName = "Reignmaker Armies";
    let folder = game.folders.find((f: any) =>
      f.type === "Actor" && f.name === folderName
    );
    
    if (!folder) {
      // Fallback: Create folder if it doesn't exist (shouldn't happen if hooks ran properly)
      logger.warn(`📁 [ArmyService] "${folderName}" folder not found, creating as fallback...`);
      folder = await game.folders.documentClass.create({
        name: folderName,
        type: "Actor",
        color: "#5e0000",
        img: "icons/svg/castle.svg",
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER // Allow all players to create armies
        }
      });
      
      if (!folder) {
        throw new Error(`Failed to create "${folderName}" folder`);
      }
      
      logger.debug(`✅ [ArmyService] Created "${folderName}" folder with OWNER permissions`);
    }
    
    // Default NPC actor data
    const npcData = customData || {
      name: name,
      type: 'npc',
      folder: folder.id, // Place in folder
      img: image, // Portrait image
      // Set ownership so all players can see/edit the army actor
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      },
      prototypeToken: {
        texture: {
          src: image // Token image
        }
      },
      system: {
        details: {
          level: { value: level },
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
    
    // Create the actor
    const npcActor = await game.actors.documentClass.create(npcData);
    
    if (!npcActor?.id) {
      throw new Error(`Failed to create NPC actor: ${name}`);
    }
    
    logger.debug(`✅ [ArmyService] NPC actor created in folder: ${npcActor.id}`);
    return npcActor.id;
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
    logger.debug(`🏷️ [ArmyService] Adding metadata to actor ${actorId}`);
    
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
    
    logger.debug(`✅ [ArmyService] Metadata added to actor`);
  }
  
  /**
   * Sync army data to its NPC actor
   * Updates name and level
   * 
   * @param armyId - Army ID to sync
   * @throws Error if army has no actor or actor not found
   */
  async syncArmyToActor(armyId: string): Promise<void> {
    logger.debug(`🔄 [ArmyService] Syncing army to actor: ${armyId}`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const army = kingdom.armies?.find(a => a.id === armyId);
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
    
    logger.debug(`✅ [ArmyService] Synced ${army.name} to NPC actor`);
  }
  
  /**
   * Sync NPC actor data back to army
   * Useful if actor is edited directly
   * 
   * @param actorId - NPC actor ID
   */
  async syncActorToArmy(actorId: string): Promise<void> {
    logger.debug(`🔄 [ArmyService] Syncing actor to army: ${actorId}`);
    
    const game = (globalThis as any).game;
    const npcActor = game?.actors?.get(actorId);
    
    if (!npcActor) {
      throw new Error(`NPC actor not found: ${actorId}`);
    }
    
    // Find army with this actorId
    await updateKingdom(kingdom => {
      const army = kingdom.armies?.find(a => a.actorId === actorId);
      if (army) {
        army.name = npcActor.name;
        army.level = npcActor.system?.details?.level?.value || army.level;
        logger.debug(`✅ [ArmyService] Synced NPC actor to ${army.name}`);
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
    logger.debug(`📈 [ArmyService] Updating army level: ${armyId} → ${newLevel}`);
    
    await updateKingdom(kingdom => {
      const army = kingdom.armies?.find(a => a.id === armyId);
      if (army) {
        army.level = newLevel;
      }
    });
    
    // Sync to actor
    await this.syncArmyToActor(armyId);
    
    logger.debug(`✅ [ArmyService] Army level updated to ${newLevel}`);
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
    logger.debug(`🏘️ [ArmyService] Assigning army ${armyId} to settlement ${settlementId || 'none'}...`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    await updateKingdom(k => {
      const army = k.armies.find(a => a.id === armyId);
      if (!army) {
        throw new Error(`Army not found: ${armyId}`);
      }
      
      // Remove from old settlement
      if (army.supportedBySettlementId) {
        const oldSettlement = k.settlements.find(
          s => s.id === army.supportedBySettlementId
        );
        if (oldSettlement) {
          oldSettlement.supportedUnits = oldSettlement.supportedUnits.filter(
            id => id !== armyId
          );
        }
      }
      
      // Add to new settlement (or unassign)
      if (settlementId) {
        const newSettlement = k.settlements.find(s => s.id === settlementId);
        if (!newSettlement) {
          throw new Error(`Settlement not found: ${settlementId}`);
        }
        
        // Validate capacity (allow if army already assigned here)
        const capacity = SettlementTierConfig[newSettlement.tier].armySupport;
        const currentlySupporting = newSettlement.supportedUnits.filter(
          id => id !== armyId // Exclude current army from count
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
        
        logger.debug(`✅ [ArmyService] Army ${armyId} assigned to ${newSettlement.name}`);
      } else {
        // Manually unassigned
        army.supportedBySettlementId = null;
        army.isSupported = false;
        // turnsUnsupported increments during Upkeep phase
        
        logger.debug(`✅ [ArmyService] Army ${armyId} unassigned (unsupported)`);
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
    const available = kingdom.settlements.filter(s => {
      // Must have a valid map location
      const hasLocation = s.location.x !== 0 || s.location.y !== 0;
      if (!hasLocation) return false;
      
      const capacity = SettlementTierConfig[s.tier].armySupport;
      const current = s.supportedUnits.length;
      return current < capacity;
    });
    
    if (available.length === 0) {
      logger.debug('⚠️ [ArmyService] No settlements with available army capacity');
      return null;
    }
    
    // Pick random
    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];
    
    logger.debug(`🎲 [ArmyService] Randomly selected ${selected.name} for army support`);
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
    logger.debug(`🔧 [ArmyService] Processing army support (capacity: ${availableSupport})...`);
    
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
    
    logger.debug(`✅ [ArmyService] Support processed: ${supported.size} supported, ${unsupported.size} unsupported`);
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
    logger.debug(`🔍 [ArmyService] STUB: Get armies for settlement ${settlementId}`);
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
}

// Export singleton instance
export const armyService = new ArmyService();
