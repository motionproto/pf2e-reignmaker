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

  // ✅ CHANGED: Move to postRollInteractions for INLINE display in OutcomeDisplay
  // This shows the component BEFORE clicking Apply, not as a dialog after
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'PurchaseResourceSelector',  // Resolved via ComponentRegistry
      // Only show for successful purchases
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
      // NOTE: No onComplete handler here - execution happens in execute() function
      // Component dispatches 'resolution' event which OutcomeDisplay captures
      // Data is stored in ctx.resolutionData.customComponentData
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // ✅ Get user selection from customComponentData (set by PurchaseResourceSelector)
        const customData = ctx.resolutionData?.customComponentData;
        console.log('[PurchaseResources] 🔍 customComponentData:', customData);
        
        if (!customData?.selectedResource || !customData?.selectedAmount || customData?.goldCost === undefined) {
          console.warn('[PurchaseResources] ⚠️ No resource selection - user might not have selected anything');
          return { success: true };
        }
        
        // Apply resource changes based on user selection
        const purchaseResult = await applyResourceChanges([
          { resource: 'gold', amount: -customData.goldCost },
          { resource: customData.selectedResource, amount: customData.selectedAmount }
        ], 'purchase-resources');
        
        if (!purchaseResult.success) {
          throw new Error(purchaseResult.error || 'Failed to purchase resources');
        }
        
        console.log(`[PurchaseResources] ✅ Purchased ${customData.selectedAmount} ${customData.selectedResource} for ${customData.goldCost} gold`);
        return { success: true };
        
      case 'criticalFailure':
        // DEBUG: Log what's actually in ctx.resolutionData
        console.log('[PurchaseResources] 🔍 ctx.resolutionData:', ctx.resolutionData);
        console.log('[PurchaseResources] 🔍 numericModifiers:', ctx.resolutionData?.numericModifiers);
        
        // ✅ Apply ALL numericModifiers (includes rolled dice values)
        // ResolutionDataBuilder auto-converts rolled badges to numericModifiers
        const modifiers = ctx.resolutionData?.numericModifiers || [];
        
        console.log('[PurchaseResources] 🔍 Modifiers array length:', modifiers.length);
        
        if (modifiers.length === 0) {
          console.log('[PurchaseResources] ⏳ No modifiers to apply yet');
          console.log('[PurchaseResources] ⏳ Full context:', JSON.stringify(ctx, null, 2));
          return { success: true };
        }
        
        // Apply all modifiers (handles shortages → unrest conversion automatically)
        const result = await applyResourceChanges(
          modifiers.map((m: any) => ({ resource: m.resource, amount: m.value })),
          'purchase-resources'
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply modifiers');
        }
        
        console.log(`[PurchaseResources] ✅ Applied ${modifiers.length} modifier(s)`);
        return { success: true };
        
      case 'failure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
