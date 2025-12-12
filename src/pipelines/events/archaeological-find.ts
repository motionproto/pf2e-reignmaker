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
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';
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
        label: 'Preserve as Heritage',
        description: 'Free public access to cultural treasure',
        icon: 'fas fa-monument',
        skills: ['society', 'religion'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Heritage site draws tourists and earns fame.',
          success: 'Citizens celebrate cultural preservation.',
          failure: 'Maintenance costs exceed benefits.',
          criticalFailure: 'Site costs drain resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
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
        label: 'Scholarly Study',
        description: 'Museum and research institution',
        icon: 'fas fa-book',
        skills: ['society', 'occultism'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Research yields ongoing tourism revenue.',
          success: 'Museum generates profit.',
          failure: 'Research costs exceed revenue.',
          criticalFailure: 'Failed project wastes resources.'
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
        label: 'Sell Artifacts',
        description: 'Maximize profit through private sales',
        icon: 'fas fa-coins',
        skills: ['diplomacy', 'society'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Artifacts fetch premium prices.',
          success: 'Private sales generate profit.',
          failure: 'Sales damage reputation despite profit.',
          criticalFailure: 'Greed angers historians and citizens.'
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
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
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
          startTurn: k.turn || 1,
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
