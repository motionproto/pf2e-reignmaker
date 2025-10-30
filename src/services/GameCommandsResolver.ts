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
     * Delegates to ArmyService for implementation
     * 
     * @param level - Army level (typically party level)
     * @param name - Optional custom name for the army
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

        // Get kingdom data for naming
        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return {
            success: false,
            error: 'No kingdom data available'
          };
        }

        // Generate army number (count existing armies + 1)
        const armyNumber = kingdom.armies.length + 1;
        const armyName = name || `Army ${armyNumber}`;

        // Delegate to ArmyService
        const { armyService } = await import('./army');
        const army = await armyService.createArmy(armyName, level);

        return {
          success: true,
          data: {
            army: army,
            message: `Recruited ${armyName} at level ${level}${army.actorId ? ' (NPC actor created)' : ''}`
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
     * @returns ResolveResult with refund data
     */
    async disbandArmy(armyId: string): Promise<ResolveResult> {

      try {
        // Delegate to ArmyService
        const { armyService } = await import('./army');
        const result = await armyService.disbandArmy(armyId);

        return {
          success: true,
          data: {
            armyName: result.armyName,
            refund: result.refund,
            message: `Disbanded ${result.armyName} and refunded ${result.refund} gold`
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
        const settlement = kingdom.settlements?.find(s => s.id === settlementId);
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
          const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
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

    // TODO: Additional methods will be added as we implement more actions
    // - claimHexes(count, hexes)
    // - buildRoads(hexes)
    // - fortifyHex(hexId)
    // - upgradeSettlement(settlementId)
    // - buildStructure(settlementId, structureId, costReduction?)
    // - repairStructure(structureId)
    // - createWorksite(hexId, worksiteType)
    // - trainArmy(armyId, levelIncrease)
    // - deployArmy(armyId, targetHexId)
    // - outfitArmy(armyId, equipmentUpgrades)
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
