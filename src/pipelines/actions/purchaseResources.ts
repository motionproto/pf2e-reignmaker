/**
 * Purchase Resources Action Pipeline
 *
 * Purchase resources with gold based on commerce structure tier.
 * Converted from data/player-actions/purchase-resources.json
 *
 * NOTE: Actual execution logic is in custom implementation (commerce service)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const purchaseResourcesPipeline: CheckPipeline = {
  id: 'purchase-resources',
  name: 'Purchase Resources',
  description: 'Use the kingdom\'s treasury to acquire needed materials through your commerce infrastructure. Better commerce structures provide better trade rates.',
  checkType: 'action',
  category: 'economic-resources',

  skills: [
    { skill: 'society', description: 'find suppliers' },
    { skill: 'diplomacy', description: 'negotiate deals' },
    { skill: 'intimidation', description: 'demand better prices' },
    { skill: 'deception', description: 'misleading negotiations' }
  ],

  // Pre-roll: Select resource to purchase and quantity
  preRollInteractions: [
    {
      type: 'configuration',
      id: 'purchaseConfig',
      label: 'Select resources to purchase'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You secure exceptional trade rates.',
      modifiers: []
    },
    success: {
      description: 'Resources are purchased.',
      modifiers: []
    },
    failure: {
      description: 'No trade is available.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The negotiations fail catastrophically.',
      modifiers: []
    }
  },

  preview: {
    calculate: (ctx) => {
      // Commerce-based calculation (handled by commerce service)
      return {
        resources: [],
        specialEffects: [{
          type: 'status',
          message: 'Commerce calculation required',
          variant: 'neutral'
        }],
        warnings: []
      };
    }
  }
};
