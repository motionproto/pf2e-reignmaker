/**
 * Immigration Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const immigrationPipeline: CheckPipeline = {
  id: 'immigration',
  name: 'Immigration',
  description: 'New settlers arrive seeking homes in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'welcome newcomers' },
      { skill: 'society', description: 'integrate settlers' },
      { skill: 'survival', description: 'find them land' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A major influx of settlers arrives.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    success: {
      description: 'Settlers arrive steadily.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Few settlers decide to stay.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'Integration problems arise.',
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
