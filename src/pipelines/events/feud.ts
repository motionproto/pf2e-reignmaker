/**
 * Feud Event Pipeline (CHOICE-BASED)
 *
 * Two prominent families are engaged in a bitter feud.
 * Players choose their approach, which determines available skills and outcome modifiers.
 *
 * Approaches:
 * - Mediate Peacefully (Diplomacy/Society/Religion) - Peaceful resolution (Virtuous)
 * - Manipulate Outcome (Deception/Stealth/Thievery) - Cunning resolution (Practical)
 * - Force Compliance (Intimidation/Performance/Athletics) - Authoritarian approach (Ruthless)
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const feudPipeline: CheckPipeline = {
  id: 'feud',
  name: 'Feud',
  description: 'Two prominent families are engaged in a bitter feud that threatens to tear the community apart.',
  checkType: 'event',
  tier: 1,

  // Event strategic choice: How will you handle the feud?
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you handle the feud?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Mediate Peacefully',
        description: 'Use diplomacy to bring the families together',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        },
        outcomeDescriptions: {
          criticalSuccess: 'Patient wisdom heals old wounds; former enemies embrace as allies.',
          success: 'Compassionate mediation bridges the divide; peace is restored.',
          failure: 'Stubborn pride rejects reconciliation; tensions remain.',
          criticalFailure: 'Naive diplomacy insults both families; violence escalates.'
        }
      },
      {
        id: 'practical',
        label: 'Manipulate Outcome',
        description: 'Use deception to secretly resolve the feud',
        icon: 'fas fa-mask',
        skills: ['deception', 'stealth', 'thievery', 'applicable lore'],
        personality: { practical: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d2', 'positive')
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
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ]
        },
        outcomeDescriptions: {
          criticalSuccess: 'Brilliant schemes unite families without them realizing they were manipulated.',
          success: 'Subtle machinations dissolve tensions while preserving appearances.',
          failure: 'Exposed deception damages trust; both families turn hostile.',
          criticalFailure: 'Catastrophic failure reveals your schemes; united in fury against you.'
        }
      },
      {
        id: 'ruthless',
        label: 'Force Compliance',
        description: 'Use authority and intimidation to end the conflict',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'performance', 'athletics', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '2d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Imprison {{value}} dissidents', 'fas fa-user-lock', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ],
          criticalFailure: [
            textBadge('1 structure damaged', 'fa-house-crack', 'negative'),
            diceBadge('{{value}} innocents imprisoned', 'fas fa-user-slash', '1d2', 'negative')
          ]
        },
        outcomeDescriptions: {
          criticalSuccess: 'Overwhelming force crushes resistance; terrified families submit utterly.',
          success: 'Brutal intimidation silences the feud; fear enforces compliance.',
          failure: 'Heavy-handed tactics ignite greater resentment and defiance.',
          criticalFailure: 'Violent crackdown sparks riots; buildings burn as families unite against tyranny.'
        }
      }
    ]
  },

  // Base skills (filtered by choice)
  skills: [
    { skill: 'diplomacy', description: 'mediate between families' },
    { skill: 'society', description: 'understand social dynamics' },
    { skill: 'religion', description: 'appeal to shared faith' },
    { skill: 'intimidation', description: 'threaten consequences' },
    { skill: 'performance', description: 'public display of authority' },
    { skill: 'athletics', description: 'show of physical force' },
    { skill: 'deception', description: 'manipulate both sides' },
    { skill: 'stealth', description: 'work behind the scenes' },
    { skill: 'thievery', description: 'plant evidence or steal items' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach succeeds brilliantly.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Your approach resolves the situation.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'The feud worsens despite your efforts.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach backfires catastrophically.',
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
      const selectedOption = feudPipeline.strategicChoice?.options.find(opt => opt.id === approach);

      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'feud',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        // Mediate Peacefully (Virtuous)
        if (outcome === 'criticalSuccess') {
          // Adjust 2 random factions +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, factionId: 'random', count: 2 },
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
      } else if (approach === 'practical') {
        // Manipulate Outcome (Practical)
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
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Army becomes fatigued
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'fatigued', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            const filtered = outcomeBadges.filter(b => !b.template?.includes('army becomes Fatigued'));
            outcomeBadges.length = 0;
            outcomeBadges.push(...filtered, ...(armyCmd.outcomeBadges || []));
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
      } else if (approach === 'ruthless') {
        // Force Compliance (Ruthless)
        if (outcome === 'criticalSuccess') {
          // Imprison 2d3 dissidents (convert unrest to imprisoned)
          const imprisonHandler = new ConvertUnrestToImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'convertUnrestToImprisoned', amount: 6, diceFormula: '2d3' },
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
        } else if (outcome === 'criticalFailure') {
          // Add structure damage for force + critical failure
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

          // Imprison innocents (increase imprisoned WITHOUT reducing unrest)
          const addImprisonedHandler = new AddImprisonedHandler();
          const imprisonCommand = await addImprisonedHandler.prepare(
            { type: 'addImprisoned', amount: 2, diceFormula: '1d2' },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedAddImprisoned = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              // Preserve existing badges (like structure damage) and add imprisonment badges
              outcomeBadges.push(...imprisonCommand.outcomeBadges);
            }
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  // Execute the prepared commands
  execute: async (ctx) => {
    // NOTE: Standard modifiers (unrest, gold, fame) are applied automatically by
    // ResolutionDataBuilder + GameCommandsService via outcomeBadges.
    // This execute() only handles special game commands.

    // Apply army condition (practical CF)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    // Execute faction adjustment (manipulate approach)
    const factionCommand = ctx.metadata?._preparedFaction;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Execute imprisonment (force approach - critical success)
    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Execute structure damage (force approach - critical failure)
    const damageCommand = ctx.metadata?._preparedDamageStructure;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    // Execute innocent imprisonment (ruthless CF - adds imprisoned without reducing unrest)
    const addImprisonedCommand = ctx.metadata?._preparedAddImprisoned;
    if (addImprisonedCommand?.commit) {
      await addImprisonedCommand.commit();
    }

    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
