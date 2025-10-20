/**
 * ActionEffectsService - Handles complex game state changes for player actions
 * 
 * Responsibilities:
 * - Apply post-resolution game effects (claim hexes, build structures, create armies, etc.)
 * - Validate action requirements before execution
 * - Provide available selections for actions (e.g., list of claimable hexes)
 * - Handle entity creation/modification/destruction
 * 
 * Architecture:
 * - Service = Complex operations & game state management
 * - Called by ActionPhaseController after resource modifiers are applied
 * - Single write path through updateKingdom() → KingdomActor
 */

import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import type { ComplexAction } from '../types/modifiers';
import { logger } from '../utils/Logger';

/**
 * Result of action effect application
 */
export interface ActionEffectResult {
  success: boolean;
  error?: string;
  changes: string[];  // Human-readable descriptions of what changed
}

/**
 * Create the action effects service
 */
export async function createActionEffectsService() {
  return {
    /**
     * Apply a complex action effect to the kingdom
     * 
     * This is the main entry point for all complex game state changes.
     */
    async applyComplexAction(action: ComplexAction): Promise<ActionEffectResult> {
      logger.debug(`🎯 [ActionEffects] Applying complex action:`, {
        type: action.type,
        data: action.data
      });

      const result: ActionEffectResult = {
        success: true,
        changes: []
      };

      try {
        switch (action.type) {
          case 'claimHex':
            await this.claimHexes(action.data, result);
            break;
          case 'harvestResources':
            await this.harvestHexResources(action.data, result);
            break;
          case 'buildRoads':
            await this.buildRoads(action.data, result);
            break;
          case 'fortifyHex':
            await this.fortifyHex(action.data, result);
            break;
          case 'createSettlement':
            await this.createSettlement(action.data, result);
            break;
          case 'upgradeSettlement':
            await this.upgradeSettlement(action.data, result);
            break;
          case 'repairStructure':
            await this.repairStructure(action.data, result);
            break;
          case 'createWorksite':
            await this.createWorksite(action.data, result);
            break;
          case 'recruitArmy':
            await this.recruitArmy(action.data, result);
            break;
          case 'deployArmy':
            await this.deployArmy(action.data, result);
            break;
          case 'disbandArmy':
            await this.disbandArmy(action.data, result);
            break;
          case 'trainArmy':
            await this.trainArmy(action.data, result);
            break;
          case 'recoverArmy':
            await this.recoverArmy(action.data, result);
            break;
          case 'outfitArmy':
            await this.outfitArmy(action.data, result);
            break;
          default:
            logger.warn(`⚠️ [ActionEffects] Unknown action type: ${action.type}`);
            result.success = false;
            result.error = `Unknown action type: ${action.type}`;
        }

        logger.debug(`✅ [ActionEffects] Action applied successfully:`, result.changes);
        return result;

      } catch (error) {
        logger.error(`❌ [ActionEffects] Failed to apply action:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
      }
    },

    /**
     * Apply multiple complex actions in sequence
     */
    async applyComplexActions(actions: ComplexAction[]): Promise<ActionEffectResult> {
      const allChanges: string[] = [];
      
      for (const action of actions) {
        const result = await this.applyComplexAction(action);
        if (!result.success) {
          return result;  // Stop on first error
        }
        allChanges.push(...result.changes);
      }

      return {
        success: true,
        changes: allChanges
      };
    },

    // ============================================================
    // EXPAND BORDERS ACTIONS
    // ============================================================

    /**
     * Claim one or more hexes for the kingdom
     */
    async claimHexes(data: { hexIds: string[] }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🗺️ [ActionEffects] Claiming ${data.hexIds.length} hex(es)`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.claimedHexes) {
          kingdom.claimedHexes = [];
        }

        for (const hexId of data.hexIds) {
          if (!kingdom.claimedHexes.includes(hexId)) {
            kingdom.claimedHexes.push(hexId);
            result.changes.push(`Claimed hex: ${hexId}`);
          }
        }
      });
    },

    /**
     * Harvest resources from a hex
     */
    async harvestHexResources(data: { hexId: string; resource: string; amount: number }, result: ActionEffectResult): Promise<void> {
      logger.debug(`⛏️ [ActionEffects] Harvesting ${data.amount} ${data.resource} from hex ${data.hexId}`);
      
      await updateKingdom(kingdom => {
        // Mark hex as harvested (track which hexes have been harvested this turn)
        if (!kingdom.harvestedHexes) {
          kingdom.harvestedHexes = [];
        }
        
        if (!kingdom.harvestedHexes.includes(data.hexId)) {
          kingdom.harvestedHexes.push(data.hexId);
        }

        result.changes.push(`Harvested ${data.amount} ${data.resource} from hex ${data.hexId}`);
      });
    },

    /**
     * Build roads in hexes
     * IMPORTANT: Updates both roadsBuilt array AND individual hex.hasRoad flags
     */
    async buildRoads(data: { hexIds: string[] }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🛣️ [ActionEffects] Building roads in ${data.hexIds.length} hex(es)`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.roadsBuilt) {
          kingdom.roadsBuilt = [];
        }

        for (const hexId of data.hexIds) {
          // Update roadsBuilt array
          if (!kingdom.roadsBuilt.includes(hexId)) {
            kingdom.roadsBuilt.push(hexId);
            result.changes.push(`Built road in hex: ${hexId}`);
          }
          
          // Update individual hex hasRoad flag (CRITICAL for persistence)
          const hex = kingdom.hexes?.find(h => h.id === hexId);
          if (hex) {
            hex.hasRoad = true;
            logger.debug(`✅ [ActionEffects] Set hasRoad=true for hex ${hexId}`);
          } else {
            logger.warn(`⚠️ [ActionEffects] Hex ${hexId} not found in kingdom.hexes - road may not persist!`);
          }
        }
      });
    },

    /**
     * Fortify a hex
     */
    async fortifyHex(data: { hexId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🏰 [ActionEffects] Fortifying hex ${data.hexId}`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.fortifiedHexes) {
          kingdom.fortifiedHexes = [];
        }

        if (!kingdom.fortifiedHexes.includes(data.hexId)) {
          kingdom.fortifiedHexes.push(data.hexId);
          result.changes.push(`Fortified hex: ${data.hexId}`);
        }
      });
    },

    // ============================================================
    // URBAN PLANNING ACTIONS
    // ============================================================

    /**
     * Create a new settlement
     */
    async createSettlement(data: { name: string; hexId: string; tier: number }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🏘️ [ActionEffects] Creating settlement: ${data.name}`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.settlements) {
          kingdom.settlements = [];
        }

        const settlement = {
          id: `settlement-${Date.now()}`,
          name: data.name,
          hexId: data.hexId,
          tier: data.tier,
          structures: [],
          createdAt: Date.now()
        };

        kingdom.settlements.push(settlement);
        result.changes.push(`Created settlement: ${data.name} (tier ${data.tier})`);
      });
    },

    /**
     * Upgrade a settlement's tier
     */
    async upgradeSettlement(data: { settlementId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`⬆️ [ActionEffects] Upgrading settlement ${data.settlementId}`);
      
      await updateKingdom(kingdom => {
        const settlement = kingdom.settlements?.find(s => s.id === data.settlementId);
        if (settlement) {
          const oldTier = settlement.tier;
          settlement.tier = Math.min(settlement.tier + 1, 4);  // Max tier 4
          result.changes.push(`Upgraded ${settlement.name} from tier ${oldTier} to tier ${settlement.tier}`);
        }
      });
    },

    /**
     * Repair a damaged structure
     */
    async repairStructure(data: { settlementId: string; structureId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🔧 [ActionEffects] Repairing structure ${data.structureId} in settlement ${data.settlementId}`);
      
      await updateKingdom(kingdom => {
        const settlement = kingdom.settlements?.find(s => s.id === data.settlementId);
        if (settlement) {
          // TODO: Implement structure repair logic when structure damage system is ready
          result.changes.push(`Repaired structure in ${settlement.name}`);
        }
      });
    },

    /**
     * Create a worksite (special hex improvement)
     */
    async createWorksite(data: { hexId: string; resourceType: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`⚒️ [ActionEffects] Creating ${data.resourceType} worksite in hex ${data.hexId}`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.worksites) {
          kingdom.worksites = [];
        }

        const worksite = {
          id: `worksite-${Date.now()}`,
          hexId: data.hexId,
          resourceType: data.resourceType,
          createdAt: Date.now()
        };

        kingdom.worksites.push(worksite);
        result.changes.push(`Created ${data.resourceType} worksite in hex ${data.hexId}`);
      });
    },

    // ============================================================
    // MILITARY ACTIONS
    // ============================================================

    /**
     * Recruit a new army unit
     */
    async recruitArmy(data: { unitType: string; settlementId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`⚔️ [ActionEffects] Recruiting ${data.unitType} army`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.armies) {
          kingdom.armies = [];
        }

        const army = {
          id: `army-${Date.now()}`,
          unitType: data.unitType,
          settlementId: data.settlementId,
          status: 'ready',
          createdAt: Date.now()
        };

        kingdom.armies.push(army);
        result.changes.push(`Recruited ${data.unitType} army`);
      });
    },

    /**
     * Deploy an army to a hex
     */
    async deployArmy(data: { armyId: string; hexId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`📍 [ActionEffects] Deploying army ${data.armyId} to hex ${data.hexId}`);
      
      await updateKingdom(kingdom => {
        const army = kingdom.armies?.find(a => a.id === data.armyId);
        if (army) {
          army.deployedHexId = data.hexId;
          army.status = 'deployed';
          result.changes.push(`Deployed army to hex ${data.hexId}`);
        }
      });
    },

    /**
     * Disband an army unit
     */
    async disbandArmy(data: { armyId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`❌ [ActionEffects] Disbanding army ${data.armyId}`);
      
      await updateKingdom(kingdom => {
        if (kingdom.armies) {
          const index = kingdom.armies.findIndex(a => a.id === data.armyId);
          if (index !== -1) {
            kingdom.armies.splice(index, 1);
            result.changes.push(`Disbanded army`);
          }
        }
      });
    },

    /**
     * Train an army to improve its capabilities
     */
    async trainArmy(data: { armyId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🎯 [ActionEffects] Training army ${data.armyId}`);
      
      await updateKingdom(kingdom => {
        const army = kingdom.armies?.find(a => a.id === data.armyId);
        if (army) {
          army.trained = true;
          result.changes.push(`Trained army`);
        }
      });
    },

    /**
     * Recover a damaged/routed army
     */
    async recoverArmy(data: { armyId: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`❤️ [ActionEffects] Recovering army ${data.armyId}`);
      
      await updateKingdom(kingdom => {
        const army = kingdom.armies?.find(a => a.id === data.armyId);
        if (army) {
          army.status = 'ready';
          result.changes.push(`Recovered army`);
        }
      });
    },

    /**
     * Outfit an army with equipment
     */
    async outfitArmy(data: { armyId: string; equipment: string }, result: ActionEffectResult): Promise<void> {
      logger.debug(`🛡️ [ActionEffects] Outfitting army ${data.armyId} with ${data.equipment}`);
      
      await updateKingdom(kingdom => {
        const army = kingdom.armies?.find(a => a.id === data.armyId);
        if (army) {
          if (!army.equipment) {
            army.equipment = [];
          }
          army.equipment.push(data.equipment);
          result.changes.push(`Outfitted army with ${data.equipment}`);
        }
      });
    }
  };
}
