/**
 * purchaseResources Action Pipeline
 * Data from: data/player-actions/purchase-resources.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';

export const purchaseResourcesPipeline = createActionPipeline('purchase-resources', {
  requirements: (kingdom) => {
    // Must have a commerce structure
    if (!hasCommerceStructure()) {
      return { met: false, reason: 'Requires a commerce structure' };
    }
    
    // Must have enough gold for at least one transaction
    const currentGold = kingdom.resources?.gold || 0;
    const tradeRates = getBestTradeRates();
    const goldCostPerTransaction = tradeRates.buy.goldGain;
    
    if (currentGold < goldCostPerTransaction) {
      return { met: false, reason: `Requires at least ${goldCostPerTransaction} gold to purchase resources (current: ${currentGold})` };
    }
    
    return { met: true };
  },

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'PurchaseResourceSelector',  // Resolved via ComponentRegistry
      // Only show for successful purchases
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      },
      // Execute purchase when user confirms selection
      onComplete: async (data: any, ctx: any) => {
        console.log('🎯 [PurchaseResources] User selected:', data);
        const { selectedResource, selectedAmount, goldCost } = data || {};
        
        if (!selectedResource || !selectedAmount || goldCost === undefined) {
          throw new Error('No resource selection was made');
        }
        
        // Apply resource changes
        const result = await applyResourceChanges([
          { resource: 'gold', amount: -goldCost },
          { resource: selectedResource, amount: selectedAmount }
        ], 'purchase-resources');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to purchase resources');
        }
        
        console.log('✅ [PurchaseResources] Resources purchased successfully');
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
        console.log('[PurchaseResources] ✅ Resources purchased via postRollInteractions');
        return { success: true };
        
      case 'failure':
        // No action taken on failure
        return { success: true };
        
      case 'criticalFailure':
        // Apply gold loss penalty
        console.log('[PurchaseResources] ⚠️ Critical failure - losing 1 gold');
        const result = await applyResourceChanges([
          { resource: 'gold', amount: -1 }
        ], 'purchase-resources');
        
        if (!result.success) {
          console.error('[PurchaseResources] Failed to apply gold loss:', result.error);
          return { success: false, error: result.error };
        }
        
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
