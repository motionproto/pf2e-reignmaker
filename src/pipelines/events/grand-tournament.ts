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
import { AddImprisonedHandler } from '../../services/gameCommands/handlers/AddImprisonedHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

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
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative'),
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative')
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
            textBadge('Gain 1 structure', 'fas fa-building', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Damage 1 structure', 'fas fa-house-crack', 'negative')
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
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          success: [
            textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')
          ],
          failure: [
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative'),
            valueBadge('{{value}} innocents harmed', 'fas fa-user-injured', 1, 'negative')
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

      const PLAYER_KINGDOM = 'player';

      // All approaches CS: Gain 1 random structure
      if (outcome === 'criticalSuccess') {
        ctx.metadata._awardStructure = true;
      }

      // Virtuous approach: faction adjustments
      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
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
        }
      }

      // Practical approach: faction adjustments
      if (approach === 'practical') {
        if (outcome === 'criticalSuccess' || outcome === 'success') {
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
        } else if (outcome === 'failure' || outcome === 'criticalFailure') {
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
        // Well Trained bonus for CS and Success
        if (outcome === 'criticalSuccess' || outcome === 'success') {
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyWellTrained = { actorId: randomArmy.actorId };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Well Trained'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Well Trained (+1 saves)`,
                'fas fa-star',
                'positive'
              );
            }
          }
        }

        // Fatigued condition for Failure and CF
        if (outcome === 'failure' || outcome === 'criticalFailure') {
          const playerArmies = kingdom.armies?.filter((a: any) => a.ledBy === PLAYER_KINGDOM && a.actorId) || [];
          if (playerArmies.length > 0) {
            const randomArmy = playerArmies[Math.floor(Math.random() * playerArmies.length)];
            ctx.metadata._armyCondition = { actorId: randomArmy.actorId, condition: 'fatigued', value: 1 };
            
            const armyBadgeIndex = outcomeBadges.findIndex(b => b.template?.includes('army becomes Fatigued'));
            if (armyBadgeIndex >= 0) {
              outcomeBadges[armyBadgeIndex] = textBadge(
                `${randomArmy.name} becomes Fatigued`,
                'fas fa-tired',
                'negative'
              );
            }
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
    // Virtuous approach faction adjustments
    const factionVirtuousCS = ctx.metadata?._preparedFactionVirtuousCS;
    if (factionVirtuousCS?.commit) {
      await factionVirtuousCS.commit();
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

    // Apply army condition (Fatigued)
    const armyCondition = ctx.metadata?._armyCondition;
    if (armyCondition?.actorId) {
      const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
      await applyArmyConditionExecution(armyCondition.actorId, armyCondition.condition, armyCondition.value);
    }

    // Apply Well Trained bonus
    const wellTrained = ctx.metadata?._armyWellTrained;
    if (wellTrained?.actorId) {
      const actor = game.actors?.get(wellTrained.actorId);
      if (actor) {
        const currentBonus = (actor.getFlag('pf2e-reignmaker', 'wellTrainedBonus') as number) || 0;
        await actor.setFlag('pf2e-reignmaker', 'wellTrainedBonus', currentBonus + 1);
        ui.notifications?.info(`${actor.name} gains +1 to saves (Well Trained bonus)`);
      }
    }

    // Award structure (CS for all approaches)
    if (ctx.metadata?._awardStructure) {
      // TODO: Implement random structure award
      console.log('Grand Tournament: Random structure award needs implementation');
    }

    return { success: true };
  },

  traits: ['beneficial'],
};
