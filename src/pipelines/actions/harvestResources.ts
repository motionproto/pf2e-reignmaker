/**
 * harvestResources Action Pipeline
 * Data from: data/player-actions/harvest-resources.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { applyResourceChanges } from '../shared/InlineActionHelpers';

export const harvestResourcesPipeline = createActionPipeline('harvest-resources', {
  // No cost - always available. Requires worksite with resources (handled by component)
  requirements: () => ({ met: true }),

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'ResourceChoiceSelector',  // String name (simple, reliable)
      // Only show for successful harvests
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      },
      // Execute harvest when user confirms selection
      onComplete: async (data: any, ctx: any) => {
        console.log('🎯 [HarvestResources] User selected:', data);
        const { selectedResource, amount } = data || {};
        
        if (!selectedResource || !amount) {
          throw new Error('No resource selection was made');
        }
        
        // Apply resource gain
        const result = await applyResourceChanges([
          { resource: selectedResource, amount: amount }
        ], 'harvest-resources');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply resource changes');
        }
        
        console.log('✅ [HarvestResources] Resources harvested successfully');
      }
    }
  ],

  preview: {
    calculate: async (ctx) => ({
      resources: []  // Component will show resource options, no preview needed
    })
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Resource selection and application handled by postRollInteractions.onComplete
        // The onComplete handler is called during Step 8 by UnifiedCheckHandler,
        // which applies the resource changes based on user's selection.
        console.log('[HarvestResources] ✅ Resources harvested via postRollInteractions');
        return { success: true };
        
      case 'failure':
        // No action taken on failure
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply -1 gold modifier from pipeline
        await applyPipelineModifiers(harvestResourcesPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
