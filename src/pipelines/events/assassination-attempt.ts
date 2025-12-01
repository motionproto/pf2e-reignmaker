/**
 * Assassination Attempt Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const assassinationAttemptPipeline: CheckPipeline = {
  id: 'assassination-attempt',
  name: 'Assassination Attempt',
  description: 'Someone attempts to kill one of your leaders.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'stealth', description: 'avoid the assassin' },
      { skill: 'intimidation', description: 'deter through fear' },
      { skill: 'medicine', description: 'survive wounds' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The assassin is captured.',
      endsEvent: true,
      modifiers: []
    },
    success: {
      description: 'The attempt is foiled.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'Your leader narrowly escapes.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Your leader is seriously wounded.',
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
