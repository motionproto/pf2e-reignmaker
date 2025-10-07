/**
 * GameEffectsResolver - Handles non-resource game effects from actions
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
import type { Army } from '../models/BuildProject';

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
export async function createGameEffectsResolver() {
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
      console.log(`🪖 [GameEffectsResolver] Recruiting army at level ${level}...`);
      
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
        const kingdom = actor.getKingdom();
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
        console.error('❌ [GameEffectsResolver] Failed to recruit army:', error);
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
      console.log(`🪖 [GameEffectsResolver] Disbanding army ${armyId}...`);
      
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
        console.error('❌ [GameEffectsResolver] Failed to disband army:', error);
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
      console.log(`🏘️ [GameEffectsResolver] Founding settlement: ${name}...`);
      
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

        console.log(`✅ [GameEffectsResolver] ${message}`);

        return {
          success: true,
          data: {
            settlement: newSettlement,
            message,
            grantFreeStructure // Pass this flag so UI can handle it
          }
        };

      } catch (error) {
        console.error('❌ [GameEffectsResolver] Failed to found settlement:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

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
    // - executePrisoners()
    // - pardonPrisoners()
    // - hireAdventurers(eventId?)
  };
}
