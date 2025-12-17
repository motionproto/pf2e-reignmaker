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
        label: 'Preserve Carefully',
        description: 'Protect and cherish the natural wonder',
        icon: 'fas fa-leaf',
        skills: ['nature', 'diplomacy', 'religion', 'applicable lore'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Reverent stewardship multiplies nature\'s gifts; wonder endures for generations.',
          success: 'Gentle care preserves beauty; grateful hearts harvest sustainable bounty.',
          failure: 'Overcautious protection prevents use; wonder fades untouched and wasted.',
          criticalFailure: 'Timid inaction squanders opportunity; ephemeral beauty vanishes unremarked.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '2d3', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Harvest Sustainably',
        description: 'Balance use with conservation',
        icon: 'fas fa-balance-scale',
        skills: ['nature', 'society', 'crafting', 'applicable lore'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Wise planning balances harvest and preservation; abundance fills storehouses.',
          success: 'Measured gathering respects nature while providing steady resources.',
          failure: 'Hesitant management yields meager results; neither preserved nor harvested well.',
          criticalFailure: 'Confused directives waste opportunity; botched harvest angers everyone.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '2d4', 'positive'),
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} random resource', 'fas fa-box', '2d3', 'positive'),
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'positive')
          ],
          failure: [
            diceBadge('Lose {{value}} Food', 'fas fa-drumstick-bite', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Exploit Fully',
        description: 'Extract maximum value while it lasts',
        icon: 'fas fa-industry',
        skills: ['nature', 'intimidation', 'thievery', 'applicable lore'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Ruthless extraction strips nature bare; mountains of wealth mask moral cost.',
          success: 'Greedy harvesting fills coffers; devastated landscape testifies to ambition.',
          failure: 'Brutal exploitation destroys beauty for fleeting gains; outrage follows waste.',
          criticalFailure: 'Reckless devastation leaves barren scars; destroyed wonder breeds bitter regret.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d4', 'positive'),
            valueBadge('Gain {{value}} Food', 'fas fa-drumstick-bite', 1, 'positive')
          ],
          failure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} random resource', 'fas fa-box', '2d3', 'negative')
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
