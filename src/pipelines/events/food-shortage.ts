/**
 * Food Shortage Event Pipeline (CHOICE-BASED)
 *
 * Disease, weather, or pests destroy agricultural production.
 * How will you respond to the crisis?
 *
 * Approaches:
 * - Feed the People (V) - Distribute aid freely, drain military supplies
 * - Controlled Rationing (P) - Fair compensation and allocation
 * - Prioritize Elite (R) - Military and leadership first, let poor suffer
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

export const foodShortagePipeline: CheckPipeline = {
  id: 'food-shortage',
  name: 'Food Shortage',
  description: 'Disease, weather, or pests destroy agricultural production.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you allocate scarce resources?',
    required: true,
    options: [
      {
        id: 'feed-people',
        label: 'Feed the People',
        description: 'Distribute aid freely, drain military supplies if needed',
        icon: 'fas fa-hand-holding-heart',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '2d4', 'negative'),
            textBadge('1 army gains sickened', 'fas fa-skull', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '2d4', 'negative'),
            textBadge('1 army rolls morale check', 'fas fa-person-falling-burst', 'negative')
          ]
        }
      },
      {
        id: 'rationing',
        label: 'Controlled Rationing',
        description: 'Fair compensation and systematic allocation',
        icon: 'fas fa-scale-balanced',
        skills: ['society', 'nature'],
        personality: { practical: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'prioritize-elite',
        label: 'Prioritize Elite',
        description: 'Military and leadership first, let the poor suffer',
        icon: 'fas fa-crown',
        skills: ['intimidation', 'warfare'],
        personality: { ruthless: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative'),
            diceBadge('Imprison {{value}} rioters', 'fas fa-handcuffs', '1d4', 'info')
          ],
          success: [
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '1d4', 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Lose {{value}} Food', 'fas fa-wheat-awn', '2d4', 'negative'),
            textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'nature', description: 'agricultural expertise' },
    { skill: 'survival', description: 'emergency measures' },
    { skill: 'diplomacy', description: 'coordinate relief' },
    { skill: 'society', description: 'systematic rationing' },
    { skill: 'intimidation', description: 'enforce order' },
    { skill: 'warfare', description: 'military logistics' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The crisis is managed effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The shortage is controlled.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'A severe shortage develops.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Famine threatens the kingdom.',
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
      const selectedOption = foodShortagePipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers and prepare game commands based on approach
      let modifiers: any[] = [];

      if (approach === 'feed-people') {
        // Feed the People (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // 1 army gains sickened - TODO: implement army condition handler
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // 1 army rolls morale check - TODO: implement army morale handler
        }
      } else if (approach === 'rationing') {
        // Controlled Rationing (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
        }
      } else if (approach === 'prioritize-elite') {
        // Prioritize Elite (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
          // Imprison rioters (convert unrest to imprisoned)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const commandContext: GameCommandContext = {
            actionId: 'food-shortage',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
          // Roll 1d4 for imprisoned count
          const roll = new Roll('1d4');
          await roll.evaluate({ async: true });
          const imprisonCount = roll.total || 1;
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: imprisonCount },
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
          modifiers = [
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const damageHandler = new DamageStructureHandler();
          const commandContext: GameCommandContext = {
            actionId: 'food-shortage',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
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
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }
          ];
          // Damage 1 structure
          const { DamageStructureHandler } = await import('../../services/gameCommands/handlers/DamageStructureHandler');
          const damageHandler = new DamageStructureHandler();
          const commandContext: GameCommandContext = {
            actionId: 'food-shortage',
            outcome: ctx.outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata || {}
          };
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
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame, food) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    // Execute game commands based on approach and outcome
    if (approach === 'prioritize-elite') {
      if (outcome === 'criticalSuccess') {
        const imprisonCommand = ctx.metadata?._preparedImprison;
        if (imprisonCommand?.commit) {
          await imprisonCommand.commit();
        }
      } else if (outcome === 'failure' || outcome === 'criticalFailure') {
        const damageCommand = ctx.metadata?._preparedDamageStructure;
        if (damageCommand?.commit) {
          await damageCommand.commit();
        }
      }
    }

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ['dangerous', 'ongoing'],
};
