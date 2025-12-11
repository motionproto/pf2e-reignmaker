/**
 * Assassination Attempt Event Pipeline (CHOICE-BASED)
 *
 * Someone attempts to kill one of your leaders.
 * How will you respond to protect the kingdom?
 *
 * Approaches:
 * - Open Governance (V) - Maintain transparency while protecting the leader
 * - Investigate Thoroughly (P) - Increase security and hunt conspirators
 * - Purge Conspirators (R) - Launch a ruthless crackdown
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

export const assassinationAttemptPipeline: CheckPipeline = {
  id: 'assassination-attempt',
  name: 'Assassination Attempt',
  description: 'Someone attempts to kill one of your leaders.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to the assassination attempt?',
    required: true,
    options: [
      {
        id: 'open-governance',
        label: 'Open Governance',
        description: 'Protect the leader but maintain transparent rule',
        icon: 'fas fa-landmark',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold (medical)', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative'),
            textBadge('1 leader loses their action', 'fas fa-user-injured', 'negative')
          ]
        }
      },
      {
        id: 'investigate',
        label: 'Investigate Thoroughly',
        description: 'Increase security and hunt down conspirators',
        icon: 'fas fa-magnifying-glass',
        skills: ['stealth', 'survival'],
        personality: { practical: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Imprison {{value}} conspirators', 'fas fa-handcuffs', '1d3', 'info')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'purge',
        label: 'Purge Conspirators',
        description: 'Launch a ruthless crackdown on all suspects',
        icon: 'fas fa-skull',
        skills: ['intimidation', 'warfare'],
        personality: { ruthless: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Imprison {{value}} conspirators', 'fas fa-handcuffs', '1d3', 'info')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Imprison {{value}} conspirators', 'fas fa-handcuffs', '1d2', 'info')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Imprison {{value}} innocents', 'fas fa-user-slash', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Imprison {{value}} innocents', 'fas fa-user-slash', '1d3', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'stealth', description: 'track the assassin' },
    { skill: 'intimidation', description: 'deter through fear' },
    { skill: 'medicine', description: 'survive wounds' },
    { skill: 'diplomacy', description: 'maintain public trust' },
    { skill: 'society', description: 'investigate conspirators' },
    { skill: 'survival', description: 'escape danger' },
    { skill: 'warfare', description: 'military crackdown' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The conspiracy is exposed and neutralized.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The attempt is foiled and your leader is safe.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Your leader narrowly escapes but the threat remains.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your leader is wounded and the situation spirals.',
      endsEvent: true,
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
      const selectedOption = assassinationAttemptPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers and prepare game commands based on approach
      let modifiers: any[] = [];
      const commandContext: GameCommandContext = {
        actionId: 'assassination-attempt',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'open-governance') {
        // Open Governance (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '2d3', negative: true, duration: 'immediate' }
          ];
          // Leader loses action
          const { SpendPlayerActionHandler } = await import('../../services/gameCommands/handlers/SpendPlayerActionHandler');
          const actionHandler = new SpendPlayerActionHandler();
          const actionCommand = await actionHandler.prepare(
            { type: 'spendPlayerAction', characterSelection: 'random' },
            commandContext
          );
          if (actionCommand) {
            ctx.metadata._preparedSpendAction = actionCommand;
            if (actionCommand.outcomeBadges) {
              outcomeBadges.push(...actionCommand.outcomeBadges);
            } else if (actionCommand.outcomeBadge) {
              outcomeBadges.push(actionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'investigate') {
        // Investigate Thoroughly (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison conspirators (convert unrest to imprisoned)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const roll = new Roll('1d3');
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
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '2d3', negative: true, duration: 'immediate' }
          ];
        }
      } else if (approach === 'purge') {
        // Purge Conspirators (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison conspirators (convert unrest to imprisoned)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const roll = new Roll('1d3');
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
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          // Imprison conspirators (1d2)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const roll = new Roll('1d2');
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
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          // This is a special case - we add to imprisoned but don't convert unrest
          ctx.metadata._imprisonInnocents = '1d2';
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          ctx.metadata._imprisonInnocents = '1d3';
        }
      }

      // Store modifiers in context for execute step
      ctx.metadata._outcomeModifiers = modifiers;

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
    const outcome = ctx.outcome;

    // Execute game commands based on approach and outcome
    if (approach === 'open-governance' && outcome === 'criticalFailure') {
      const actionCommand = ctx.metadata?._preparedSpendAction;
      if (actionCommand?.commit) {
        await actionCommand.commit();
      }
    }

    if ((approach === 'investigate' || approach === 'purge') &&
        (outcome === 'criticalSuccess' || outcome === 'success')) {
      const imprisonCommand = ctx.metadata?._preparedImprison;
      if (imprisonCommand?.commit) {
        await imprisonCommand.commit();
      }
    }

    // Handle imprisoning innocents for purge failure/critical failure
    // This would need a special handler that adds to imprisoned without reducing unrest
    // TODO: Implement innocent imprisonment (adds imprisoned without reducing unrest)

    // TODO: Track personality choice (Phase 4)
    // await personalityTracker.recordChoice(approach, personality);

    return { success: true };
  },

  traits: ["dangerous"],
};
