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
        label: 'Free Celebration',
        description: 'Open celebration for all citizens',
        icon: 'fas fa-users',
        skills: ['performance', 'athletics'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Free event creates legendary community spirit and structure.',
          success: 'Citizens celebrate together. Unity achieved.',
          failure: 'Free event costs exceed benefits.',
          criticalFailure: 'Poor organization wastes resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Gain 1 random structure', 'fas fa-building', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Organized Event',
        description: 'Entry fees with prizes and organized competition',
        icon: 'fas fa-trophy',
        skills: ['athletics', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Perfect balance of profit and spectacle. Structure awarded.',
          success: 'Well-run event generates profit.',
          failure: 'Break-even event with modest revenue.',
          criticalFailure: 'Accidents create unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            textBadge('Gain 1 random structure', 'fas fa-building', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exclusive Affair',
        description: 'Noble-only event with high stakes',
        icon: 'fas fa-crown',
        skills: ['diplomacy', 'performance'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Nobles shower gold. Exquisite structure built.',
          success: 'Exclusive event generates revenue.',
          failure: 'Revenue offset by angry commons.',
          criticalFailure: 'Elitism sparks protests and property damage.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            textBadge('Gain 1 random structure', 'fas fa-building', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
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

      // All approaches CS: Gain 1 random structure
      if (outcome === 'criticalSuccess') {
        ctx.metadata._awardStructure = true;
      }

      // Ruthless approach: faction adjustments
      if (approach === 'ruthless') {
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
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    const damageCommand = ctx.metadata?._preparedDamage;
    if (damageCommand?.commit) {
      await damageCommand.commit();
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
