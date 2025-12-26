/**
 * Inquisition Event Pipeline (CHOICE-BASED)
 *
 * Zealots mobilize against a minority group - how will you respond?
 *
 * Approaches:
 * - Protect the Accused (Diplomacy/Society) - Stand against persecution (Virtuous)
 * - Stay Neutral (Society/Deception) - Pragmatic avoidance (Practical)
 * - Support Inquisitors (Religion/Intimidation) - Theocratic authority (Ruthless)
 *
 * Rebalanced to follow EVENT_MIGRATION_STATUS.md guidelines
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';

export const inquisitionPipeline: CheckPipeline = {
  id: 'inquisition',
  name: 'Inquisition',
  description: 'Zealots mobilize against a minority group or belief.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you respond to the inquisition?
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you respond to the inquisition?',
    required: true,
    options: [
      {
        id: 'idealist',
        label: 'Protect the Accused',
        description: 'Stand against persecution',
        icon: 'fas fa-shield-alt',
        skills: ['diplomacy', 'society', 'medicine', 'applicable lore'],
        personality: { idealist: 4 },
        outcomeDescriptions: {
          criticalSuccess: 'Brave defiance vindicates innocents; grateful refugees enrich the realm.',
          success: 'Principled protection ends hysteria; justice prevails over fear.',
          failure: 'Zealots brand you heretic-lover; angry mobs gather strength.',
          criticalFailure: 'Furious inquisitors incite riots; persecution escalates wildly.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Formal Investigation',
        description: 'Conduct a proper investigation',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'deception', 'occultism', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Diplomatic balance satisfies all; grateful factions offer tribute.',
          success: 'Careful mediation quells hysteria; thankful moderates pay tribute.',
          failure: 'Fence-sitting earns scorn from zealots and victims alike.',
          criticalFailure: 'Craven inaction enrages both sides; chaos consumes all.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
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
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Support Inquisitors',
        description: 'Endorse the hunt for heresy',
        icon: 'fas fa-fire',
        skills: ['religion', 'intimidation', 'athletics', 'applicable lore'],
        personality: { ruthless: 4 },
        outcomeDescriptions: {
          criticalSuccess: 'Merciless purge seizes assets and eliminates troublemakers.',
          success: 'Brutal efficiency imprisons dissidents and secures order.',
          failure: 'Savage persecution horrifies neighbors; innocents suffer needlessly.',
          criticalFailure: 'Atrocities shock the civilized world; allies turn away in disgust.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'religion', description: 'theological debate' },
    { skill: 'intimidation', description: 'suppress dissent' },
    { skill: 'diplomacy', description: 'protect victims' },
    { skill: 'society', description: 'mediate conflict' },
    { skill: 'deception', description: 'avoid commitment' },
    { skill: 'medicine', description: 'treat persecuted victims' },
    { skill: 'occultism', description: 'detect magical heresies' },
    { skill: 'athletics', description: 'enforce inquisition' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your response succeeds brilliantly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The situation resolves according to your approach.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The persecution continues despite your efforts.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach sparks violence.',
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
      const selectedOption = inquisitionPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'inquisition',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'idealist') {
        // Protect the Accused (Virtuous)
        if (outcome === 'criticalSuccess') {
          // Adjust 1 random faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              // Remove generic badge and add specific one
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          // Adjust 1 random faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          // Adjust 1 random faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, factionCommand.outcomeBadge);
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
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, factionCommand.outcomeBadge);
            }
          }
        }
      } else if (approach === 'ruthless') {
        // Support Inquisitors (Ruthless)
        const commandContext: GameCommandContext = {
          actionId: 'inquisition',
          outcome: ctx.outcome,
          kingdom: ctx.kingdom,
          metadata: ctx.metadata || {}
        };

        if (outcome === 'criticalSuccess') {
          // Imprison 1d3 heretics (convert unrest to imprisoned)
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const roll = new Roll('1d3');
          await roll.evaluate();
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
          
          // Adjust 1 random faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          // Imprison 1d2 heretics
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const roll = new Roll('1d2');
          await roll.evaluate();
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
          // Innocents harmed (add imprisoned without reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', diceFormula: '1d3' },
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
          // Innocents harmed (add imprisoned without reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', diceFormula: '1d3' },
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
          
          // Adjust 1 random faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
            if (factionCommand.outcomeBadges) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              const filteredBadges = outcomeBadges.filter(b => !b.template?.match(/^Adjust \d+ faction [+-]\d+$/));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, factionCommand.outcomeBadge);
            }
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

    // Execute imprisonment (support approach - success/critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute innocent imprisonment (ruthless F/CF - adds imprisoned without reducing unrest)
    const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
    if (addImprisonedCommand?.commit) {
      await addImprisonedCommand.commit();
    }

    // Execute faction adjustment (idealist/ruthless approaches)
    const factionCommand = ctx.metadata?._preparedFaction;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
