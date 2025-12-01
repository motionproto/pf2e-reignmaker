/**
 * Local Disaster Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const localDisasterPipeline: CheckPipeline = {
  id: 'local-disaster',
  name: 'Local Disaster',
  description: 'Fire, flood, or structural collapse strikes a settlement.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'crafting', description: 'emergency repairs' },
      { skill: 'survival', description: 'evacuation and rescue' },
      { skill: 'society', description: 'organize response' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The disaster is contained.',
      endsEvent: true,
      modifiers: []
    },
    success: {
      description: 'Damage is limited.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Major damage occurs.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The disaster is catastrophic.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous"],
};
