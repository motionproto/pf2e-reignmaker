/**
 * Scholarly Discovery Event Pipeline (CHOICE-BASED)
 *
 * Researchers in your kingdom make an important academic breakthrough.
 *
 * Approaches:
 * - Open University (Virtuous) - Free education for all
 * - Funded Research (Practical) - Institutional research investment
 * - Exclusive Academy (Ruthless) - Elite-only education
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const scholarlyDiscoveryPipeline: CheckPipeline = {
  id: 'scholarly-discovery',
  name: 'Scholarly Discovery',
  description: 'Researchers in your kingdom make an important academic breakthrough.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you leverage this knowledge?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Open University',
        description: 'Free education for all citizens',
        icon: 'fas fa-university',
        skills: ['lore', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Universal education earns prestige and alliances.',
          success: 'Open access reduces tensions.',
          failure: 'Free education costs exceed benefits.',
          criticalFailure: 'Poor management wastes resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Funded Research',
        description: 'Invest in institutional research',
        icon: 'fas fa-flask',
        skills: ['lore', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Research yields ongoing innovations and revenue.',
          success: 'Investment generates profit.',
          failure: 'Research costs exceed returns.',
          criticalFailure: 'Failed projects waste significant resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exclusive Academy',
        description: 'Elite-only education with high tuition',
        icon: 'fas fa-crown',
        skills: ['society', 'diplomacy'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Elite education generates revenue and noble support.',
          success: 'Tuition provides profit.',
          failure: 'Elitism breeds resentment despite revenue.',
          criticalFailure: 'Exclusion angers citizens and damages reputation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'lore', description: 'historical research' },
    { skill: 'arcana', description: 'theoretical magic' },
    { skill: 'society', description: 'social sciences' },
    { skill: 'diplomacy', description: 'academic relations' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Discovery handled well.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Research has mixed results.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Handling causes problems.',
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

      const selectedOption = scholarlyDiscoveryPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'scholarly-discovery',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous') {
        if (outcome === 'criticalSuccess') {
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: 1, count: 2 },
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
        }
      } else if (approach === 'practical') {
        if (outcome === 'criticalSuccess') {
          ctx.metadata._ongoingInnovations = { formula: '2d3', duration: 2 };
        }
      } else if (approach === 'ruthless') {
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
        }
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    // Add ongoing innovations modifier (practical CS)
    if (ctx.metadata?._ongoingInnovations && approach === 'practical') {
      const innovations = ctx.metadata._ongoingInnovations;
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `scholarly-innovations-${Date.now()}`,
          name: 'Research Innovations',
          description: `Funded research yields ${innovations.formula} gold per turn from patents and grants.`,
          icon: 'fas fa-flask',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'scholarly-discovery',
          sourceName: 'Scholarly Discovery',
          startTurn: k.turn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: innovations.formula, duration: innovations.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
