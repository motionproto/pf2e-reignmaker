/**
 * Sell Surplus Action Pipeline
 *
 * Trade resources for gold based on commerce structure tier.
 * Converted from data/player-actions/sell-surplus.json
 *
 * NOTE: Actual execution logic is in custom implementation (commerce service)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const sellSurplusPipeline: CheckPipeline = {
  id: 'sell-surplus',
  name: 'Sell Surplus',
  description: 'Convert excess resources into gold through your kingdom\'s commerce infrastructure. Better commerce structures provide better trade rates.',
  checkType: 'action',
  category: 'economic-resources',

  skills: [
    { skill: 'society', description: 'market knowledge' },
    { skill: 'diplomacy', description: 'trade negotiations' },
    { skill: 'deception', description: 'inflate value' },
    { skill: 'performance', description: 'showcase goods' },
    { skill: 'thievery', description: 'black market' }
  ],

  // Pre-roll: Select resource to sell and quantity
  preRollInteractions: [
    {
      type: 'configuration',
      id: 'sellConfig',
      label: 'Select resources to sell'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You secure exceptional trade rates.',
      modifiers: []
    },
    success: {
      description: 'Resources are sold.',
      modifiers: []
    },
    failure: {
      description: 'No buyers are found.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The market is closed.',
      modifiers: []
    }
  },

  preview: {
    calculate: (ctx) => {
      // Commerce-based calculation (handled by commerce service)
      // Preview shows resource loss and gold gain based on commerce tier
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
