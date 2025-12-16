/**
 * Archaeological Find Event Pipeline (CHOICE-BASED)
 *
 * Ancient ruins or artifacts are discovered in your territory.
 *
 * Approaches:
 * - Preserve as Heritage (Virtuous) - Free public access
 * - Scholarly Study (Practical) - Museum and research
 * - Sell Artifacts (Ruthless) - Maximum profit
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';
import { updateKingdom } from '../../stores/KingdomStore';

export const archaeologicalFindPipeline: CheckPipeline = {
  id: 'archaeological-find',
  name: 'Archaeological Find',
  description: 'Ancient ruins or artifacts are discovered in your territory.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you handle this discovery?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Preserve Heritage',
        description: 'Free public access to cultural treasure',
        icon: 'fas fa-monument',
        skills: ['society', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Heritage site draws tourists and earns fame.',
          success: 'Citizens celebrate cultural preservation.',
          failure: 'Maintenance costs exceed benefits.',
          criticalFailure: 'Site costs drain resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            textBadge('1 settlement gains level', 'fas fa-city', 'positive')
          ],
          success: [
            textBadge('1 settlement gains level', 'fas fa-city', 'positive')
          ],
          failure: [
            textBadge('1 settlement loses level', 'fas fa-city', 'negative')
          ],
          criticalFailure: [
            textBadge('1 settlement loses level', 'fas fa-city', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Scholarly Study',
        description: 'Museum and research institution',
        icon: 'fas fa-book',
        skills: ['society', 'occultism', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Research yields ongoing tourism revenue.',
          success: 'Museum generates profit.',
          failure: 'Research costs exceed revenue.',
          criticalFailure: 'Failed project wastes resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            textBadge('Gain 1 structure', 'fas fa-building', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ],
          criticalFailure: [
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Sell Artifacts',
        description: 'Maximize profit through private sales',
        icon: 'fas fa-coins',
        skills: ['diplomacy', 'society', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Artifacts fetch premium prices.',
          success: 'Private sales generate profit.',
          failure: 'Sales damage reputation despite profit.',
          criticalFailure: 'Greed angers historians and citizens.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ],
          criticalFailure: [
            textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d4', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'historical research' },
    { skill: 'religion', description: 'divine significance' },
    { skill: 'occultism', description: 'arcane investigation' },
    { skill: 'diplomacy', description: 'negotiate sales' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach proves highly effective.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Discovery handled successfully.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Discovery has mixed results.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Handling causes complications.',
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

      const selectedOption = archaeologicalFindPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      // Practical CS: Ongoing tourism gold
      if (approach === 'practical' && outcome === 'criticalSuccess') {
        ctx.metadata._ongoingTourism = { formula: '2d3', duration: 2 };
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    // Add ongoing tourism modifier (practical CS)
    if (ctx.metadata?._ongoingTourism && approach === 'practical') {
      const tourism = ctx.metadata._ongoingTourism;
      await updateKingdom(k => {
        if (!k.activeModifiers) k.activeModifiers = [];
        k.activeModifiers.push({
          id: `archaeological-tourism-${Date.now()}`,
          name: 'Archaeological Tourism',
          description: `Museum and research draws tourists, providing ${tourism.formula} gold per turn.`,
          icon: 'fas fa-monument',
          tier: 1,
          sourceType: 'custom',
          sourceId: ctx.instanceId || 'archaeological-find',
          sourceName: 'Archaeological Find',
          startTurn: k.currentTurn || 1,
          modifiers: [
            { type: 'dice', resource: 'gold', formula: tourism.formula, duration: tourism.duration }
          ]
        });
      });
    }

    return { success: true };
  },

  traits: ['beneficial'],
};
