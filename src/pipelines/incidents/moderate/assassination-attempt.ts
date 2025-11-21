/**
 * Assassination Attempt Incident Pipeline
 *
 * Generated from data/incidents/moderate/assassination-attempt.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const assassinationAttemptPipeline: CheckPipeline = {
  id: 'assassination-attempt',
  name: 'Assassination Attempt',
  description: 'An assassin targets one of your kingdom\'s leaders',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'athletics', description: 'protect target' },
      { skill: 'medicine', description: 'treat wounds' },
      { skill: 'stealth', description: 'avoid the assassin' },
    ],

  outcomes: {
    success: {
      description: 'The assassination is prevented.',
      modifiers: []
    },
    failure: {
      description: 'The leader escapes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The leader is wounded.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random PC leader. That PC cannot take a Kingdom Action this turn (they are recovering from wounds)"]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(assassinationAttemptPipeline, ctx.outcome);
    return { success: true };
  }
};
