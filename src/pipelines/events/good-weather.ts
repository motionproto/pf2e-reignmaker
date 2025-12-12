/**
 * Good Weather Event Pipeline (CHOICE-BASED)
 *
 * Perfect weather conditions boost morale and productivity.
 *
 * Approaches:
 * - Declare Holidays (Virtuous) - Celebrate and rest
 * - Work Hard (Practical) - Gather extra resources
 * - Military Exercises (Ruthless) - Train troops
 *
 * Based on EVENT_MIGRATION_STATUS.md specifications
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { valueBadge, diceBadge } from '../../types/OutcomeBadge';

export const goodWeatherPipeline: CheckPipeline = {
  id: 'good-weather',
  name: 'Good Weather',
  description: 'Perfect weather conditions boost morale and productivity.',
  checkType: 'event',
  tier: 1,

  strategicChoice: {
    label: 'How will you capitalize on good weather?',
    required: true,
    options: [
      {
        id: 'virtuous',
        label: 'Declare Holidays',
        description: 'Celebrate and let people rest',
        icon: 'fas fa-sun',
        skills: ['performance', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Joyful celebration attracts new citizens.',
          success: 'Holiday reduces unrest and boosts morale.',
          failure: 'Celebration breeds resentment among workers.',
          criticalFailure: 'Excessive leisure causes unrest.'
        },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive'),
            diceBadge('Gain {{value}} new citizens', 'fas fa-users', '1d4', 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'practical',
        label: 'Work Hard',
        description: 'Gather extra resources while weather holds',
        icon: 'fas fa-hammer',
        skills: ['nature', 'society'],
        personality: { practical: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Exceptional productivity yields abundant resources.',
          success: 'Hard work provides food, gold, and materials.',
          failure: 'Overwork breeds resentment.',
          criticalFailure: 'Excessive demands cause unrest and costs.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '2d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            diceBadge('Gain {{value}} Lumber/Stone', 'fas fa-cube', '2d4', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Food', 'fas fa-bread-slice', '1d4', 'positive'),
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive'),
            diceBadge('Gain {{value}} Lumber/Stone', 'fas fa-cube', '1d4', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ]
        }
      },
      {
        id: 'ruthless',
        label: 'Military Exercises',
        description: 'Train troops for combat readiness',
        icon: 'fas fa-shield',
        skills: ['intimidation', 'performance'],
        personality: { ruthless: 3 },
        outcomeDescriptions: {
          criticalSuccess: 'Troops gain elite training and plunder.',
          success: 'One army gains valuable training.',
          failure: 'Costly exercises drain resources.',
          criticalFailure: 'Failed exercises waste resources.'
        },
        outcomeBadges: {
          criticalSuccess: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '2d3', 'positive'),
            diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')
          ],
          success: [
            diceBadge('Gain {{value}} Gold', 'fas fa-coins', '1d3', 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '1d3', 'negative')
          ],
          criticalFailure: [
            diceBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', '1d3', 'negative'),
            diceBadge('Lose {{value}} Gold', 'fas fa-coins', '2d3', 'negative')
          ]
        }
      }
    ]
  },

  skills: [
      { skill: 'nature', description: 'predict weather patterns' },
      { skill: 'society', description: 'organize activities' },
      { skill: 'performance', description: 'celebrate the weather' },
      { skill: 'diplomacy', description: 'manage expectations' },
      { skill: 'intimidation', description: 'enforce discipline' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Perfect weather maximizes your approach.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    success: {
      description: 'Good weather supports your plans.',
      endsEvent: false,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Weather benefits are limited.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Weather turns bad.',
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

      const selectedOption = goodWeatherPipeline.strategicChoice?.options.find(opt => opt.id === approach);
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

      if (approach === 'ruthless' && (outcome === 'criticalSuccess' || outcome === 'success')) {
        ctx.metadata._trainArmy = outcome === 'criticalSuccess' ? 2 : 1;
      }

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;

    if (ctx.metadata?._trainArmy && approach === 'ruthless') {
      const armies = ctx.kingdom.armies || [];
      const count = ctx.metadata._trainArmy;
      if (armies.length > 0) {
        const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
        for (let i = 0; i < Math.min(count, armies.length); i++) {
          const randomArmy = armies[Math.floor(Math.random() * armies.length)];
          await applyArmyConditionExecution(randomArmy.actorId, 'welltrained', 1);
        }
      }
    }

    return { success: true };
  },

  traits: ["beneficial", "ongoing"],
};
