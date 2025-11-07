/**
 * GameCommandsResolver - Handles non-resource game effects from actions
 * 
 * Responsibilities:
 * - Execute game effects (claim hexes, recruit armies, found settlements, etc.)
 * - Validate prerequisites and requirements
 * - Provide clear feedback on success/failure
 * - Route all changes through updateKingdom() → KingdomActor
 * 
 * Architecture:
 * - Service = Complex operations & utilities
 * - Single write path through updateKingdom() → KingdomActor
 * - Used by ActionResolver and ActionPhaseController
 */

import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import type { Army } from './buildQueue/BuildProject';
import { logger } from '../utils/Logger';

/**
 * Result of game effect resolution
 */
export interface ResolveResult {
  success: boolean;
  error?: string;
  data?: any; // Action-specific return data
}

/**
 * Create the game effects resolver service
 */
export async function createGameCommandsResolver() {
  return {
    /**
     * Recruit Army - Create a new army unit at specified level with NPC actor
     * Uses pending data from globalThis.__pendingRecruitArmy (set by dialog)
     * 
     * @param level - Army level (typically party level)
     * @param name - Optional custom name for the army (deprecated, use pending data)
     * @returns ResolveResult with created army data
     */
    async recruitArmy(level: number, name?: string): Promise<ResolveResult> {

      try {
        const actor = getKingdomActor();
        if (!actor) {
          return {
            success: false,
            error: 'No kingdom actor available'
          };
        }

        // Validate level (must be positive)
        if (level < 1) {
          return {
            success: false,
            error: 'Army level must be at least 1'
          };
        }

        // Get pending recruit data from dialog
        const pendingData = (globalThis as any).__pendingRecruitArmy;
        if (!pendingData) {
          return {
            success: false,
            error: 'No army recruitment data available'
          };
        }

        const { name: armyName, settlementId, armyType } = pendingData;

        // Import army helpers for type and image
        const { ARMY_TYPES } = await import('../utils/armyHelpers');
        
        // Validate army type
        if (!ARMY_TYPES[armyType as keyof typeof ARMY_TYPES]) {
          return {
            success: false,
            error: `Invalid army type: ${armyType}`
          };
        }

        // Pass settlement info to army service so token can be placed during creation (on GM's client)
        const { armyService } = await import('./army');
        await armyService.createArmy(armyName, level, {
          type: armyType,
          image: ARMY_TYPES[armyType as keyof typeof ARMY_TYPES].image,
          settlementId: settlementId  // Pass settlementId so GM can place token
        });

        // Clean up pending data
        delete (globalThis as any).__pendingRecruitArmy;

        const settlementMessage = settlementId 
          ? ' (supported by settlement)' 
          : ' (unsupported)';

        return {
          success: true,
          data: {
            message: `Recruited ${armyName} at level ${level}${settlementMessage}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to recruit army:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Disband Army - Remove an army unit and refund resources
     * Delegates to ArmyService for implementation
     * 
     * @param armyId - ID of army to disband
     * @param deleteActor - Whether to delete the linked NPC actor (default: true)
     * @returns ResolveResult with refund data
     */
    async disbandArmy(armyId: string, deleteActor: boolean = true): Promise<ResolveResult> {

      try {
        // Delegate to ArmyService with deleteActor parameter
        const { armyService } = await import('./army');
        const result = await armyService.disbandArmy(armyId, deleteActor);

        const actorMessage = result.actorId 
          ? (deleteActor ? ' (NPC actor deleted)' : ' (NPC actor unlinked)')
          : '';

        return {
          success: true,
          data: {
            armyName: result.armyName,
            refund: result.refund,
            message: `Disbanded ${result.armyName}${actorMessage}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to disband army:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Found Settlement - Create a new village (Level 1)
     * 
     * @param name - Settlement name
     * @param location - Hex coordinates {x, y}
     * @param grantFreeStructure - Whether to grant a free structure slot (critical success)
     * @returns ResolveResult with created settlement data
     */
    async foundSettlement(
      name: string,
      location: { x: number; y: number } = { x: 0, y: 0 },
      grantFreeStructure: boolean = false
    ): Promise<ResolveResult> {

      try {
        const actor = getKingdomActor();
        if (!actor) {
          return {
            success: false,
            error: 'No kingdom actor available'
          };
        }

        // Validate name
        if (!name || name.trim().length === 0) {
          return {
            success: false,
            error: 'Settlement name is required'
          };
        }

        // Import createSettlement helper
        const { createSettlement, SettlementTier } = await import('../models/Settlement');

        // Create new settlement using the helper (Village = Level 1)
        const newSettlement = createSettlement(name.trim(), location, SettlementTier.VILLAGE);

        // Add to kingdom settlements
        await updateKingdom(kingdom => {
          if (!kingdom.settlements) {
            kingdom.settlements = [];
          }
          kingdom.settlements.push(newSettlement);
        });

        const message = grantFreeStructure
          ? `Founded ${name} (Village, Level 1) with 1 free structure slot!`
          : `Founded ${name} (Village, Level 1)`;

        return {
          success: true,
          data: {
            settlement: newSettlement,
            message,
            grantFreeStructure // Pass this flag so UI can handle it
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to found settlement:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Give Actor Gold - Add personal stipend to player character inventory
     * 
     * @param multiplier - Income multiplier (2 = double, 1 = normal, 0.5 = half)
     * @param settlementId - Settlement to calculate income from
     * @returns ResolveResult with gold amount given
     */
    async giveActorGold(multiplier: number, settlementId: string): Promise<ResolveResult> {
      logger.info(`💰 [giveActorGold] Starting with multiplier ${multiplier} for settlement ${settlementId}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Find the settlement
        const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
        if (!settlement) {
          return { success: false, error: `Settlement ${settlementId} not found` };
        }

        // Get current player's character
        const game = (globalThis as any).game;
        const currentUser = game?.user;
        if (!currentUser) {
          return { success: false, error: 'No current user found' };
        }

        const character = currentUser.character;
        if (!character) {
          return { success: false, error: 'No character assigned to current user' };
        }

        // Get kingdom taxation tier
        const taxationInfo = this.getKingdomTaxationTier(kingdom);
        if (!taxationInfo) {
          return { success: false, error: 'No taxation structures found in kingdom' };
        }

        // Calculate base income from table
        const baseIncome = this.calculateIncome(settlement.level, taxationInfo.tier);
        if (baseIncome === 0) {
          return { 
            success: false, 
            error: `${settlement.name} (Level ${settlement.level}) is not eligible for stipends with T${taxationInfo.tier} taxation` 
          };
        }

        // Apply multiplier and round to nearest gold
        const goldAmount = Math.round(baseIncome * multiplier);

        // Add gold to character inventory
        if (goldAmount > 0) {
          await character.inventory.addCoins({ gp: goldAmount });
        }

        logger.info(`✅ [giveActorGold] Gave ${goldAmount} gp to ${character.name}`);

        return {
          success: true,
          data: {
            goldAmount,
            settlementName: settlement.name,
            characterName: character.name,
            message: `${character.name} collected ${goldAmount} gp from ${settlement.name}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to give actor gold:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Helper: Get kingdom's highest taxation tier
     */
    getKingdomTaxationTier(kingdom: any): { tier: 2 | 3 | 4; name: string } | null {
      const REVENUE_STRUCTURES = {
        'counting-house': { tier: 2, name: 'Counting House' },
        'treasury': { tier: 3, name: 'Treasury' },
        'exchequer': { tier: 4, name: 'Exchequer' }
      };

      if (!kingdom?.settlements) return null;

      let highestTier: 2 | 3 | 4 = 2;
      let highestStructureName = '';

      for (const settlement of kingdom.settlements) {
        for (const structureId of (settlement.structureIds || [])) {
          const revenueInfo = REVENUE_STRUCTURES[structureId as keyof typeof REVENUE_STRUCTURES];
          if (revenueInfo && revenueInfo.tier >= highestTier) {
            highestTier = revenueInfo.tier as 2 | 3 | 4;
            highestStructureName = revenueInfo.name;
          }
        }
      }

      return highestStructureName ? { tier: highestTier, name: highestStructureName } : null;
    },

    /**
     * Helper: Calculate income from settlement level and taxation tier
     */
    calculateIncome(level: number, tier: 2 | 3 | 4): number {
      const INCOME_TABLE: { [level: number]: { t2?: number; t3?: number; t4?: number } } = {
        1: {},
        2: { t2: 3 },
        3: { t2: 5 },
        4: { t2: 7 },
        5: { t2: 9, t3: 18 },
        6: { t2: 15, t3: 30 },
        7: { t2: 20, t3: 40 },
        8: { t2: 25, t3: 50, t4: 100 },
        9: { t2: 30, t3: 60, t4: 120 },
        10: { t2: 40, t3: 80, t4: 160 },
        11: { t2: 50, t3: 100, t4: 200 },
        12: { t2: 60, t3: 120, t4: 240 },
        13: { t2: 70, t3: 140, t4: 280 },
        14: { t2: 80, t3: 160, t4: 320 },
        15: { t2: 100, t3: 200, t4: 400 },
        16: { t2: 130, t3: 260, t4: 520 },
        17: { t2: 150, t3: 300, t4: 600 },
        18: { t2: 200, t3: 400, t4: 800 },
        19: { t2: 300, t3: 600, t4: 1200 },
        20: { t2: 400, t3: 800, t4: 1600 },
      };

      const incomeRow = INCOME_TABLE[level];
      if (!incomeRow) return 0;

      const tierKey = `t${tier}` as 't2' | 't3' | 't4';
      return incomeRow[tierKey] || 0;
    },

    /**
     * Reduce Imprisoned - Remove imprisoned unrest from a settlement
     * Used by Execute or Pardon Prisoners action
     * 
     * @param settlementId - Settlement ID containing prisoners
     * @param amount - Amount to reduce ('all', dice formula like '1d4', or numeric value)
     * @returns ResolveResult with amount reduced
     */
    async reduceImprisoned(settlementId: string, amount: string | number): Promise<ResolveResult> {
      logger.info(`⚖️ [reduceImprisoned] Reducing imprisoned unrest in settlement ${settlementId} by ${amount}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Find the settlement
        const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
        if (!settlement) {
          return { success: false, error: `Settlement ${settlementId} not found` };
        }

        const currentImprisoned = settlement.imprisonedUnrest || 0;
        if (currentImprisoned === 0) {
          return { success: false, error: `${settlement.name} has no imprisoned unrest` };
        }

        let amountToReduce = 0;

        // Handle different amount types
        if (amount === 'all') {
          amountToReduce = currentImprisoned;
        } else if (typeof amount === 'number') {
          // Already rolled - use the value directly
          amountToReduce = Math.min(amount, currentImprisoned);
        } else if (amount.includes('d')) {
          // Dice formula (e.g., '1d4') - should not happen with new system, but kept for compatibility
          const roll = new Roll(amount);
          await roll.evaluate();
          amountToReduce = Math.min(roll.total || 0, currentImprisoned);
          
          // Show dice roll in chat
          await roll.toMessage({
            flavor: `Imprisoned Unrest Reduced in ${settlement.name}`,
            speaker: { alias: 'Kingdom' }
          });
        } else {
          // Numeric string
          amountToReduce = Math.min(parseInt(amount, 10), currentImprisoned);
        }

        // Update settlement imprisoned unrest
        await updateKingdom(kingdom => {
          const settlement = kingdom.settlements?.find(s => s.id === settlementId);
          if (settlement) {
            settlement.imprisonedUnrest = Math.max(0, (settlement.imprisonedUnrest || 0) - amountToReduce);
          }
        });

        logger.info(`✅ [reduceImprisoned] Reduced ${amountToReduce} imprisoned unrest in ${settlement.name}`);

        return {
          success: true,
          data: {
            settlementName: settlement.name,
            amountReduced: amountToReduce,
            remainingImprisoned: Math.max(0, currentImprisoned - amountToReduce),
            message: `Reduced ${amountToReduce} imprisoned unrest in ${settlement.name}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to reduce imprisoned unrest:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Train Army - Improve army level to party level and apply training effects
     * 
     * @param armyId - ID of army to train
     * @param outcome - Action outcome (criticalSuccess, success, failure, criticalFailure)
     * @returns ResolveResult with training details
     */
    async trainArmy(armyId: string, outcome: string): Promise<ResolveResult> {
      logger.info(`🎖️ [trainArmy] Training army ${armyId} with outcome ${outcome}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Find the army
        const army = kingdom.armies?.find((a: Army) => a.id === armyId);
        if (!army) {
          return { success: false, error: `Army ${armyId} not found` };
        }

        // Get party level from kingdom data (synced by partyLevelHooks)
        const partyLevel = kingdom.partyLevel || 1;
        
        // Check if army is already at party level
        if (army.level >= partyLevel && outcome !== 'failure') {
          return { 
            success: false, 
            error: `${army.name} is already at party level (${partyLevel})` 
          };
        }

        // Failure: No change
        if (outcome === 'failure') {
          return {
            success: true,
            data: {
              armyName: army.name,
              message: `Training had no effect on ${army.name}`
            }
          };
        }

        // Update army level to party level
        const { armyService } = await import('./army');
        await armyService.updateArmyLevel(armyId, partyLevel);

        // Apply outcome-specific effects
        if (outcome === 'criticalSuccess') {
          // Add Heroism effect to actor
          if (army.actorId) {
            try {
              const heroism = await fromUuid('Compendium.pf2e.spell-effects.Item.l9HRQggofFGIxEse');
              if (heroism) {
                await armyService.addItemToArmy(army.actorId, heroism.toObject());
                logger.info(`✨ [trainArmy] Added Heroism to ${army.name}`);
              }
            } catch (error) {
              logger.warn(`⚠️ [trainArmy] Failed to add Heroism effect:`, error);
            }
          }
          
          return {
            success: true,
            data: {
              armyName: army.name,
              oldLevel: army.level,
              newLevel: partyLevel,
              message: `${army.name} trained to level ${partyLevel} and gained Heroism for their next combat!`
            }
          };
        } else if (outcome === 'criticalFailure') {
          // Add Frightened condition (10-minute duration) to actor
          if (army.actorId) {
            try {
              const frightened = await fromUuid('Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL');
              if (frightened) {
                // Clone and modify duration
                const modifiedFrightened = frightened.clone({
                  'system.duration': { value: 10, unit: 'minutes', sustained: false, expiry: 'turn-end' }
                });
                await armyService.addItemToArmy(army.actorId, modifiedFrightened.toObject());
                logger.info(`😰 [trainArmy] Added Frightened to ${army.name}`);
              }
            } catch (error) {
              logger.warn(`⚠️ [trainArmy] Failed to add Frightened condition:`, error);
            }
          }
          
          return {
            success: true,
            data: {
              armyName: army.name,
              oldLevel: army.level,
              newLevel: partyLevel,
              message: `${army.name} trained to level ${partyLevel} but is Frightened for their next combat (10 minutes)`
            }
          };
        } else {
          // Success: Just level up, no additional effects
          return {
            success: true,
            data: {
              armyName: army.name,
              oldLevel: army.level,
              newLevel: partyLevel,
              message: `${army.name} successfully trained to level ${partyLevel}`
            }
          };
        }

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to train army:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Helper: Get party level from game actors
     */
    getPartyLevel(): number {
      const game = (globalThis as any).game;
      if (game?.actors) {
        const partyActors = Array.from(game.actors).filter((a: any) => 
          a.type === 'character' && a.hasPlayerOwner
        );
        if (partyActors.length > 0) {
          return (partyActors[0] as any).level || 1;
        }
      }
      return 1;
    },

    /**
     * Outfit Army - Equip army with gear upgrades
     * Applies PF2e effects (armor, runes, weapons, equipment) to army actor
     * Each army can receive each equipment type only once
     * 
     * @param armyId - ID of army to outfit
     * @param equipmentType - Type of equipment (armor, runes, weapons, equipment)
     * @param outcome - Action outcome (success, criticalSuccess, failure, criticalFailure)
     * @returns ResolveResult with equipment details
     */
    async outfitArmy(armyId: string, equipmentType: string, outcome: string): Promise<ResolveResult> {
      logger.info(`⚔️ [outfitArmy] Outfitting army ${armyId} with ${equipmentType} (outcome: ${outcome})`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Find the army
        const army = kingdom.armies?.find((a: Army) => a.id === armyId);
        if (!army) {
          return { success: false, error: `Army ${armyId} not found` };
        }

        if (!army.actorId) {
          return { success: false, error: `${army.name} has no linked NPC actor` };
        }

        // Validate equipment type
        const validTypes = ['armor', 'runes', 'weapons', 'equipment'];
        if (!validTypes.includes(equipmentType)) {
          return { success: false, error: `Invalid equipment type: ${equipmentType}` };
        }

        // Check if army already has this equipment
        if (army.equipment?.[equipmentType as keyof typeof army.equipment]) {
          return { 
            success: false, 
            error: `${army.name} already has ${equipmentType} upgrade` 
          };
        }

        // Failure outcomes: No effect (costs already handled by JSON)
        if (outcome === 'failure' || outcome === 'criticalFailure') {
          return {
            success: true,
            data: {
              armyName: army.name,
              message: outcome === 'failure' 
                ? `Failed to outfit ${army.name}`
                : `Botched acquisition for ${army.name}, suppliers took the gold`
            }
          };
        }

        // Success/Critical Success: Apply equipment upgrade
        const bonus = outcome === 'criticalSuccess' ? 2 : 1;
        
        // Create PF2e effect with Rule Elements
        const effectData = this.createEquipmentEffect(equipmentType, bonus);
        
        // Add effect to army actor
        const { armyService } = await import('./army');
        await armyService.addItemToArmy(army.actorId, effectData);
        
        // Mark equipment as applied
        await updateKingdom(k => {
          const a = k.armies.find((army: Army) => army.id === armyId);
          if (a) {
            if (!a.equipment) a.equipment = {};
            a.equipment[equipmentType as keyof typeof a.equipment] = true;
          }
        });

        const bonusText = bonus === 2 ? ' (exceptional, +2)' : '';
        const effectName = this.getEquipmentDisplayName(equipmentType);
        
        logger.info(`✅ [outfitArmy] Applied ${equipmentType} (+${bonus}) to ${army.name}`);

        return {
          success: true,
          data: {
            armyName: army.name,
            equipmentType,
            bonus,
            message: `${army.name} outfitted with ${effectName}${bonusText}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to outfit army:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Helper: Create PF2e effect data for equipment upgrade
     */
    createEquipmentEffect(equipmentType: string, bonus: number): any {
      const baseEffect = {
        type: 'effect',
        system: {
          slug: `army-equipment-${equipmentType}`,
          rules: [] as any[]
        }
      };

      switch (equipmentType) {
        case 'armor':
          return {
            ...baseEffect,
            name: `Army Equipment: Armor (+${bonus} AC)`,
            system: {
              ...baseEffect.system,
              rules: [{
                key: 'FlatModifier',
                selector: 'ac',
                value: bonus,
                type: 'item'
              }]
            }
          };

        case 'runes':
          return {
            ...baseEffect,
            name: `Army Equipment: Runes (+${bonus} to hit)`,
            system: {
              ...baseEffect.system,
              rules: [{
                key: 'FlatModifier',
                selector: 'strike-attack-roll',
                value: bonus,
                type: 'item'
              }]
            }
          };

        case 'weapons':
          return {
            ...baseEffect,
            name: `Army Equipment: Weapons (+${bonus} damage dice)`,
            system: {
              ...baseEffect.system,
              rules: [{
                key: 'DamageDice',
                selector: 'strike-damage',
                diceNumber: bonus
              }]
            }
          };

        case 'equipment':
          return {
            ...baseEffect,
            name: `Army Equipment: Enhanced Gear (+${bonus} saves)`,
            system: {
              ...baseEffect.system,
              rules: [{
                key: 'FlatModifier',
                selector: 'saving-throw',
                value: bonus,
                type: 'item'
              }]
            }
          };

        default:
          throw new Error(`Unknown equipment type: ${equipmentType}`);
      }
    },

    /**
     * Helper: Get display name for equipment type
     */
    getEquipmentDisplayName(equipmentType: string): string {
      switch (equipmentType) {
        case 'armor': return 'Armor';
        case 'runes': return 'Runes';
        case 'weapons': return 'Weapons';
        case 'equipment': return 'Enhanced Gear';
        default: return equipmentType;
      }
    },

    /**
     * Deploy Army - Move army along path with animation and apply outcome conditions
     * 
     * @param armyId - ID of army to deploy
     * @param path - Array of hex IDs representing the movement path
     * @param outcome - Action outcome (criticalSuccess, success, failure, criticalFailure)
     * @param conditionsToApply - Array of condition strings to apply to army actor
     * @returns ResolveResult with deployment details
     */
    async deployArmy(
      armyId: string, 
      path: string[], 
      outcome: string, 
      conditionsToApply: string[]
    ): Promise<ResolveResult> {
      logger.info(`🚀 [deployArmy] Deploying army ${armyId} with outcome ${outcome}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Find the army
        const army = kingdom.armies?.find((a: Army) => a.id === armyId);
        if (!army) {
          return { success: false, error: `Army ${armyId} not found` };
        }

        if (!army.actorId) {
          return { success: false, error: `${army.name} has no linked NPC actor` };
        }

        // Validate path
        if (!path || path.length < 2) {
          return { success: false, error: 'Invalid path - must have at least 2 hexes' };
        }

        let finalPath = path;
        let randomHexMessage = '';

        // Critical failure: Calculate random nearby hex (1-2 hexes from DESTINATION)
        if (outcome === 'criticalFailure') {
          const originHex = path[0];
          const destinationHex = path[path.length - 1];
          const randomHex = this.calculateRandomNearbyHex(destinationHex, 2); // 1-2 hexes from destination
          
          // Build path to random hex instead of intended destination
          finalPath = [...path.slice(0, -1), randomHex];
          randomHexMessage = ` (got lost, arrived at ${randomHex} instead of ${destinationHex})`;
          logger.info(`❌ [deployArmy] Critical failure - redirecting to random hex ${randomHex} near destination ${destinationHex}`);
        }

        // Animate token along path
        try {
          const { getArmyToken, animateTokenAlongPath } = await import('./army/tokenAnimation');
          const tokenDoc = await getArmyToken(armyId);
          
          if (tokenDoc) {
            logger.info(`🎬 [deployArmy] Animating ${army.name} along ${finalPath.length} hexes`);
            await animateTokenAlongPath(tokenDoc, finalPath, 100);
          } else {
            logger.warn(`⚠️ [deployArmy] No token found for ${army.name} - skipping animation`);
          }
        } catch (error) {
          logger.error('❌ [deployArmy] Animation failed:', error);
          // Continue even if animation fails
        }

        // Apply conditions to army actor
        if (conditionsToApply && conditionsToApply.length > 0) {
          try {
            const game = (globalThis as any).game;
            const armyActor = game.actors.get(army.actorId);
            
            if (armyActor) {
              for (const conditionString of conditionsToApply) {
                await this.applyConditionToActor(armyActor, conditionString);
              }
              logger.info(`✅ [deployArmy] Applied ${conditionsToApply.length} conditions to ${army.name}`);
            } else {
              logger.warn(`⚠️ [deployArmy] Could not find actor for ${army.name}`);
            }
          } catch (error) {
            logger.error('❌ [deployArmy] Failed to apply conditions:', error);
            // Continue even if conditions fail
          }
        }

        const finalHex = finalPath[finalPath.length - 1];
        const movementCost = finalPath.length - 1;

        // Mark army as deployed this turn
        await updateKingdom(k => {
          // Ensure turnState exists
          if (!k.turnState) {
            const { createDefaultTurnState } = require('../models/TurnState');
            k.turnState = createDefaultTurnState(k.currentTurn);
          }
          
          // Ensure actionsPhase exists
          if (!k.turnState!.actionsPhase) {
            k.turnState!.actionsPhase = {
              completed: false,
              activeAids: [],
              deployedArmyIds: []
            };
          }
          
          // Ensure deployedArmyIds array exists
          if (!k.turnState!.actionsPhase.deployedArmyIds) {
            k.turnState!.actionsPhase.deployedArmyIds = [];
          }
          
          // Add army to deployed list if not already there
          if (!k.turnState!.actionsPhase.deployedArmyIds.includes(armyId)) {
            k.turnState!.actionsPhase.deployedArmyIds.push(armyId);
          }
        });

        logger.info(`✅ [deployArmy] Marked ${army.name} as deployed this turn`);

        return {
          success: true,
          data: {
            armyName: army.name,
            finalHex,
            movementCost,
            conditionsApplied: conditionsToApply.length,
            message: `${army.name} deployed to ${finalHex} (${movementCost} movement)${randomHexMessage}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to deploy army:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Helper: Calculate random nearby hex for critical failure
     * Uses 1d6 for direction (6 hex directions) and 1dN for distance
     * @param hexId - Starting hex ID
     * @param maxDistance - Maximum distance (default 3)
     */
    calculateRandomNearbyHex(hexId: string, maxDistance: number = 3): string {
      // Parse hex
      const [i, j] = hexId.split('.').map(Number);
      
      // Roll 1d6 for direction (0-5)
      const direction = Math.floor(Math.random() * 6);
      
      // Roll for distance (1 to maxDistance)
      const distance = Math.floor(Math.random() * maxDistance) + 1;
      
      // Hex neighbor offsets (flat-top hexagons)
      // Even rows (j % 2 === 0): NE, E, SE, SW, W, NW
      // Odd rows (j % 2 === 1): NE, E, SE, SW, W, NW (different offsets)
      const evenRowOffsets = [
        { di: 0, dj: -1 },  // NE
        { di: 1, dj: 0 },   // E
        { di: 0, dj: 1 },   // SE
        { di: -1, dj: 1 },  // SW
        { di: -1, dj: 0 },  // W
        { di: -1, dj: -1 }  // NW
      ];
      
      const oddRowOffsets = [
        { di: 1, dj: -1 },  // NE
        { di: 1, dj: 0 },   // E
        { di: 1, dj: 1 },   // SE
        { di: 0, dj: 1 },   // SW
        { di: -1, dj: 0 },  // W
        { di: 0, dj: -1 }   // NW
      ];
      
      // Apply direction offset multiple times for distance
      let currentI = i;
      let currentJ = j;
      
      for (let step = 0; step < distance; step++) {
        const offsets = currentJ % 2 === 0 ? evenRowOffsets : oddRowOffsets;
        const offset = offsets[direction];
        currentI += offset.di;
        currentJ += offset.dj;
      }
      
      return `${currentI}.${currentJ}`;
    },

    /**
     * Helper: Apply condition string to army actor
     * Parses condition strings like "+1 initiative (status bonus)", "fatigued", "enfeebled 1"
     */
    async applyConditionToActor(actor: any, conditionString: string): Promise<void> {
      logger.info(`🎭 [applyConditionToActor] Applying "${conditionString}" to ${actor.name}`);
      
      // Parse condition string
      const lowerCondition = conditionString.toLowerCase().trim();
      
      // Handle initiative modifiers
      if (lowerCondition.includes('initiative')) {
        const isPositive = lowerCondition.includes('+');
        const match = lowerCondition.match(/([+-]?\d+)/);
        const bonus = match ? parseInt(match[1], 10) : (isPositive ? 1 : -1);
        
        // Create initiative modifier effect
        await actor.createEmbeddedDocuments('Item', [{
          type: 'effect',
          name: `Army Deployment: Initiative ${bonus > 0 ? '+' : ''}${bonus}`,
          system: {
            slug: 'army-deployment-initiative',
            rules: [{
              key: 'FlatModifier',
              selector: 'initiative',
              value: bonus,
              type: 'status'
            }],
            duration: { value: -1, unit: 'unlimited', expiry: 'turn-end' }
          }
        }]);
        
        logger.info(`✅ Applied initiative ${bonus > 0 ? '+' : ''}${bonus} to ${actor.name}`);
        return;
      }
      
      // Handle saving throw modifiers
      if (lowerCondition.includes('saving throw') || lowerCondition.includes('saves')) {
        const isPositive = lowerCondition.includes('+');
        const match = lowerCondition.match(/([+-]?\d+)/);
        const bonus = match ? parseInt(match[1], 10) : (isPositive ? 1 : -1);
        
        await actor.createEmbeddedDocuments('Item', [{
          type: 'effect',
          name: `Army Deployment: Saves ${bonus > 0 ? '+' : ''}${bonus}`,
          system: {
            slug: 'army-deployment-saves',
            rules: [{
              key: 'FlatModifier',
              selector: 'saving-throw',
              value: bonus,
              type: 'status'
            }],
            duration: { value: -1, unit: 'unlimited', expiry: 'turn-end' }
          }
        }]);
        
        logger.info(`✅ Applied saves ${bonus > 0 ? '+' : ''}${bonus} to ${actor.name}`);
        return;
      }
      
      // Handle attack modifiers
      if (lowerCondition.includes('attack')) {
        const isPositive = lowerCondition.includes('+');
        const match = lowerCondition.match(/([+-]?\d+)/);
        const bonus = match ? parseInt(match[1], 10) : (isPositive ? 1 : -1);
        
        await actor.createEmbeddedDocuments('Item', [{
          type: 'effect',
          name: `Army Deployment: Attack ${bonus > 0 ? '+' : ''}${bonus}`,
          system: {
            slug: 'army-deployment-attack',
            rules: [{
              key: 'FlatModifier',
              selector: 'strike-attack-roll',
              value: bonus,
              type: 'status'
            }],
            duration: { value: -1, unit: 'unlimited', expiry: 'turn-end' }
          }
        }]);
        
        logger.info(`✅ Applied attack ${bonus > 0 ? '+' : ''}${bonus} to ${actor.name}`);
        return;
      }
      
      // Handle PF2e conditions (fatigued, enfeebled, etc.)
      if (lowerCondition.includes('fatigued')) {
        const condition = await fromUuid('Compendium.pf2e.conditionitems.Item.HL2l2VRSaQHu9lUw');
        if (condition) {
          await actor.createEmbeddedDocuments('Item', [condition.toObject()]);
          logger.info(`✅ Applied Fatigued condition to ${actor.name}`);
        }
        return;
      }
      
      if (lowerCondition.includes('enfeebled')) {
        const match = lowerCondition.match(/enfeebled\s+(\d+)/);
        const value = match ? parseInt(match[1], 10) : 1;
        
        const condition = await fromUuid('Compendium.pf2e.conditionitems.Item.MIRkyAjyBeXivMa7');
        if (condition) {
          const conditionData = condition.toObject();
          if (conditionData.system && typeof conditionData.system === 'object') {
            (conditionData.system as any).value = { value };
          }
          await actor.createEmbeddedDocuments('Item', [conditionData]);
          logger.info(`✅ Applied Enfeebled ${value} condition to ${actor.name}`);
        }
        return;
      }
      
      logger.warn(`⚠️ Unknown condition format: "${conditionString}"`);
    },

    /**
     * Release Imprisoned Unrest - Convert imprisoned unrest back to regular unrest
     * Used by incidents like prison breaks
     * 
     * @param percentage - Percentage to release (0.5 = half, 1 or 'all' = all)
     * @returns ResolveResult with release details
     */
    async releaseImprisoned(percentage: number | 'all'): Promise<ResolveResult> {
      logger.info(`🔓 [releaseImprisoned] Releasing ${percentage === 'all' ? 'all' : percentage * 100 + '%'} imprisoned unrest`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Calculate total imprisoned unrest across all settlements
        let totalImprisoned = 0;
        for (const settlement of kingdom.settlements || []) {
          totalImprisoned += settlement.imprisonedUnrest || 0;
        }

        if (totalImprisoned === 0) {
          return { 
            success: true, 
            data: { 
              message: 'No imprisoned unrest to release',
              released: 0
            } 
          };
        }

        // Calculate amount to release
        const releasePercentage = percentage === 'all' ? 1 : percentage;
        const amountToRelease = Math.floor(totalImprisoned * releasePercentage);

        if (amountToRelease === 0) {
          return { 
            success: true, 
            data: { 
              message: 'No imprisoned unrest to release (rounded down to 0)',
              released: 0
            } 
          };
        }

        // Release imprisoned unrest from settlements and convert to regular unrest
        await updateKingdom(k => {
          let remaining = amountToRelease;
          
          // Release from each settlement proportionally
          for (const settlement of k.settlements || []) {
            if (remaining <= 0) break;
            
            const currentImprisoned = settlement.imprisonedUnrest || 0;
            if (currentImprisoned === 0) continue;
            
            const toRelease = Math.min(remaining, Math.ceil(currentImprisoned * releasePercentage));
            settlement.imprisonedUnrest = Math.max(0, currentImprisoned - toRelease);
            remaining -= toRelease;
            
            logger.info(`  🔓 Released ${toRelease} imprisoned unrest from ${settlement.name}`);
          }
          
          // Add released unrest to kingdom unrest
          k.unrest = (k.unrest || 0) + amountToRelease;
          logger.info(`  ⚠️ Added ${amountToRelease} to kingdom unrest (now ${k.unrest})`);
        });

        return {
          success: true,
          data: {
            released: amountToRelease,
            message: `Released ${amountToRelease} imprisoned unrest (${Math.round(releasePercentage * 100)}% of ${totalImprisoned})`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to release imprisoned unrest:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Destroy Structure - Remove or downgrade structure(s)
     * Used by incidents that cause severe structural damage
     * 
     * @param category - Structure category to target (e.g., 'justice')
     * @param targetTier - Which tier to target ('highest', 'lowest', or specific tier number)
     * @param count - Number of structures to destroy (default: 1)
     * @returns ResolveResult with destroyed structure details
     */
    async destroyStructure(
      category?: string,
      targetTier?: 'highest' | 'lowest' | number,
      count: number = 1
    ): Promise<ResolveResult> {
      logger.info(`💥 [destroyStructure] Destroying ${count} structure(s)${category ? ` in category ${category}` : ''}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        const { structuresService } = await import('./structures/index');
        const { StructureCondition } = await import('../models/Settlement');
        
        const destroyedStructures: Array<{ name: string; settlement: string; action: string }> = [];

        // Destroy 'count' structures
        for (let i = 0; i < count; i++) {
          // Find target structure based on criteria
          let targetStructure: any = null;
          let targetSettlement: any = null;

          // Search all settlements for matching structures
          for (const settlement of kingdom.settlements || []) {
            for (const structureId of settlement.structureIds || []) {
              const structure = structuresService.getStructure(structureId);
              if (!structure) continue;
              
              // Skip damaged structures
              if (settlement.structureConditions?.[structureId] === StructureCondition.DAMAGED) {
                continue;
              }
              
              // Apply category filter
              if (category && structure.category !== category) {
                continue;
              }
              
              // Apply tier filter
              if (targetTier !== undefined) {
                if (targetTier === 'highest') {
                  if (!targetStructure || structure.tier > targetStructure.tier) {
                    targetStructure = structure;
                    targetSettlement = settlement;
                  }
                } else if (targetTier === 'lowest') {
                  if (!targetStructure || structure.tier < targetStructure.tier) {
                    targetStructure = structure;
                    targetSettlement = settlement;
                  }
                } else if (typeof targetTier === 'number') {
                  if (structure.tier === targetTier) {
                    targetStructure = structure;
                    targetSettlement = settlement;
                    break;
                  }
                }
              } else {
                // No tier filter - take first match
                targetStructure = structure;
                targetSettlement = settlement;
                break;
              }
            }
            if (targetStructure && typeof targetTier === 'number') break;
          }

          if (!targetStructure || !targetSettlement) {
            logger.warn(`💥 [destroyStructure] No more structures available to destroy (destroyed ${i}/${count})`);
            break;
          }

          // Apply destruction based on tier
          let action = '';
          
          if (targetStructure.tier === 1) {
            // Tier 1: Remove entirely
            await updateKingdom(k => {
              const settlement = k.settlements.find(s => s.id === targetSettlement.id);
              if (settlement) {
                settlement.structureIds = settlement.structureIds.filter(id => id !== targetStructure.id);
                if (settlement.structureConditions) {
                  delete settlement.structureConditions[targetStructure.id];
                }
              }
            });
            
            action = 'removed entirely';
            logger.info(`  💥 Removed tier 1 structure: ${targetStructure.name} from ${targetSettlement.name}`);
            
          } else {
            // Tier 2+: Downgrade to previous tier (damaged)
            const previousTierId = targetStructure.upgradeFrom;
            if (!previousTierId) {
              logger.error(`  ❌ Cannot downgrade - no upgradeFrom found: ${targetStructure.id}`);
              continue;
            }

            const previousStructure = structuresService.getStructure(previousTierId);
            if (!previousStructure) {
              logger.error(`  ❌ Previous tier structure not found: ${previousTierId}`);
              continue;
            }

            await updateKingdom(k => {
              const settlement = k.settlements.find(s => s.id === targetSettlement.id);
              if (settlement) {
                // Remove current tier
                settlement.structureIds = settlement.structureIds.filter(id => id !== targetStructure.id);
                
                // Add previous tier (damaged)
                settlement.structureIds.push(previousTierId);
                
                if (!settlement.structureConditions) {
                  settlement.structureConditions = {};
                }
                settlement.structureConditions[previousTierId] = StructureCondition.DAMAGED;
                
                // Remove current tier from conditions
                delete settlement.structureConditions[targetStructure.id];
              }
            });
            
            action = `downgraded to ${previousStructure.name} (damaged)`;
            logger.info(`  💥 Downgraded: ${targetStructure.name} → ${previousStructure.name} (damaged) in ${targetSettlement.name}`);
          }

          destroyedStructures.push({
            name: targetStructure.name,
            settlement: targetSettlement.name,
            action
          });
        }

        if (destroyedStructures.length === 0) {
          return {
            success: false,
            error: `No structures available to destroy${category ? ` in category '${category}'` : ''}`
          };
        }

        // Format message
        const structureList = destroyedStructures
          .map((s: { name: string; settlement: string; action: string }) => `${s.name} in ${s.settlement} (${s.action})`)
          .join(', ');

        return {
          success: true,
          data: {
            destroyedStructures,
            count: destroyedStructures.length,
            message: `Destroyed structure${destroyedStructures.length > 1 ? 's' : ''}: ${structureList}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to destroy structure:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Damage Structure - Apply damage to structure(s) in settlement
     * Used by events/incidents that cause structural damage
     * 
     * @param targetStructure - Optional specific structure ID to damage
     * @param settlementId - Optional settlement filter
     * @param count - Number of structures to damage (default: 1)
     * @returns ResolveResult with damaged structure details
     */
    async damageStructure(
      targetStructure?: string,
      settlementId?: string,
      count: number = 1
    ): Promise<ResolveResult> {
      logger.info(`💥 [damageStructure] Damaging ${count} structure(s)${settlementId ? ` in settlement ${settlementId}` : ''}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Use structure targeting service to select structures
        const { structureTargetingService } = await import('./structures/targeting');
        const { structuresService } = await import('./structures/index');
        const { StructureCondition } = await import('../models/Settlement');
        
        const damagedStructures: Array<{ name: string; settlement: string; structureId: string; settlementId: string }> = [];

        // Damage 'count' structures using the targeting service
        for (let i = 0; i < count; i++) {
          const targetResult = structureTargetingService.selectStructureForDamage({
            type: 'random',
            fallbackToRandom: true
          });

          if (!targetResult) {
            logger.warn(`💥 [damageStructure] No more structures available to damage (damaged ${i}/${count})`);
            break;
          }

          // Apply damage by updating structure condition
          await updateKingdom(k => {
            const settlement = k.settlements.find((s: any) => s.id === targetResult.settlement.id);
            if (settlement) {
              if (!settlement.structureConditions) {
                settlement.structureConditions = {};
              }
              settlement.structureConditions[targetResult.structure.id] = StructureCondition.DAMAGED;
            }
          });

          damagedStructures.push({
            name: targetResult.structure.name,
            settlement: targetResult.settlement.name,
            structureId: targetResult.structure.id,
            settlementId: targetResult.settlement.id
          });

          logger.info(`💥 Damaged: ${targetResult.structure.name} in ${targetResult.settlement.name}`);
        }

        if (damagedStructures.length === 0) {
          return {
            success: false,
            error: 'No structures available to damage in the kingdom'
          };
        }

        // Format message for outcome display
        const structureList = damagedStructures
          .map((s: { name: string; settlement: string }) => `${s.name} in ${s.settlement}`)
          .join(', ');

        logger.info(`✅ [damageStructure] Damaged: ${structureList}`);

        return {
          success: true,
          data: {
            damagedStructures,
            count: damagedStructures.length,
            message: `Damaged structure${damagedStructures.length > 1 ? 's' : ''}: ${structureList}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to damage structure:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Remove Border Hexes - Player selects border hexes to remove from kingdom
     * Used by incidents like border raids that cause loss of territory
     * 
     * @param count - Number of hexes to remove (or 'dice' for rolled value)
     * @param dice - Dice formula (e.g., '1d3') if count is 'dice'
     * @returns ResolveResult with removed hex details
     */
    async removeBorderHexes(count: number | 'dice', dice?: string): Promise<ResolveResult> {
      logger.info(`🏴 [removeBorderHexes] Removing border hexes: count=${count}, dice=${dice}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // 1. Handle dice rolling if needed
        let hexCount: number;
        if (count === 'dice') {
          if (!dice) {
            return { success: false, error: 'Dice formula required when count is "dice"' };
          }
          
          const roll = new Roll(dice);
          await roll.evaluate();
          hexCount = roll.total || 1;
          
          // Show dice roll in chat
          await roll.toMessage({
            flavor: 'Border Hexes Lost',
            speaker: { alias: 'Kingdom' }
          });
          
          logger.info(`🎲 [removeBorderHexes] Rolled ${dice} = ${hexCount}`);
        } else {
          hexCount = count;
        }

        // 2. Calculate border hexes
        const borderHexes = await this.getBorderHexes(kingdom);
        
        if (borderHexes.length === 0) {
          return {
            success: false,
            error: 'No border hexes available to remove'
          };
        }

        logger.info(`🏴 [removeBorderHexes] Found ${borderHexes.length} border hexes:`, borderHexes);

        // Cap hexCount to available border hexes
        const actualCount = Math.min(hexCount, borderHexes.length);
        if (actualCount < hexCount) {
          const ui = (globalThis as any).ui;
          ui?.notifications?.warn(`Only ${actualCount} border hexes available (requested ${hexCount})`);
        }

        // 3. Open hex selector
        const { hexSelectorService } = await import('../services/hex-selector');
        
        const selectedHexes = await hexSelectorService.selectHexes({
          title: `Remove ${actualCount} Border Hex${actualCount !== 1 ? 'es' : ''}`,
          count: actualCount,
          colorType: 'unclaim',
          validationFn: (hexId) => borderHexes.includes(hexId)
        });

        if (!selectedHexes || selectedHexes.length === 0) {
          return {
            success: false,
            error: 'Hex selection cancelled'
          };
        }

        // 4. Remove hexes from kingdom
        await updateKingdom(k => {
          selectedHexes.forEach(hexId => {
            const hex = k.hexes.find(h => h.id === hexId);
            if (hex) {
              hex.claimedBy = null;
              logger.info(`  🏴 Removed hex ${hexId} from kingdom`);
            }
          });
        });

        logger.info(`✅ [removeBorderHexes] Removed ${selectedHexes.length} border hexes`);

        return {
          success: true,
          data: {
            removedHexes: selectedHexes,
            count: selectedHexes.length,
            message: `Removed ${selectedHexes.length} border hex${selectedHexes.length !== 1 ? 'es' : ''} from kingdom: ${selectedHexes.join(', ')}`
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to remove border hexes:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Helper: Get border hexes (hexes with at least one unclaimed adjacent hex)
     */
    async getBorderHexes(kingdom: any): Promise<string[]> {
      const { getAdjacentHexIds } = await import('../actions/shared/hexValidation');
      const { PLAYER_KINGDOM } = await import('../types/ownership');
      
      // Get all claimed hexes
      const claimedHexes = kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM);
      
      // Filter to only border hexes
      return claimedHexes.filter((hex: any) => {
        const adjacentHexIds = getAdjacentHexIds(hex.id);
        
        // Check if any adjacent hex is unclaimed
        return adjacentHexIds.some((adjId: string) => {
          const adjHex = kingdom.hexes.find((h: any) => h.id === adjId);
          return !adjHex || adjHex.claimedBy === null || adjHex.claimedBy === undefined;
        });
      }).map((h: any) => h.id);
    },

    /**
     * Adjust Faction Attitude - Improve or worsen diplomatic relations
     * 
     * @param factionId - Optional specific faction (if null, player selects via UI)
     * @param steps - Number of steps to adjust (+1 = improve, -1 = worsen)
     * @param options - Optional constraints (maxLevel, minLevel)
     * @returns ResolveResult with attitude change details
     */
    async adjustFactionAttitude(
      factionId: string | null,
      steps: number,
      options?: {
        maxLevel?: string;
        minLevel?: string;
      }
    ): Promise<ResolveResult> {
      logger.info(`🤝 [adjustFactionAttitude] Adjusting faction attitude by ${steps} steps`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom || !kingdom.factions || kingdom.factions.length === 0) {
          return { success: false, error: 'No factions available' };
        }

        // Import utilities
        const { hasDiplomaticStructures } = await import('../utils/faction-attitude-adjuster');
        const { factionService } = await import('./factions/index');

        // Check diplomatic structures for maxLevel override
        const hasDiploStructures = hasDiplomaticStructures(kingdom);
        const effectiveMaxLevel = hasDiploStructures ? undefined : options?.maxLevel;

        // Get target faction
        let targetFactionId = factionId;
        let targetFactionName = '';

        if (!targetFactionId) {
          // For now, use a simple selection prompt
          // TODO: Implement proper FactionSelectorService with UI
          const game = (globalThis as any).game;
          
          // Filter eligible factions
          const { canAdjustAttitude, getAdjustmentBlockReason } = await import('../utils/faction-attitude-adjuster');
          const eligibleFactions = kingdom.factions.filter((f: any) => {
            return canAdjustAttitude(f.attitude, steps, {
              maxLevel: effectiveMaxLevel as any,
              minLevel: options?.minLevel as any
            });
          });

          if (eligibleFactions.length === 0) {
            return {
              success: false,
              error: `No factions available to ${steps > 0 ? 'improve' : 'worsen'} relations with${effectiveMaxLevel ? ` (max: ${effectiveMaxLevel})` : ''}`
            };
          }

          // Simple dropdown selection
          const factionChoices = eligibleFactions.reduce((acc: any, f: any) => {
            acc[f.id] = `${f.name} (${f.attitude})`;
            return acc;
          }, {});

          const selectedId = await new Promise<string | null>((resolve) => {
            const Dialog = (globalThis as any).Dialog;
            new Dialog({
              title: `Select Faction (${steps > 0 ? 'Improve' : 'Worsen'} Relations)`,
              content: `
                <form>
                  <div class="form-group">
                    <label>Choose Faction:</label>
                    <select name="factionId" style="width: 100%;">
                      ${eligibleFactions.map((f: any) => `<option value="${f.id}">${f.name} (${f.attitude})</option>`).join('')}
                    </select>
                  </div>
                </form>
              `,
              buttons: {
                ok: {
                  label: 'Select',
                  callback: (html: any) => {
                    const factionId = html.find('[name="factionId"]').val();
                    resolve(factionId);
                  }
                },
                cancel: {
                  label: 'Cancel',
                  callback: () => resolve(null)
                }
              },
              default: 'ok'
            }).render(true);
          });

          if (!selectedId) {
            return { success: false, error: 'Faction selection cancelled' };
          }

          targetFactionId = selectedId;
        }

        const faction = factionService.getFaction(targetFactionId);
        if (!faction) {
          return { success: false, error: `Faction not found: ${targetFactionId}` };
        }
        targetFactionName = faction.name;

        // Apply adjustment
        const result = await factionService.adjustAttitude(
          targetFactionId,
          steps,
          {
            maxLevel: effectiveMaxLevel as any,
            minLevel: options?.minLevel as any
          }
        );

        if (!result.success) {
          return { success: false, error: result.reason };
        }

        // Format message
        const direction = steps > 0 ? 'improved' : 'worsened';
        const message = `Relations with ${targetFactionName} ${direction}: ${result.oldAttitude} → ${result.newAttitude}`;

        logger.info(`✅ [adjustFactionAttitude] ${message}`);

        return {
          success: true,
          data: {
            factionName: targetFactionName,
            oldAttitude: result.oldAttitude,
            newAttitude: result.newAttitude,
            message
          }
        };

      } catch (error) {
        logger.error('❌ [GameCommandsResolver] Failed to adjust faction attitude:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    // TODO: Additional methods will be added as we implement more actions
    // - claimHexes(count, hexes)
    // - buildRoads(hexes)
    // - fortifyHex(hexId)
    // - upgradeSettlement(settlementId)
    // - buildStructure(settlementId, structureId, costReduction?)
    // - repairStructure(structureId)
    // - createWorksite(hexId, worksiteType)
    // - recoverArmy(armyId)
    // - establishDiplomaticRelations(nationId)
    // - requestEconomicAid(nationId)
    // - requestMilitaryAid(nationId)
    // - infiltration(targetNationId)
    // - sendScouts(purpose)
    // - arrestDissidents()
    // - hireAdventurers(eventId?)
  };
}
