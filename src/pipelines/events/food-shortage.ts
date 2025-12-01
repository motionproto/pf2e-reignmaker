/**
 * Food Shortage Event Pipeline
 *
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
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The shortage is controlled.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d6+1', negative: true, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'A severe shortage develops.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'Famine threatens the kingdom.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'food', formula: '2d6+1', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous", "ongoing"],
};
