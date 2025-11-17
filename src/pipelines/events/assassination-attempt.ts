/**
 * Assassination Attempt Event Pipeline
 *
 * Generated from data/events/assassination-attempt.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

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
      modifiers: []
    },
    success: {
      description: 'The attempt is foiled.',
      modifiers: []
    },
    failure: {
      description: 'Your leader narrowly escapes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Your leader is seriously wounded.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(assassinationAttemptPipeline, ctx.outcome);
    return { success: true };
  }
};
