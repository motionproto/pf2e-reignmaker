/**
 * Raiders Event Pipeline (CHOICE-BASED)
 *
 * Armed raiders threaten settlements and trade routes.
 *
 * Approaches:
 * - Negotiate Peace Treaty (Virtuous) - Diplomacy and trade
 * - Fortify Borders (Practical) - Defense and preparation
 * - Preemptive Strike (Ruthless) - Military assault
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import {
  validateExplored,
  validateAdjacentToClaimed,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { claimHexesExecution } from '../../execution/territory/claimHexes';

export const raidersPipeline: CheckPipeline = {
  id: 'raiders',
  name: 'Raiders',
  description: 'Armed raiders threaten settlements and trade routes.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to raiders?',
    required: true,
    options: [
      {
        id: 'idealist',
        label: 'Defend & Protect',
        description: 'Seek peaceful resolution through diplomacy',
        icon: 'fas fa-dove',
        skills: ['diplomacy', 'society', 'survival', 'applicable lore'],
        personality: { idealist: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Former enemies become trading partners; mutual prosperity blooms.',
          success: 'Diplomacy wins fragile peace; raiders depart with dignity.',
          failure: 'Empty promises waste resources; tension simmers unresolved.',
          criticalFailure: 'Scornful raiders extort tribute and mock your weakness.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Strategic Defense',
        description: 'Prepare defenses and protect territory',
        icon: 'fas fa-fort-awesome',
        skills: ['nature', 'society', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ironclad defenses repel marauders; salvaged gear enriches coffers.',
          success: 'Prepared positions turn raiders away without losses.',
          failure: 'Weakened defenses crumble under relentless assault.',
          criticalFailure: 'Raiders breach walls and raze vital infrastructure.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Counter-raid',
        description: 'Launch military assault on raider camps',
        icon: 'fas fa-fire',
        skills: ['intimidation', 'stealth', 'deception', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Annihilation complete; plundered wealth and captured prisoners secured.',
          success: 'Swift victory reclaims stolen goods and captures survivors.',
          failure: 'Drawn-out battle depletes supplies and exhausts troops.',
          criticalFailure: 'Ambush shatters forces; survivors limp home in shame.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Claim 1 hex', 'fas fa-map', 'positive'),
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'negotiate peace' },
    { skill: 'society', description: 'establish trade' },
    { skill: 'intimidation', description: 'military response' },
    { skill: 'stealth', description: 'track to base' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your response proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Your approach succeeds.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Your response encounters complications.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling backfires badly.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Read approach from kingdom store (set by PreRollChoiceSelector voting)
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;

      // Find the selected approach option
      const selectedOption = raidersPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'raiders',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'idealist') {
        // Negotiate Peace Treaty (Virtuous)
        if (outcome === 'criticalSuccess') {
          // Adjust 1 random faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousCS = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Adjust 1 random faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuousCF = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'practical') {
        // Fortify Borders (Practical)
        if (outcome === 'failure') {
          // +1 Unrest, -1d3 Gold, damage 1 fortification or worksite
          // For simplicity, damage a worksite (fortifications are structures)
          const damageHandler = new DestroyWorksiteHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'destroyWorksite', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamageWorksite = damageCommand;
            if (damageCommand.metadata) {
              Object.assign(ctx.metadata, damageCommand.metadata);
            }
            // Don't add badge - just mark as damaged (not destroyed)
            // Actually, let's use DamageStructureHandler for proper fortifications
          }
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1d3 Gold, damage 1 structure
          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamageStructure = damageCommand;
            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'ruthless') {
        // Preemptive Strike (Ruthless)
        // Critical Success: Claim 1 hex (captured raider territory)
        if (outcome === 'criticalSuccess') {
          ctx.metadata._claimHexCount = 1;
        }

        // Handle imprisonment (CS/S)
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          // Convert 1d3 unrest to imprisoned (captured raiders)
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedImprison = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
            }
          }
        }
        
        // Handle army conditions
        if (outcome === 'failure' || outcome === 'criticalFailure') {
          const condition = outcome === 'failure' ? 'fatigued' : 'enfeebled';
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition, value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            // Remove static badge and add dynamic one
            const badgeText = outcome === 'failure' ? 'army becomes Fatigued' : 'army becomes Enfeebled';
            const filtered = outcomeBadges.filter(b => !b.template?.includes(badgeText));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    // Claim hexes (ruthless CS)
    if (ctx.metadata?._claimHexCount > 0) {
      const selectedHexData = ctx.resolutionData?.compoundData?.claimedHexes;

      if (selectedHexData) {
        let hexIds: string[] = [];

        if (Array.isArray(selectedHexData)) {
          hexIds = selectedHexData;
        } else if (selectedHexData?.hexIds && Array.isArray(selectedHexData.hexIds)) {
          hexIds = selectedHexData.hexIds;
        }

        if (hexIds.length > 0) {
          await claimHexesExecution(hexIds);
          const hexList = hexIds.join(', ');
          const ui = (globalThis as any).ui;
          ui?.notifications?.info(`Claimed hex from raiders: ${hexList}`);
        }
      }
    }

    // Execute faction adjustments
    const factionVirtuousCS = ctx.metadata?._preparedFactionVirtuousCS;
    if (factionVirtuousCS?.commit) {
      await factionVirtuousCS.commit();
    }

    const factionVirtuousCF = ctx.metadata?._preparedFactionVirtuousCF;
    if (factionVirtuousCF?.commit) {
      await factionVirtuousCF.commit();
    }

    // Execute structure damage (practical CF)
    const damageCommand = ctx.metadata?._preparedDamageStructure;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute imprisonment (ruthless CS/S - converts unrest to imprisoned)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Apply army condition (selected in preview.calculate)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    return { success: true };
  },

  // Post-apply interactions for map selection
  postApplyInteractions: [
    {
      id: 'claimedHexes',
      type: 'map-selection',
      mode: 'hex-selection',
      count: (ctx: any) => ctx.metadata?._claimHexCount || 0,
      title: 'Select a hex to claim from raiders',
      colorType: 'claim',
      required: true,
      condition: (ctx: any) => {
        return (ctx.metadata?._claimHexCount || 0) > 0;
      },
      validateHex: (hexId: string, pendingClaims: string[] = []): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);

          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }

          // Already claimed by player?
          if (hex.claimedBy === PLAYER_KINGDOM) {
            return { valid: false, message: 'This hex is already claimed by your kingdom' };
          }

          // Already in pending claims?
          if (pendingClaims.includes(hexId)) {
            return { valid: false, message: 'This hex is already selected' };
          }

          // Must be explored
          const exploredResult = validateExplored(hexId);
          if (!exploredResult.valid) return exploredResult;

          // Must be adjacent to claimed territory (or pending claims)
          const adjacencyResult = validateAdjacentToClaimed(hexId, pendingClaims, kingdom);
          if (!adjacencyResult.valid) return adjacencyResult;

          return { valid: true, message: 'Valid hex to claim from raiders' };
        }, hexId, 'raiders claim validation');
      }
    },
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Destroyed by Raiders')
  ],

  traits: ["dangerous", "ongoing"],
};
