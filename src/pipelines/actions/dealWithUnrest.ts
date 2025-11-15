/**
 * Deal with Unrest Action Pipeline
 *
 * Address grievances and calm tensions through various approaches.
 * Converted from data/player-actions/deal-with-unrest.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const dealWithUnrestPipeline: CheckPipeline = {
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  description: 'Address grievances and calm tensions through various approaches: entertainment, religious ceremonies, shows of force, diplomatic engagement, scholarly discourse, or magical displays',
  checkType: 'action',
  category: 'uphold-stability',

  skills: [
    { skill: 'performance', description: 'entertainment and festivities' },
    { skill: 'religion', description: 'religious ceremonies' },
    { skill: 'intimidation', description: 'shows of force' },
    { skill: 'diplomacy', description: 'diplomatic engagement' },
    { skill: 'arcana', description: 'magical persuasion' },
    { skill: 'medicine', description: 'public health initiatives' },
    { skill: 'occultism', description: 'mystical demonstrations' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The people rally to your cause.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -3, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The people listen.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Tensions ease slightly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'No one listens.',
      modifiers: []  // No change to unrest
    }
  },

  preview: {
    calculate: (ctx) => ({
      resources: [
        { resource: 'unrest', value: -2 }  // Show typical success case
      ]
    })
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    // All outcomes apply their modifiers directly from pipeline
    // (criticalFailure has no modifiers, so it's a no-op)
    await applyPipelineModifiers(dealWithUnrestPipeline, ctx.outcome);
    return { success: true };
  }
};
