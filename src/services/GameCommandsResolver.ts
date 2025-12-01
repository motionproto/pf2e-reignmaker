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
import type { PreparedCommand } from '../types/game-commands';

// Extracted command imports
import { 
  recruitArmy as recruitArmyCommand,
  disbandArmy as disbandArmyCommand,
  trainArmy as trainArmyCommand,
  getPartyLevel,
  createEquipmentEffect,
  getEquipmentDisplayName
} from './commands/armies/armyCommands';

import { foundSettlement as foundSettlementCommand } from './commands/settlements/foundSettlement';

import { 
  chooseAndGainResource as chooseAndGainResourceCommand,
  giveActorGold as giveActorGoldCommand,
  getKingdomTaxationTier,
  calculateIncome
} from './commands/resources/playerRewards';

import { 
  reduceImprisoned as reduceImprisonedCommand,
  releaseImprisoned as releaseImprisonedCommand
} from './commands/unrest/imprisonedUnrest';

import { 
  destroyStructure as destroyStructureCommand,
  damageStructure as damageStructureCommand
} from './commands/structures/damageCommands';

import { DestroyWorksiteHandler } from './gameCommands/handlers/DestroyWorksiteHandler';

import { 
  getBorderHexes,
  removeBorderHexes as removeBorderHexesCommand
} from './commands/territory/borderHexes';

import { adjustFactionAttitude as adjustFactionAttitudeCommand } from './commands/factions/attitudeCommands';

import { 
  calculateRandomNearbyHex,
  applyConditionToActor
} from './commands/combat/conditionHelpers';

/**
 * Result of game effect resolution (LEGACY - being replaced by PreparedCommand)
 */
export interface ResolveResult {
  success: boolean;
  error?: string;
  data?: any; // Action-specific return data
}

// PreparedCommand is now imported from types/game-commands.ts
// Uses outcomeBadge: UnifiedOutcomeBadge instead of specialEffect

/**
 * Create the game effects resolver service
 */
