// Army Service for PF2e Kingdom Lite
// Manages army operations, NPC actor integration, and support calculations

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import type { Army } from '../../models/BuildProject';
import type { Settlement } from '../../models/Settlement';
import { SettlementTierConfig } from '../../models/Settlement';
import type { KingdomData } from '../../actors/KingdomActor';

export class ArmyService {
  /**
   * Create a new army with NPC actor (routes through GM via ActionDispatcher)
   * Auto-assigns to random settlement with available capacity
   * 
   * @param name - Army name
   * @param level - Army level (typically party level)
   * @param actorData - Optional custom NPC actor data
   * @returns Created army with actorId
   */
  async createArmy(name: string, level: number, actorData?: any): Promise<Army> {
    const { actionDispatcher } = await import('../ActionDispatcher');
    
    if (!actionDispatcher.isAvailable()) {
      throw new Error('Action dispatcher not initialized. Please reload the game.');
    }
    
    return await actionDispatcher.dispatch('createArmy', {
      name,
      level,
      actorData
    });
  }

  /**
   * Internal method - Create army with direct GM permissions
   * This is called by the socket handler on the GM's client
   * DO NOT call this directly from UI - use createArmy() instead
   * 
   * @internal
   */
  async _createArmyInternal(name: string, level: number, actorData?: any): Promise<Army> {
    console.log(`🪖 [ArmyService] Creating army: ${name} (Level ${level})`);
    
    // Generate unique army ID
    const armyId = `army-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create NPC actor in Foundry
    const actorId = await this.createNPCActor(name, level, actorData);
    
    // Auto-assign to random settlement with capacity
    const settlement = this.findRandomSettlementWithCapacity();
    
    // Create army record
    const army: Army = {
      id: armyId,
      name: name,
      level: level,
      isSupported: !!settlement,
      turnsUnsupported: settlement ? 0 : 1,
      actorId: actorId,
      supportedBySettlementId: settlement?.id
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
    
    const supportMsg = settlement 
      ? ` assigned to ${settlement.name}`
      : ' (unsupported - no available settlement capacity)';
    
    console.log(`✅ [ArmyService] Army created: ${name}${supportMsg}`);
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
    console.log(`🪖 [ArmyService] Disbanding army: ${armyId}`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
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
        console.log(`🗑️ [ArmyService] Deleted NPC actor: ${actorId}`);
      }
    }
    
    console.log(`✅ [ArmyService] Army disbanded: ${army.name}`);
    
    return {
      armyName: army.name,
      refund: 0,
      actorId: actorId
    };
  }
  
  /**
   * Create NPC actor in Foundry for an army
   * Places actor in "Kingdom Armies" folder
   * 
   * @param name - Actor name
   * @param level - Actor level
   * @param customData - Optional custom actor data
   * @returns Actor ID
   * @throws Error if Foundry not ready or creation fails
   */
  async createNPCActor(name: string, level: number, customData?: any): Promise<string> {
    console.log(`🎭 [ArmyService] Creating NPC actor: ${name} (Level ${level})`);
    
    const game = (globalThis as any).game;
    
    // Fail fast if Foundry not ready
    if (!game?.actors || !game?.folders) {
      throw new Error('Foundry VTT not initialized - cannot create actors');
    }
    
    // Find "Kingdom Armies" folder (should be created by initialization hook)
    const folderName = "Kingdom Armies";
    let folder = game.folders.find((f: any) => 
      f.type === "Actor" && f.name === folderName
    );
    
    if (!folder) {
      // Fallback: Create folder if it doesn't exist (shouldn't happen if hooks ran properly)
      console.warn(`📁 [ArmyService] "${folderName}" folder not found, creating as fallback...`);
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
      
      console.log(`✅ [ArmyService] Created "${folderName}" folder with OWNER permissions`);
    }
    
    // Default NPC actor data
    const npcData = customData || {
      name: name,
      type: 'npc',
      folder: folder.id, // Place in folder
      // Set ownership so all players can see/edit the army actor
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
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
    
    console.log(`✅ [ArmyService] NPC actor created in folder: ${npcActor.id}`);
    return npcActor.id;
  }
  
  /**
   * Sync army data to its NPC actor
   * Updates name and level
   * 
   * @param armyId - Army ID to sync
   * @throws Error if army has no actor or actor not found
   */
  async syncArmyToActor(armyId: string): Promise<void> {
    console.log(`🔄 [ArmyService] Syncing army to actor: ${armyId}`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
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
    
    console.log(`✅ [ArmyService] Synced ${army.name} to NPC actor`);
  }
  
  /**
   * Sync NPC actor data back to army
   * Useful if actor is edited directly
   * 
   * @param actorId - NPC actor ID
   */
  async syncActorToArmy(actorId: string): Promise<void> {
    console.log(`🔄 [ArmyService] Syncing actor to army: ${actorId}`);
    
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
        console.log(`✅ [ArmyService] Synced NPC actor to ${army.name}`);
      } else {
        console.warn(`⚠️ [ArmyService] No army found for actor: ${actorId}`);
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
    console.log(`📈 [ArmyService] Updating army level: ${armyId} → ${newLevel}`);
    
    await updateKingdom(kingdom => {
      const army = kingdom.armies?.find(a => a.id === armyId);
      if (army) {
        army.level = newLevel;
      }
    });
    
    // Sync to actor
    await this.syncArmyToActor(armyId);
    
    console.log(`✅ [ArmyService] Army level updated to ${newLevel}`);
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
    console.log(`🏘️ [ArmyService] Assigning army ${armyId} to settlement ${settlementId || 'none'}...`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
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
        
        console.log(`✅ [ArmyService] Army ${armyId} assigned to ${newSettlement.name}`);
      } else {
        // Manually unassigned
        army.supportedBySettlementId = undefined;
        army.isSupported = false;
        // turnsUnsupported increments during Upkeep phase
        
        console.log(`✅ [ArmyService] Army ${armyId} unassigned (unsupported)`);
      }
    });
  }
  
  /**
   * Find a random settlement with available army support capacity
   * Used for auto-assignment when creating new armies
   * 
   * @returns Settlement with capacity, or null if none available
   */
  findRandomSettlementWithCapacity(): Settlement | null {
    const actor = getKingdomActor();
    if (!actor) return null;
    
    const kingdom = actor.getKingdom();
    if (!kingdom) return null;
    
    // Find all settlements with available capacity
    const available = kingdom.settlements.filter(s => {
      const capacity = SettlementTierConfig[s.tier].armySupport;
      const current = s.supportedUnits.length;
      return current < capacity;
    });
    
    if (available.length === 0) {
      console.log('⚠️ [ArmyService] No settlements with available army capacity');
      return null;
    }
    
    // Pick random
    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];
    
    console.log(`🎲 [ArmyService] Randomly selected ${selected.name} for army support`);
    return selected;
  }
  
  /**
   * Calculate total army support capacity from settlements
   * 
   * @param settlements - All settlements
   * @returns Total support capacity
   */
  calculateTotalArmySupport(settlements: Settlement[]): number {
    // This calculation is actually in SettlementService
    // We just provide a convenience wrapper
    const { settlementService } = require('../settlements');
    return settlementService.calculateTotalArmySupport(settlements);
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
    console.log(`🔧 [ArmyService] Processing army support (capacity: ${availableSupport})...`);
    
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
    
    console.log(`✅ [ArmyService] Support processed: ${supported.size} supported, ${unsupported.size} unsupported`);
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
    console.log(`🔍 [ArmyService] STUB: Get armies for settlement ${settlementId}`);
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
    const { settlementService } = require('../settlements');
    const supportCapacity = settlementService.calculateTotalArmySupport(kingdom.settlements);
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
