/**
 * sellSurplus Action Pipeline
 * Data from: data/player-actions/sell-surplus.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';

export const sellSurplusPipeline = createActionPipeline('sell-surplus', {
  requirements: (kingdom) => {
    // Must have a commerce structure
    if (!hasCommerceStructure()) {
      return { met: false, reason: 'Requires a commerce structure' };
    }
    
    // Need at least enough of any resource type to meet trade rate
    const baseRates = getBestTradeRates();
    const minAmount = baseRates.sell.resourceCost;
    
    const resources = kingdom.resources;
    const hasEnough = resources && (
      (resources.food || 0) >= minAmount ||
      (resources.lumber || 0) >= minAmount ||
      (resources.stone || 0) >= minAmount ||
      (resources.ore || 0) >= minAmount
    );
    
    if (!hasEnough) {
      return { met: false, reason: `Need at least ${minAmount} of any resource to sell` };
    }
    
    return { met: true };
  },

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'SellResourceSelector',  // Resolved via ComponentRegistry
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
