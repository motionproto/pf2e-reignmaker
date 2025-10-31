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
    
    // Update army record
    await updateKingdom(k => {
      const army = k.armies.find((a: Army): boolean => a.id === armyId);
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
    await updateKingdom(k => {
      const a = k.armies.find((army: Army): boolean => army.id === armyId);
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
      }
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
    
    // Remove army from kingdom (no refund)
    await updateKingdom(kingdom => {
      kingdom.armies = kingdom.armies.filter((a: Army): boolean => a.id !== armyId);
      
      // Also remove from any settlement's supportedUnits
      kingdom.settlements.forEach((s: Settlement) => {
        s.supportedUnits = s.supportedUnits.filter((id: string): boolean => id !== armyId);
      });
    });
    
    // Delete the NPC actor if requested and it exists
    if (deleteActor && actorId) {
      const game = (globalThis as any).game;
      const npcActor = game?.actors?.get(actorId);
      
      if (npcActor) {
        // Remove metadata before deleting to prevent hook interference
        await npcActor.unsetFlag('pf2e-reignmaker', 'army-metadata');
        await npcActor.delete();
        logger.info(`🗑️ [ArmyService] Deleted actor ${npcActor.name} with army`);
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

    return {
      armyName: army.name,
      refund: 0,
      actorId: actorId
    };
  }
  
  /**
   * Create NPC actor in Foundry for an army
   * Places actor in "ReignMaker/Armies" folder
   * 
   * @param name - Actor name
   * @param level - Actor level
   * @param image - Optional image path for portrait and token
   * @param customData - Optional custom actor data
   * @returns Actor ID
   * @throws Error if Foundry not ready or creation fails
   */
  async createNPCActor(name: string, level: number, image?: string, customData?: any): Promise<string> {

    const { createNPCInFolder } = await import('../actors/folderManager');
    
    // Build additional actor data for armies
    const additionalData = customData || {
      img: image, // Portrait image
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
    
    // Use shared folder manager to create actor
    const npcActor = await createNPCInFolder(name, 'Armies', additionalData);

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
    await updateKingdom(kingdom => {
      const army = kingdom.armies?.find((a: Army): boolean => a.actorId === actorId);
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

    await updateKingdom(kingdom => {
      const army = kingdom.armies?.find((a: Army): boolean => a.id === armyId);
      if (army) {
        army.level = newLevel;
      }
    });
    
    // Sync to actor
    await this.syncArmyToActor(armyId);

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
    
    await updateKingdom(k => {
      const army = k.armies.find((a: Army): boolean => a.id === armyId);
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
}

// Export singleton instance
export const armyService = new ArmyService();
