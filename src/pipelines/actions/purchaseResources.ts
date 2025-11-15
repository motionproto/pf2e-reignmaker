/**
 * Purchase Resources Action Pipeline
 *
 * Purchase resources with gold based on commerce structure tier.
 * Converted from data/player-actions/purchase-resources.json
 *
 * NOTE: Actual execution logic is in custom implementation (commerce service)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

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
      // Preview is provided by custom component
      return {
        resources: [],
        specialEffects: [],
        warnings: []
      };
    }
  },

  // Execute function - explicitly handles ALL outcomes
  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        // Apply resource changes for successful purchases
        const { selectedResource, selectedAmount, goldCost } = ctx.resolutionData.customComponentData || {};
        
        if (!selectedResource || !selectedAmount || goldCost === undefined) {
          return {
            success: false,
            error: 'No resource selection was made'
          };
        }

        // Import helper to apply resource changes
        const { applyResourceChanges } = await import('../../actions/shared/InlineActionHelpers');
        
        // Apply resource changes
        const result = await applyResourceChanges([
          { resource: 'gold', amount: -goldCost },
          { resource: selectedResource, amount: selectedAmount }
        ], 'purchase-resources');
        
        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to purchase resources'
          };
        }

        // Build success message
        const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
        return {
          success: true,
          message: `Purchased ${selectedAmount} ${resourceName} for ${goldCost} gold!`
        };
      }
        
      case 'failure':
      case 'criticalFailure':
        // Explicitly do nothing on failure (no modifiers defined)
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
