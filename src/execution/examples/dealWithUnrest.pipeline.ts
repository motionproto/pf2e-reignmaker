/**
 * Example Pipeline Configuration: Deal with Unrest
 *
 * This demonstrates how to create a simple action pipeline using the unified check system.
 * This is a simple action with no game commands - just resource modifiers.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { PreviewData } from '../../types/PreviewData';

/**
 * Deal with Unrest Action Pipeline
 *
 * Simple action that reduces unrest by 2 on success.
 * No pre-roll interactions, no game commands.
 */
export const dealWithUnrestPipeline: CheckPipeline = {
  // Identity
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  description: 'Attempt to reduce unrest through diplomatic engagement',
  checkType: 'action',
  category: 'uphold-stability',

  // Skills
  skills: [
    { skill: 'diplomacy', description: 'diplomatic engagement' },
    { skill: 'intimidation', description: 'show of force' }
  ],

  // Outcomes (only success matters for this action)
  outcomes: {
    success: {
      description: 'The People Listen',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    }
  },

  // Preview
  preview: {
    calculate: (ctx) => {
      // Simple preview: just show the unrest reduction
      return {
        resources: [
          { resource: 'unrest', value: -2 }
        ],
        outcomeBadges: [],
        warnings: []
      };
    },
    format: (preview: PreviewData) => [
      {
        type: 'resource' as const,
        message: 'Will reduce unrest by 2',
        icon: 'fa-handshake',
        variant: 'positive' as const
      }
    ]
  }
};
