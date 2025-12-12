/**
 * Nature's Blessing Event Pipeline (CHOICE-BASED)
 *
 * A natural wonder appears - rare flowers, aurora, or returning wildlife.
 *
 * Approaches:
 * - Preserve (Virtuous) - Protect the natural wonder
 * - Harvest Sustainably (Practical) - Use resources wisely
 * - Exploit Fully (Ruthless) - Extract maximum value
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';

export const naturesBlessingPipeline: CheckPipeline = {
  id: 'natures-blessing',
  name: "Nature's Blessing",
  description: 'A natural wonder appears in your kingdom - rare flowers, aurora, or returning wildlife.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you respond to this natural wonder?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Preserve',
        description: 'Protect and cherish the natural wonder',
        icon: 'fas fa-leaf',
        skills: ['nature', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Protection earns fame and bountiful harvest.',
          success: 'Preservation reduces unrest and provides some bounty.',
          failure: 'Wonder provides modest food before fading.',
          criticalFailure: 'Wonder fades before celebration.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '2d4', 'positive'),
            diceBadge('Gain {{value}} Lumber', 'fas fa-tree', '1d4', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Harvest Sustainably',
        description: 'Balance use with conservation',
        icon: 'fas fa-balance-scale',
        skills: ['nature', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Sustainable harvest provides abundant resources.',
          success: 'Balanced approach yields food, gold, and lumber.',
          failure: 'Modest food harvest.',
          criticalFailure: 'Poor planning breeds unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            diceBadge('Gain {{value}} Lumber', 'fas fa-tree', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} Lumber', 'fas fa-tree', '1d4', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exploit Fully',
        description: 'Extract maximum value while it lasts',
        icon: 'fas fa-industry',
        skills: ['nature', 'intimidation'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Full exploitation yields massive resources.',
          success: 'Heavy harvesting provides abundant food, gold, and lumber.',
          failure: 'Overexploitation causes unrest despite gains.',
          criticalFailure: 'Destruction damages reputation.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            diceBadge('Gain {{value}} Lumber', 'fas fa-tree', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} Lumber', 'fas fa-tree', '1d4', 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive'),
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
      { skill: 'nature', description: 'understand the blessing' },
      { skill: 'performance', description: 'celebrate it' },
      { skill: 'society', description: 'organize festivals' },
      { skill: 'diplomacy', description: 'manage expectations' },
      { skill: 'intimidation', description: 'enforce exploitation' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your approach maximizes the blessing.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'The blessing yields benefits.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Blessing provides modest benefits.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Blessing fades or causes problems.',
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

      const selectedOption = naturesBlessingPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = ctx.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    return { success: true };
  },

  traits: ["beneficial"],
};
