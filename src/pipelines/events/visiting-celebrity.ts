/**
 * Visiting Celebrity Event Pipeline (CHOICE-BASED)
 *
 * A famous person visits your kingdom, bringing attention and opportunity.
 *
 * Approaches:
 * - Simple Hospitality (Virtuous) - Focus on person, not spectacle
 * - Appropriate Ceremony (Practical) - Balanced exchange
 * - Lavish Display (Ruthless) - Impress and gain favor
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

export const visitingCelebrityPipeline: CheckPipeline = {
  id: 'visiting-celebrity',
  name: 'Visiting Celebrity',
  description: 'A famous person visits your kingdom, bringing attention and opportunity.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you host this celebrity?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Simple Hospitality',
        description: 'Focus on the person, not spectacle',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Genuine hospitality earns fame and generous donation.',
          success: 'Personal connection reduces unrest.',
          failure: 'Modest reception with no impact.',
          criticalFailure: 'Celebrity\'s allies are offended.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Appropriate Ceremony',
        description: 'Balanced exchange of gifts and honor',
        icon: 'fas fa-balance-scale',
        skills: ['performance', 'society', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Perfect ceremony yields trade and gifts.',
          success: 'Appropriate exchange brings gold.',
          failure: 'Ceremony costs exceed benefits.',
          criticalFailure: 'Expensive failure.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3+1', 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          failure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d2', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Lavish Display',
        description: 'Impress with extravagance to gain favor',
        icon: 'fas fa-crown',
        skills: ['performance', 'diplomacy', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Lavish display yields resources through influence.',
          success: 'Extravagance costs but improves faction relations.',
          failure: 'Expensive display breeds resentment.',
          criticalFailure: 'Excessive spending angers citizens and harms relations.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '4d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            valueBadge('Lose {{value}} Gold', 'fas fa-coins', 1, 'negative'),
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      }
    ]
  },

  skills: [
      { skill: 'diplomacy', description: 'formal reception' },
      { skill: 'performance', description: 'entertainment' },
      { skill: 'society', description: 'social events' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Celebrity visit is a triumph.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Visit goes well.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Visit is unremarkable.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Visit causes problems.',
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

      const selectedOption = visitingCelebrityPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      const commandContext: GameCommandContext = {
        actionId: 'visiting-celebrity',
        outcome: ctx.outcome,
        kingdom: ctx.kingdom,
        metadata: ctx.metadata || {}
      };

      if (approach === 'virtuous' && outcome === 'criticalFailure') {
        const factionHandler = new AdjustFactionHandler();
        const factionCommand = await factionHandler.prepare(
          { type: 'adjustFactionAttitude', amount: -1, count: 1 },
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
      } else if (approach === 'ruthless') {
        if (outcome === 'success') {
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
          const factionHandler = new AdjustFactionHandler();
          const factionCommand = await factionHandler.prepare(
            { type: 'adjustFactionAttitude', amount: -1, count: 1 },
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
    const factionCommand = ctx.metadata?._preparedFactionAdjust;
    if (factionCommand?.commit) {
      await factionCommand.commit();
    }

    return { success: true };
  },

  traits: ["beneficial"],
};
