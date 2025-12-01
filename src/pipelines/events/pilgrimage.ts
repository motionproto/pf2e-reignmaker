/**
 * Pilgrimage Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const pilgrimagePipeline: CheckPipeline = {
  id: 'pilgrimage',
  name: 'Pilgrimage',
  description: 'Religious pilgrims seek passage or sanctuary in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'provide sanctuary' },
      { skill: 'diplomacy', description: 'welcome pilgrims' },
      { skill: 'society', description: 'organize accommodations' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A major pilgrimage brings prosperity.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The pilgrims pass through peacefully.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Minor disruptions occur.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'Religious tensions arise.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
