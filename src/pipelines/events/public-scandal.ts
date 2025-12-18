/**
 * Public Scandal Event Pipeline (CHOICE-BASED)
 *
 * A leader is implicated in an embarrassing or criminal situation.
 * How will you handle it?
 *
 * Approaches:
 * - Transparent Investigation (Society/Diplomacy) - Honest and open (Virtuous)
 * - Cover It Up (Deception/Stealth) - Suppress quietly (Practical)
 * - Scapegoat Official (Intimidation/Deception) - Blame subordinate (Ruthless)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, textBadge, diceBadge } from '../../types/OutcomeBadge';

export const publicScandalPipeline: CheckPipeline = {
  id: 'public-scandal',
  name: 'Public Scandal',
  description: 'A leader is implicated in an embarrassing or criminal situation.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you handle the scandal?
  strategicChoice: {
    label: 'How will you handle the scandal?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Transparent Response',
        description: 'Publicly investigate and reveal the truth',
        icon: 'fas fa-search',
        skills: ['society', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Honesty transforms scandal into triumph; extra action granted.',
          success: 'Truth earns respect and unexpected donations.',
          failure: 'Investigation drags on; costs and tensions mount.',
          criticalFailure: 'Revelations expose deeper corruption.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 kingdom action', 'fas fa-plus-circle', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Manage Narrative',
        description: 'Suppress the scandal quietly',
        icon: 'fas fa-user-secret',
        skills: ['deception', 'stealth', 'performance', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Evidence vanishes without trace; silence purchased.',
          success: 'Whispers fade as bribes work their magic.',
          failure: 'Cover-up unravels; the truth emerges anyway.',
          criticalFailure: 'Failed bribes enrage multiple factions.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Suppress Story',
        description: 'Blame a subordinate to protect the crown',
        icon: 'fas fa-user-slash',
        skills: ['intimidation', 'deception', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Scapegoat succeeds; military uses scandal as training.',
          success: 'Subordinate takes fall; matter quietly closed.',
          failure: 'Obvious framing fools no one.',
          criticalFailure: 'Cruel injustice outrages all who witness it.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('{{value}} innocents harmed', 'fas fa-user-injured', '1d4', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'investigate publicly' },
    { skill: 'diplomacy', description: 'public apology' },
    { skill: 'deception', description: 'cover up' },
    { skill: 'stealth', description: 'work in secret' },
    { skill: 'intimidation', description: 'silence critics' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your handling of the scandal is masterful.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The scandal is contained effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The scandal damages your reputation.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach makes the scandal worse.',
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
      const selectedOption = publicScandalPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Calculate modifiers based on approach
      let modifiers: any[] = [];
      
      const commandContext: GameCommandContext = {
        actionId: 'public-scandal',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Transparent Investigation approach - Honest and open (Virtuous)
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
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          
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
      } else if (approach === 'practical') {
        // Cover It Up approach - Suppress quietly (Practical)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          
          // Innocents harmed - add imprisoned without reducing unrest
          const imprisonHandler = new AddImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'addImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedInnocentsHarmed = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            } else if (imprisonCommand.outcomeBadge) {
              outcomeBadges.push(imprisonCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '1d3', duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
            { type: 'dice', resource: 'gold', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
          
          // Adjust 2 random factions -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, factionId: 'random', count: 2 },
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
        // Scapegoat Official approach - Blame subordinate (Ruthless)
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'dice', resource: 'unrest', formula: '-1d3', negative: true, duration: 'immediate' }
          ];
          // Imprison 1d2 scapegoats (convert unrest to imprisoned)
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
          
          // Adjust 1 random faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random' },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFaction = factionCommand;
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
          // Imprison 1 scapegoat
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 1 },
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
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
          
          // Innocents harmed - add imprisoned without reducing unrest
          const imprisonHandler = new AddImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'addImprisoned', amount: 3, diceFormula: '1d3' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedInnocentsHarmed = imprisonCommand;
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
          
          // Innocents harmed - add imprisoned without reducing unrest
          const imprisonHandler = new AddImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'addImprisoned', amount: 4, diceFormula: '1d4' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedInnocentsHarmed = imprisonCommand;
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
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
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

    // Execute imprisonment (scapegoat approach - success/critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute innocents harmed (failure/critical failure)
    const innocentsHarmedCommand = ctx.metadata?._preparedInnocentsHarmed;
    if (innocentsHarmedCommand?.commit) {
      await innocentsHarmedCommand.commit();
    }

    // Execute faction adjustment
    const factionCommand = ctx.metadata?._preparedFaction;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous"],
};
