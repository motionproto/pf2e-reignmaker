/**
 * Grand Tournament Event Pipeline (CHOICE-BASED)
 *
 * A martial competition draws competitors from across the realm.
 *
 * Approaches:
 * - Free Celebration (Virtuous) - Open to all citizens
 * - Organized Event (Practical) - Entry fees and prizes
 * - Exclusive Affair (Ruthless) - Noble-only high stakes event
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { DamageStructureHandler } from '../../services/gameCommands/handlers/DamageStructureHandler';
import { GrantStructureHandler } from '../../services/gameCommands/handlers/GrantStructureHandler';
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
import { valueBadge, diceBadge, genericStructureDamaged, genericArmyConditionPositive, genericGrantStructure } from '../../types/OutcomeBadge';

export const grandTournamentPipeline: CheckPipeline = {
  id: 'grand-tournament',
  name: 'Grand Tournament',
  description: 'A martial competition draws competitors from across the realm.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you capitalize on this event?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Free Celebrations',
        description: 'Open celebration for all citizens',
        icon: 'fas fa-users',
        skills: ['performance', 'athletics', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Free games unite the realm; joy echoes in every heart.',
          success: 'Open celebration inspires pride and loyalty.',
          failure: 'Crowds overwhelm facilities; property damaged.',
          criticalFailure: 'Chaos and vandalism mar the festivities.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          failure: [
            genericStructureDamaged(1)
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Organized Event',
        description: 'Entry fees with prizes and organized competition',
        icon: 'fas fa-trophy',
        skills: ['athletics', 'society', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Perfect event attracts permanent arena construction.',
          success: 'Entry fees and wagers generate healthy profit.',
          failure: 'Costs exceed revenues; organizers disappointed.',
          criticalFailure: 'Accidents tarnish reputation and damage grounds.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            genericGrantStructure(1)
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exclusive Affair',
        description: 'Noble-only event with high stakes',
        icon: 'fas fa-crown',
        skills: ['diplomacy', 'performance', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Elite nobles compete; winning troops gain prestige.',
          success: 'Exclusive bouts sharpen military skills.',
          failure: 'Commons resent exclusion; troops exhausted.',
          criticalFailure: 'Riots erupt outside locked gates; casualties mount.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            genericArmyConditionPositive('Well Trained')
          ],
          success: [
            genericArmyConditionPositive('Well Trained')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'athletics', description: 'strength competitions' },
    { skill: 'acrobatics', description: 'agility contests' },
    { skill: 'performance', description: 'pageantry and ceremonies' },
    { skill: 'society', description: 'organize event' },
    { skill: 'diplomacy', description: 'noble relations' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Tournament concludes successfully.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Tournament has mixed results.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Tournament causes problems.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
  },

  preview: {
    calculate: async (ctx) => {
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;

      const selectedOption = grandTournamentPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'grand-tournament',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      // Virtuous approach: structure effects and faction adjustments
      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
          // Grant structure
          const structureHandler = new GrantStructureHandler();
          const structureCommand = await structureHandler.prepare(
            { type: 'grantStructure' },
            commandContext
          );
          if (structureCommand) {
            ctx.metadata._preparedStructure = structureCommand;
            if (structureCommand.outcomeBadges) {
              outcomeBadges.push(...structureCommand.outcomeBadges);
            }
          }
          // Faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
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
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          // Damage 1 structure
          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamageVirtuous = damageCommand;
            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
            }
          }
        }
      }

      // Practical approach: structure effects and faction adjustments
      if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          // Grant structure
          const structureHandler = new GrantStructureHandler();
          const structureCommand = await structureHandler.prepare(
            { type: 'grantStructure' },
            commandContext
          );
          if (structureCommand) {
            ctx.metadata._preparedStructure = structureCommand;
            if (structureCommand.outcomeBadges) {
              outcomeBadges.push(...structureCommand.outcomeBadges);
            }
          }
          // Faction +1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPractical = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'success') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPractical = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'failure') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPracticalNeg = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
          // Damage 1 structure
          const damageHandler = new DamageStructureHandler();
          const damageCommand = await damageHandler.prepare(
            { type: 'damageStructure', count: 1 },
            commandContext
          );
          if (damageCommand) {
            ctx.metadata._preparedDamagePractical = damageCommand;
            if (damageCommand.outcomeBadges) {
              outcomeBadges.push(...damageCommand.outcomeBadges);
            } else if (damageCommand.outcomeBadge) {
              outcomeBadges.push(damageCommand.outcomeBadge);
            }
          }
          // Faction -1
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', steps: -1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionPracticalNeg = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        }
      }

      // Ruthless approach: army effects and faction adjustments
      if (approach === 'ruthless') {
        // Army conditions based on outcome
        if (outcome === 'criticalSuccess') {
          // Grant structure
          const structureHandler = new GrantStructureHandler();
          const structureCommand = await structureHandler.prepare(
            { type: 'grantStructure' },
            commandContext
          );
          if (structureCommand) {
            ctx.metadata._preparedStructure = structureCommand;
            if (structureCommand.outcomeBadges) {
              outcomeBadges.push(...structureCommand.outcomeBadges);
            }
          }
          // Well Trained bonus
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            if (armyCmd.outcomeBadges) {
              outcomeBadges.push(...armyCmd.outcomeBadges);
            }
          }
        } else if (outcome === 'success') {
          // Well Trained bonus
          const armyHandler = new ApplyArmyConditionHandler();
          const armyCmd = await armyHandler.prepare(
            { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
            commandContext
          );
          if (armyCmd) {
            ctx.metadata._preparedArmyCondition = armyCmd;
            if (armyCmd.outcomeBadges) {
              outcomeBadges.push(...armyCmd.outcomeBadges);
            }
          }
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
          // Fatigued condition
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
        }

        if (outcome === 'criticalSuccess') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: 1, count: 1 },
            commandContext
          );
          if (factionCommand) {
            ctx.metadata._preparedFactionAdjust = factionCommand;
            if (factionCommand.outcomeBadges) {
              outcomeBadges.push(...factionCommand.outcomeBadges);
            } else if (factionCommand.outcomeBadge) {
              outcomeBadges.push(factionCommand.outcomeBadge);
            }
          }
        } else if (outcome === 'criticalFailure') {
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

          // Innocents harmed - add imprisoned without reducing unrest
          const imprisonHandler = new AddImprisonedHandler();
          const imprisonCommand = await imprisonHandler.prepare(
            { type: 'addImprisoned', amount: 1 },
            commandContext
          );
          if (imprisonCommand) {
            ctx.metadata._preparedImprison = imprisonCommand;
            if (imprisonCommand.outcomeBadges) {
              // Remove static "innocents harmed" badge
              const filteredBadges = outcomeBadges.filter(b => !b.template?.includes('innocents harmed'));
              outcomeBadges.length = 0;
              outcomeBadges.push(...filteredBadges, ...imprisonCommand.outcomeBadges);
            }
          }
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // Grant structure (all approaches CS)
    const structureCommand = ctx.metadata?._preparedStructure;
    if (structureCommand?.commit) {
      await structureCommand.commit();
    }

    // Virtuous approach faction adjustments
    const factionVirtuousCS = ctx.metadata?._preparedFactionVirtuousCS;
    if (factionVirtuousCS?.commit) {
      await factionVirtuousCS.commit();
    }

    // Damage structure (virtuous F/CF)
    const damageVirtuous = ctx.metadata?._preparedDamageVirtuous;
    if (damageVirtuous?.commit) {
      await damageVirtuous.commit();
    }

    // Practical approach faction adjustments
    const factionPractical = ctx.metadata?._preparedFactionPractical;
    if (factionPractical?.commit) {
      await factionPractical.commit();
    }

    const factionPracticalNeg = ctx.metadata?._preparedFactionPracticalNeg;
    if (factionPracticalNeg?.commit) {
      await factionPracticalNeg.commit();
    }

    // Damage structure (practical CF)
    const damagePractical = ctx.metadata?._preparedDamagePractical;
    if (damagePractical?.commit) {
      await damagePractical.commit();
    }

    // Ruthless approach faction adjustments
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
    }

    const imprisonCommand = ctx.metadata?._preparedImprison;
    if (imprisonCommand?.commit) {
      await imprisonCommand.commit();
    }

    // Apply army condition (Well Trained or Fatigued)
    const armyCommand = ctx.metadata?._preparedArmyCondition;
    if (armyCommand?.commit) {
      await armyCommand.commit();
    }

    return { success: true };
  },

  traits: ['beneficial'],
};
