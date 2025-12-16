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
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
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
        skills: ['lore', 'diplomacy', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Free knowledge uplifts all; grateful scholars forge powerful alliances.',
          success: 'Open universities nurture minds; educated citizens embrace shared wisdom.',
          failure: 'Noble ideals strain budgets; expensive programs yield modest returns.',
          criticalFailure: 'Chaotic classrooms waste fortune; mismanaged education breeds frustration.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d4', 'positive')
          ],
          success: [
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d4', 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Funded Research',
        description: 'Invest in institutional research',
        icon: 'fas fa-flask',
        skills: ['lore', 'society', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Strategic funding sparks breakthrough innovations; patents fill coffers annually.',
          success: 'Measured investment pays dividends; practical research yields tangible gains.',
          failure: 'Cautious funding limits breakthroughs; modest expenses disappoint investors.',
          criticalFailure: 'Misallocated grants chase dead ends; failed experiments drain treasury.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d4', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exclusive Academy',
        description: 'Elite-only education with high tuition',
        icon: 'fas fa-crown',
        skills: ['society', 'diplomacy', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless exclusivity attracts wealthy elite; aristocratic fees enrich kingdom.',
          success: 'Premium tuition fills coffers; only privileged few access knowledge.',
          failure: 'Blatant elitism outrages common folk; gold cannot silence angry masses.',
          criticalFailure: 'Shameful gatekeeping sparks riots; burned ivory towers punish greed.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d4', 'negative'),
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
          startTurn: k.currentTurn || 1,
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
