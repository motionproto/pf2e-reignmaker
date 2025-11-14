/**
 * Deal with Unrest Action Pipeline
 *
 * Simple action that reduces unrest through various approaches.
 * Converted from data/player-actions/deal-with-unrest.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const dealWithUnrestPipeline: CheckPipeline = {
  // Identity
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  description: 'Address grievances and calm tensions through various approaches: entertainment, religious ceremonies, shows of force, diplomatic engagement, scholarly discourse, or magical displays',
  checkType: 'action',
  category: 'uphold-stability',

  // Skills - all approaches are valid
  skills: [
    { skill: 'performance', description: 'entertainment and festivities' },
    { skill: 'religion', description: 'religious ceremonies' },
    { skill: 'intimidation', description: 'shows of force' },
    { skill: 'diplomacy', description: 'diplomatic engagement' },
    { skill: 'arcana', description: 'magical persuasion' },
    { skill: 'medicine', description: 'public health initiatives' },
    { skill: 'occultism', description: 'mystical demonstrations' }
  ],

  // Outcomes - all outcomes reduce unrest (even failure helps a little)
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
      modifiers: [
        { type: 'static', resource: 'unrest', value: 0, duration: 'immediate' }
      ]
    }
  },

  // Preview - show unrest reduction based on outcome
  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -3 :
                          ctx.outcome === 'success' ? -2 :
                          ctx.outcome === 'failure' ? -1 : 0;

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects: [],
        warnings: []
      };
    }
  }
};
