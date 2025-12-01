/**
 * Good Weather Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const goodWeatherPipeline: CheckPipeline = {
  id: 'good-weather',
  name: 'Good Weather',
  description: 'Perfect weather conditions boost morale and productivity.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'nature', description: 'predict weather patterns' },
      { skill: 'society', description: 'organize activities' },
      { skill: 'performance', description: 'celebrate the weather' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The perfect weather holds.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The good weather continues.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The weather changes.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'The weather turns bad.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial", "ongoing"],
};
