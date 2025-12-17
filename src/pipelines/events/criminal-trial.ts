/**
 * Criminal Trial Event Pipeline (CHOICE-BASED)
 *
 * Authorities catch a notorious criminal - how will you administer justice?
 *
 * Approaches:
 * - Show Mercy (Religion/Diplomacy) - Compassion and forgiveness (Virtuous)
 * - Fair Trial (Society/Diplomacy) - Just and transparent (Practical)
 * - Harsh Punishment (Intimidation/Performance) - Deter future crime (Ruthless)
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { ReduceImprisonedHandler } from '../../services/gameCommands/handlers/ReduceImprisonedHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

export const criminalTrialPipeline: CheckPipeline = {
  id: 'criminal-trial',
  name: 'Criminal Trial',
  description: 'Authorities catch a notorious criminal or resolve a major injustice.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you administer justice?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Show Mercy',
        description: 'Demonstrate compassion and forgiveness',
        icon: 'fas fa-dove',
        skills: ['religion', 'diplomacy', 'performance', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Redemptive justice inspires reformation; pardoned criminals become model citizens.',
          success: 'Merciful sentences restore balance; pardoned souls embrace second chances.',
          failure: 'Unearned leniency emboldens the criminal underworld.',
          criticalFailure: 'Misplaced mercy ignites fury among victims and lawful folk alike.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Pardon {{value}} prisoners', 'fas fa-dove', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Pardon {{value}} prisoners', 'fas fa-dove', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4+1', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Fair Trial',
        description: 'Ensure justice is served fairly and transparently',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'diplomacy', 'nature', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Impeccable legal proceedings set precedent; justice system earns renown.',
          success: 'Balanced verdict satisfies law and conscience; order is maintained.',
          failure: 'Legal technicalities delay justice; public confidence wavers.',
          criticalFailure: 'Procedural chaos allows criminals to exploit loopholes and escape.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Harsh Punishment',
        description: 'Make an example to deter future crime',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'performance', 'deception', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Brutal spectacle terrifies criminals into submission; dissidents vanish into cells.',
          success: 'Savage sentences send clear warning; fear silences the underworld.',
          failure: 'Excessive cruelty breeds resentment; innocents suffer collateral harm.',
          criticalFailure: 'Tyrannical verdict outrages citizens; innocent blood stains your justice.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'legal proceedings' },
    { skill: 'diplomacy', description: 'public ceremony' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'performance', description: 'public demonstration' },
    { skill: 'religion', description: 'moral guidance' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach to justice proves exemplary.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Justice is served appropriately.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Your approach encounters complications.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your handling of justice backfires.',
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
      const selectedOption = criminalTrialPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers based on approach
      let modifiers: any[] = [];

      if (approach === 'virtuous') {
        // Show Mercy (Virtuous)
        const commandContext: GameCommandContext = {
          actionId: 'criminal-trial',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };

        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
          // Remove 1d3 imprisoned (pardoned) - auto-distributes across settlements
          const reduceHandler = new ReduceImprisonedHandler();
          const reduceCommand = await reduceHandler.prepare(
            { type: 'reduceImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (reduceCommand) {
            ctx.metadata._preparedReduceImprisoned = reduceCommand;
            if (reduceCommand.outcomeBadges) {
              outcomeBadges.push(...reduceCommand.outcomeBadges);
            } else if (reduceCommand.outcomeBadge) {
              outcomeBadges.push(reduceCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          // Remove 1 imprisoned (pardoned) - auto-distributes across settlements
          const reduceHandler = new ReduceImprisonedHandler();
          const reduceCommand = await reduceHandler.prepare(
            { type: 'reduceImprisoned', amount: 1 },
            commandContext
          );
          if (reduceCommand) {
            ctx.metadata._preparedReduceImprisoned = reduceCommand;
            if (reduceCommand.outcomeBadges) {
              outcomeBadges.push(...reduceCommand.outcomeBadges);
            } else if (reduceCommand.outcomeBadge) {
              outcomeBadges.push(reduceCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' }
          ];
        }
      } else if (approach === 'practical') {
        // Fair Trial (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' }
          ];
        }
      } else if (approach === 'ruthless') {
        // Harsh Punishment (Ruthless)
        const commandContext: GameCommandContext = {
          actionId: 'criminal-trial',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };

        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison 1d3 dissidents (convert unrest to imprisoned)
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
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
          // Imprison 1d2 dissidents
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
        } else if (outcome === 'failure') {
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              // Remove static "innocents harmed" badge
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('innocents harmed'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...imprisonCommand.outcomeBadges);
            }
          }
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d2', duration: 'immediate' }
          ];
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              // Remove static "innocents harmed" badge
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('innocents harmed'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...imprisonCommand.outcomeBadges);
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
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Execute imprisonment (harsh approach - success/critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute reduce imprisoned (mercy approach - success/critical success)
    const reduceCommand = ctx.metadata?._preparedReduceImprisoned;
    if (reduceCommand?.commit) {
      await reduceCommand.commit();
    }

    // Execute innocent imprisonment (ruthless F/CF - adds imprisoned without reducing unrest)
    const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
    if (addImprisonedCommand?.commit) {
      await addImprisonedCommand.commit();
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
