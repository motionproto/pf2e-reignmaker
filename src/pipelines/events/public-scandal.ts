/**
 * Public Scandal Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const publicScandalPipeline: CheckPipeline = {
  id: 'public-scandal',
  name: 'Public Scandal',
  description: 'A leader is implicated in an embarrassing or criminal situation.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'deception', description: 'cover up' },
      { skill: 'diplomacy', description: 'public apology' },
      { skill: 'intimidation', description: 'silence critics' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The scandal is deflected.',
      endsEvent: true,
      modifiers: []
    },
    success: {
      description: 'The damage is controlled.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Public outrage erupts.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Your leader must lay low.',
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
