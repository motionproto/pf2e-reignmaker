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
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';

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
        id: 'virtuous',
        label: 'Public Investigation',
        description: 'Protect the leader but maintain transparent rule',
        icon: 'fas fa-landmark',
        skills: ['diplomacy', 'society', 'medicine', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Public vigilance captures assassin; transparency forges unbreakable trust.',
          success: 'Open governance reassures citizens; calm resolve foils plot.',
          failure: 'Exploited openness allows injury; guards arrive too late.',
          criticalFailure: 'Stubborn refusal of protection leaves leader gravely wounded.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative'),
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Secret Investigation',
        description: 'Increase security and hunt down conspirators',
        icon: 'fas fa-magnifying-glass',
        skills: ['stealth', 'survival', 'arcana', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Brilliant sleuthing unravels entire conspiracy; all traitors seized.',
          success: 'Methodical security upgrades quietly neutralize the threat.',
          failure: 'Expensive investigation yields little; innocents wrongly accused.',
          criticalFailure: 'Wasteful inquiry bleeds coffers while assassins still lurk.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            valueBadge('{{value}} innocents harmed', 'fas fa-user-injured', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Mass Arrests',
        description: 'Launch a ruthless crackdown on all suspects',
        icon: 'fas fa-skull',
        skills: ['intimidation', 'warfare', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Merciless purge crushes conspiracy; seized assets fill dungeons.',
          success: 'Brutal crackdown imprisons suspects and terrifies plotters.',
          failure: 'Savage overreach jails innocents; resentment festers in shadows.',
          criticalFailure: 'Tyrannical purge creates martyrs and outrages the realm.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d3', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
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
    { skill: 'arcana', description: 'detect magical threats' },
    { skill: 'athletics', description: 'subdue suspects' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your security response proves ideal.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The threat is neutralized appropriately.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Security concerns remain.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your response creates new dangers.',
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

      if (approach === 'virtuous') {
        // Open Governance (Virtuous)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Adjust 1 faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionVirtuous = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
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
      } else if (approach === 'practical') {
        // Investigate Thoroughly (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison conspirators - handler will be called during execution
          ctx.metadata._imprisonAmount = 3;
          ctx.metadata._imprisonFormula = '1d3';
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
            ctx.metadata._preparedSpendActionPractical = actionCommand;
            if (actionCommand.outcomeBadges) {
              outcomeBadges.push(...actionCommand.outcomeBadges);
            } else if (actionCommand.outcomeBadge) {
              outcomeBadges.push(actionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'ruthless') {
        // Purge Conspirators (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison conspirators (convert unrest to imprisoned)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
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
          // Imprison conspirators (1d2)
          const { ConvertUnrestToImprisonedHandler } = await import('../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler');
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
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 2, diceFormula: '1d2' },
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
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
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
          // Leader loses action
          const { SpendPlayerActionHandler } = await import('../../services/gameCommands/handlers/SpendPlayerActionHandler');
          const actionHandler = new SpendPlayerActionHandler();
          const actionCommand = await actionHandler.prepare(
            { type: 'spendPlayerAction', characterSelection: 'random' },
            commandContext
          );
          if (actionCommand) {
            ctx.metadata._preparedSpendActionRuthless = actionCommand;
            if (actionCommand.outcomeBadges) {
              outcomeBadges.push(...actionCommand.outcomeBadges);
            } else if (actionCommand.outcomeBadge) {
              outcomeBadges.push(actionCommand.outcomeBadge);
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

    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    // Execute game commands based on approach and outcome

    // Virtuous CS: Faction adjustment
    if (approach === 'virtuous' && outcome === 'criticalSuccess') {
      const factionCommand = ctx.metadata?._preparedFactionVirtuous;
      if (factionCommand?.commit) {
        await factionCommand.commit();
      }
    }

    // Virtuous CF: Spend action
    if (approach === 'virtuous' && outcome === 'criticalFailure') {
      const actionCommand = ctx.metadata?._preparedSpendAction;
      if (actionCommand?.commit) {
        await actionCommand.commit();
      }
    }

    // Practical CF: Spend action
    if (approach === 'practical' && outcome === 'criticalFailure') {
      const actionCommand = ctx.metadata?._preparedSpendActionPractical;
      if (actionCommand?.commit) {
        await actionCommand.commit();
      }
    }

    if ((approach === 'practical' || approach === 'ruthless') &&
        (outcome === 'criticalSuccess' || outcome === 'success')) {
      const imprisonCommand = ctx.metadata?._preparedImprison;
      if (imprisonCommand?.commit) {
        await imprisonCommand.commit();
      }
    }

    // Handle imprisoning innocents for purge failure/critical failure
    if (approach === 'ruthless' && (outcome === 'failure' || outcome === 'criticalFailure')) {
      const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
      if (addImprisonedCommand?.commit) {
        await addImprisonedCommand.commit();
      }
    }

    // Ruthless CF: Spend action
    if (approach === 'ruthless' && outcome === 'criticalFailure') {
      const actionCommand = ctx.metadata?._preparedSpendActionRuthless;
      if (actionCommand?.commit) {
        await actionCommand.commit();
      }
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
