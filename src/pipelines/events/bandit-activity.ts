/**
 * Bandit Activity Event Pipeline (CHOICE-BASED)
 *
 * Bandits raid caravans and settlements in your territory.
 *
 * Approaches:
 * - Negotiate Safe Passage (Virtuous) - Peaceful resolution and employment
 * - Drive Them Off (Practical) - Militia defense and recovered goods
 * - Hunt Without Mercy (Ruthless) - Brutal elimination and plunder
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { DestroyWorksiteHandler } from '../../services/gameCommands/handlers/DestroyWorksiteHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';

export const banditActivityPipeline: CheckPipeline = {
  id: 'bandit-activity',
  name: 'Bandit Activity',
  description: 'Bandits raid caravans and settlements in your territory.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to bandit activity?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Negotiate',
        description: 'Offer bandits employment and peaceful resolution',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Bandits accept jobs and integrate. Your compassion creates new opportunities.',
          success: 'The bandits agree to leave peacefully.',
          failure: 'Bandits demand payment to leave.',
          criticalFailure: 'Negotiations fail and bandits extort the kingdom.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 worksite', 'fas fa-industry', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative'),
            textBadge('Lose 1 worksite', 'fas fa-industry', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Drive Them Off',
        description: 'Use militia to defend and recover stolen goods',
        icon: 'fas fa-shield',
        skills: ['intimidation', 'stealth', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Militia triumphs, recovering plunder and restoring security.',
          success: 'Bandits are repelled and some goods recovered.',
          failure: 'Bandits strike before you can respond.',
          criticalFailure: 'Bandits raid a worksite and destroy it.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive'),
            textBadge('Gain 1 worksite', 'fas fa-industry', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative'),
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Hunt Mercilessly',
        description: 'Eliminate bandits brutally and take their plunder',
        icon: 'fas fa-crosshairs',
        skills: ['intimidation', 'stealth', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Bandits eliminated. Plunder seized and survivors imprisoned.',
          success: 'Bandits hunted down and survivors captured.',
          failure: 'Your brutal tactics spark resentment.',
          criticalFailure: 'Excessive violence causes collateral damage to a structure.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('{{value}} innocents harmed', 'fas fa-user-injured', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d2', 'negative'),
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'diplomacy', description: 'negotiate' },
    { skill: 'society', description: 'find employment' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'stealth', description: 'track to hideout' },
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
      const selectedOption = banditActivityPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'bandit-activity',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Negotiate Safe Passage (Virtuous)
        if (outcome === 'criticalSuccess') {
          // +1 Fame, -1d3 Unrest, +1 new worksite
          // Worksite creation handled in execute()
          ctx.metadata._createWorksite = true;
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'practical') {
        // Drive Them Off (Practical)
        if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1d3 Gold, destroy 1 worksite
          const destroyHandler = new DestroyWorksiteHandler();
          const destroyCommand = await destroyHandler.prepare(
            { type: 'destroyWorksite', count: 1 },
            commandContext
          );
          if (destroyCommand) {
            ctx.metadata._preparedDestroyWorksite = destroyCommand;
            if (destroyCommand.metadata) {
              Object.assign(ctx.metadata, destroyCommand.metadata);
            }
            if (destroyCommand.outcomeBadges) {
              outcomeBadges.push(...destroyCommand.outcomeBadges);
            } else if (destroyCommand.outcomeBadge) {
              outcomeBadges.push(destroyCommand.outcomeBadge);
            }
          }
        }
        // Other outcomes handled by standard badges
      } else if (approach === 'ruthless') {
        // Hunt Without Mercy (Ruthless)
        if (outcome === 'criticalSuccess') {
          // -1d3 Unrest, +1d3 Gold (plunder), imprison 1d3 captives
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 3, diceFormula: '1d3' },
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
        } else if (outcome === 'success') {
          // -1 Unrest, imprison 1d2 captives
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 2, diceFormula: '1d2' },
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
        } else if (outcome === 'criticalFailure') {
          // +1d3 Unrest, -1 Fame, damage 1 structure
          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamage = damageCommand;
            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
            }
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  postApplyInteractions: [
    {
      id: 'selectedHex',
      type: 'map-selection',
      mode: 'hex-selection',
      count: 1,
      title: 'Select a hex for the new worksite',
      colorType: 'worksite',
      required: true,
      condition: (ctx) => {
        return ctx.metadata?._createWorksite === true;
      },
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          if (hex.worksite) {
            return { valid: false, message: `Hex already has a ${hex.worksite.type}` };
          }
          
          return { valid: true, message: 'Valid location for worksite' };
        }, hexId, 'bandit-activity worksite validation');
      },
      customSelector: {
        component: WorksiteTypeSelector
      }
    },
    DestroyWorksiteHandler.getMapDisplayInteraction('Worksite Destroyed by Bandits')
  ],

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Create worksite (virtuous CS)
    if (ctx.metadata?._createWorksite) {
      const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
      
      if (!selectedHexData) {
        return { success: false, error: 'No hex selected for worksite' };
      }
      
      let hexId: string | undefined;
      let worksiteType: string | undefined;
      
      if (selectedHexData?.hexIds) {
        hexId = selectedHexData.hexIds[0];
        if (hexId && selectedHexData.metadata) {
          worksiteType = selectedHexData.metadata[hexId]?.worksiteType;
        }
      }

      if (!hexId || !worksiteType) {
        return { success: false, error: 'Worksite selection incomplete' };
      }

      const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
      await createWorksiteExecution(hexId, worksiteType);
      ui.notifications?.info(`Bandits integrated as workers - ${worksiteType} created on hex ${hexId}`);
    }

    // Execute worksite destruction (practical CF)
    const destroyCommand = ctx.metadata?._preparedDestroyWorksite;
    if (destroyCommand?.commit) {
      await destroyCommand.commit();
    }

    // Execute imprisonment (ruthless approach - success/critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute structure damage (ruthless CF)
    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"]
};
