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
      // Preview is provided by custom component
      return {
        resources: [],
        specialEffects: [],
        warnings: []
      };
    }
  },

  // Execute function: Apply resource changes from custom component
  execute: async (ctx) => {
    const { selectedResource, selectedAmount, goldGain } = ctx.resolutionData.customComponentData || {};
    
    if (!selectedResource || !selectedAmount || goldGain === undefined) {
      return {
        success: false,
        error: 'No resource selection was made'
      };
    }

    // Import helper to apply resource changes
    const { applyResourceChanges } = await import('../../actions/shared/InlineActionHelpers');
    
    // Apply resource changes (lose resource, gain gold)
    const result = await applyResourceChanges([
      { resource: selectedResource, amount: -selectedAmount },
      { resource: 'gold', amount: goldGain }
    ], 'sell-surplus');
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to sell resources'
      };
    }

    // Build success message
    const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
    return {
      success: true,
      message: `Sold ${selectedAmount} ${resourceName} for ${goldGain} gold!`
    };
  }
};
