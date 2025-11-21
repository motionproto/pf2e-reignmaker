/**
 * sellSurplus Action Pipeline
 * Data from: data/player-actions/sell-surplus.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const sellSurplusPipeline = createActionPipeline('sell-surplus', {
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: SellResourceSelector,  // Custom property for Svelte component
      // Only show for successful sales
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      },
      // Execute sale when user confirms selection
      onComplete: async (data: any, ctx: any) => {
        console.log('🎯 [SellSurplus] User selected:', data);
        const { selectedResource, selectedAmount, goldGained } = data || {};
        
        if (!selectedResource || !selectedAmount || goldGained === undefined) {
          throw new Error('No resource selection was made');
        }
        
        // Apply resource changes
        const result = await applyResourceChanges([
          { resource: selectedResource, amount: -selectedAmount },
          { resource: 'gold', amount: goldGained }
        ], 'sell-surplus');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply resource changes');
        }
        
        console.log('✅ [SellSurplus] Resources sold successfully');
      }
    }
  ],

  preview: {
    providedByInteraction: true  // Resource selector shows preview
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Resource selection and application handled by postRollInteractions.onComplete
        // The onComplete handler already applied the resource changes during Step 7,
        // so we just need to verify it ran successfully.
        console.log('[SellSurplus] ✅ Resources sold via postRollInteractions');
        return { success: true };
        
      case 'failure':
      case 'criticalFailure':
        // No action taken on failure
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