export async function createGameCommandsResolver() {
  return {
    async recruitArmy(level: number, recruitmentData: { name: string; armyType: string; settlementId?: string | null; supportedBy?: string }, exemptFromUpkeep?: boolean): Promise<PreparedCommand> {
      return recruitArmyCommand(level, recruitmentData, exemptFromUpkeep);
    },

    async disbandArmy(armyId: string, deleteActor: boolean = true): Promise<PreparedCommand> {
      return disbandArmyCommand(armyId, deleteActor);
    },

    async foundSettlement(
      name: string,
      location: { x: number; y: number } = { x: 0, y: 0 },
      grantFreeStructure: boolean = false
    ): Promise<PreparedCommand> {
      return foundSettlementCommand(name, location, grantFreeStructure);
    },

    async giveActorGold(multiplier: number, settlementId: string): Promise<PreparedCommand> {
      return giveActorGoldCommand(multiplier, settlementId);
    },

    getKingdomTaxationTier,

    calculateIncome,

    async reduceImprisoned(settlementId: string, amount: string | number): Promise<ResolveResult> {
      return reduceImprisonedCommand(settlementId, amount);
    },

    async trainArmy(armyId: string, outcome: string): Promise<PreparedCommand> {
      return trainArmyCommand(armyId, outcome);
    },

    getPartyLevel,

    /**
     * Outfit Army - Equip army with gear upgrades
     * Applies PF2e effects (armor, runes, weapons, equipment) to army actor
     * Each army can receive each equipment type only once
     * REFACTORED: Uses prepare/commit pattern
     * 
     * @param armyId - ID of army to outfit (optional - will prompt user if not provided)
     * @param equipmentType - Type of equipment (optional - will prompt user if not provided)
     * @param outcome - Action outcome (success, criticalSuccess, failure, criticalFailure)
     * @param fallbackToGold - If true and no armies available, grant 1 gold instead
     * @returns PreparedCommand with preview + commit function (or legacy ResolveResult if interactive prompts needed)
     */
    async outfitArmy(armyId: string | undefined, equipmentType: string | undefined, outcome: string, fallbackToGold?: boolean): Promise<PreparedCommand | ResolveResult> {
      logger.info(`⚔️ [outfitArmy] Outfitting army ${armyId || '(prompt user)'} with ${equipmentType || '(prompt user)'} (outcome: ${outcome}, fallback: ${fallbackToGold})`);

      try {
        const actor = getKingdomActor();
        if (!actor) {
          return { success: false, error: 'No kingdom actor available' };
        }

        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return { success: false, error: 'No kingdom data available' };
        }

        // Get available armies (those with actorId and at least one available equipment slot)
        const armies = kingdom.armies || [];
        const validTypes = ['armor', 'runes', 'weapons', 'equipment'];
        
        const availableArmies = armies.filter((a: Army) => {
          if (!a.actorId) return false;
          // Check if army has at least one equipment slot available
          return validTypes.some(type => !a.equipment?.[type as keyof typeof a.equipment]);
        });

        // NEW: Check if fallback to gold is enabled
        if (fallbackToGold && availableArmies.length === 0) {
          // No armies to outfit - grant 1 gold instead (PREPARE/COMMIT pattern)
          logger.info(`💰 [outfitArmy] PREPARED: Will grant 1 gold (no armies available)`);

          return {
            outcomeBadge: {
              icon: 'fa-coins',
          template: 'Received {{value}}',
              value: { type: 'static', amount: 1 },
              suffix: 'Gold (no armies to outfit)',
              variant: 'positive'
            },
            commit: async () => {
              logger.info(`💰 [outfitArmy] COMMITTING: Adding 1 gold`);
              
              await updateKingdom(k => {
                k.resources.gold = (k.resources.gold || 0) + 1;
              });

              logger.info(`✅ [outfitArmy] Successfully granted 1 gold`);
            }
          };
        }

        if (availableArmies.length === 0) {
          return { success: false, error: 'No armies available to outfit (all fully equipped)' };
        }

        // Prompt user to select army if not provided
        if (!armyId) {
          const selectedArmyId = await new Promise<string | null>((resolve) => {
            const Dialog = (globalThis as any).Dialog;
            new Dialog({
              title: 'Select Army to Outfit',
              content: `
                <form>
                  <div class="form-group">
                    <label>Select an army to outfit:</label>
                    <select name="armyId" style="width: 100%; padding: 5px;">
                      ${availableArmies.map((a: Army) => `<option value="${a.id}">${a.name} (Level ${a.level})</option>`).join('')}
                    </select>
                  </div>
                </form>
              `,
              buttons: {
                ok: {
                  label: 'Select',
                  callback: (html: any) => {
                    const selectedId = html.find('[name="armyId"]').val();
                    resolve(selectedId);
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

          if (!selectedArmyId) {
            return { success: false, error: 'Army selection cancelled' };
          }
          
          armyId = selectedArmyId;
        }

        // Find the selected army
        const army = kingdom.armies?.find((a: Army) => a.id === armyId);
        if (!army) {
          return { success: false, error: `Army ${armyId} not found` };
        }

        if (!army.actorId) {
          return { success: false, error: `${army.name} has no linked NPC actor` };
        }

        // Get available equipment types for this army
        const availableEquipmentTypes = validTypes.filter(type => 
          !army.equipment?.[type as keyof typeof army.equipment]
        );

        if (availableEquipmentTypes.length === 0) {
          return { success: false, error: `${army.name} is fully equipped (all upgrade slots used)` };
        }

        // Prompt user to select equipment type if not provided
        if (!equipmentType) {
          const selectedEquipmentType = await new Promise<string | null>((resolve) => {
            const Dialog = (globalThis as any).Dialog;
            const equipmentNames = {
              armor: 'Armor (+1 AC)',
              runes: 'Runes (+1 to hit)',
              weapons: 'Weapons (+1 damage dice)',
              equipment: 'Enhanced Gear (+1 saves)'
            };
            
            new Dialog({
              title: `Outfit ${army.name}`,
              content: `
                <form>
                  <div class="form-group">
                    <label>Select equipment type:</label>
                    <select name="equipmentType" style="width: 100%; padding: 5px;">
                      ${availableEquipmentTypes.map(type => 
                        `<option value="${type}">${equipmentNames[type as keyof typeof equipmentNames]}</option>`
                      ).join('')}
                    </select>
                  </div>
                </form>
              `,
              buttons: {
                ok: {
                  label: 'Outfit',
                  callback: (html: any) => {
                    const selectedType = html.find('[name="equipmentType"]').val();
                    resolve(selectedType);
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

          if (!selectedEquipmentType) {
            return { success: false, error: 'Equipment selection cancelled' };
          }
          
          equipmentType = selectedEquipmentType;
        }

        // Check if army already has this equipment (already validated in equipment selection)
        if (army.equipment?.[equipmentType! as keyof typeof army.equipment]) {
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

    createEquipmentEffect,

    getEquipmentDisplayName,

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
              deployedArmyIds: [],
              factionsAidedThisTurn: []
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

    calculateRandomNearbyHex,

    applyConditionToActor,

    async releaseImprisoned(percentage: number | 'all'): Promise<ResolveResult> {
      return releaseImprisonedCommand(percentage);
    },

    async destroyStructure(
      category?: string,
      targetTier?: 'highest' | 'lowest' | number,
      count: number = 1
    ): Promise<ResolveResult> {
      return destroyStructureCommand(category, targetTier, count);
    },

    async damageStructure(
      targetStructure?: string,
      settlementId?: string,
      count: number = 1
    ): Promise<ResolveResult> {
      return damageStructureCommand(targetStructure, settlementId, count);
    },

    async destroyWorksite(count: number | string = 1): Promise<PreparedCommand | null> {
      const handler = new DestroyWorksiteHandler();
      
      const actor = getKingdomActor();
      if (!actor) {
        return null;
      }
      
      const kingdom = actor.getKingdomData();
      
      return handler.prepare(
        { type: 'destroyWorksite', count },
        { actionId: 'destroy-worksite', outcome: 'success', kingdom, metadata: {} }
      );
    },

    async removeBorderHexes(count: number | 'dice', dice?: string): Promise<ResolveResult> {
      return removeBorderHexesCommand(count, dice);
    },

    getBorderHexes,

    async adjustFactionAttitude(
      factionId: string | null,
      steps: number,
      options?: {
        maxLevel?: string;
        minLevel?: string;
        count?: number;
      }
    ): Promise<PreparedCommand> {
      return adjustFactionAttitudeCommand(factionId, steps, options);
    },

    async chooseAndGainResource(resources: string[], amount: number): Promise<ResolveResult> {
      return chooseAndGainResourceCommand(resources, amount);
    },

    // TODO: Additional methods will be added as we implement more actions
  };
}
