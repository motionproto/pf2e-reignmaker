/**
 * Food Shortage Event Pipeline
 *
 * Disease, weather, or pests destroy agricultural production.
 * Simple failure outcomes with static penalties.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const foodShortagePipeline: CheckPipeline = {
  id: 'food-shortage',
  name: 'Food Shortage',
  description: 'Disease, weather, or pests destroy agricultural production.',
  checkType: 'event',
  tier: 1,

  skills: [
    { skill: 'nature', description: 'agricultural expertise' },
    { skill: 'survival', description: 'emergency measures' },
    { skill: 'diplomacy', description: 'coordinate relief' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The crisis is averted.',
      endsEvent: true,
      modifiers: []
    },
    success: {
      description: 'The shortage is controlled.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'A severe shortage develops.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'food', value: -3, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Famine threatens the kingdom.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'food', value: -5, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // Static modifiers are handled automatically by the system
      return { resources: [], outcomeBadges: [] };
    }
  },

  traits: ['dangerous', 'ongoing'],
};
