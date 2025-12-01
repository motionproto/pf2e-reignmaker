/**
 * Deal with Unrest Action Pipeline
 * Directly reduce unrest by 1-3 based on success
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const dealWithUnrestPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  description: 'Address grievances and calm tensions through various approaches: entertainment, religious ceremonies, shows of force, diplomatic engagement, scholarly discourse, or magical displays',
  brief: 'Directly reduce unrest by 1-3 based on success',
  category: 'uphold-stability',
  checkType: 'action',

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
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true })
};
