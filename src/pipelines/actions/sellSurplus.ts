/**
 * sellSurplus Action Pipeline
 * Data from: data/player-actions/sell-surplus.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';
import { getResourceIcon } from '../../view/kingdom/utils/presentation';

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

  // ✅ CHANGED: Move to postRollInteractions for INLINE display in OutcomeDisplay
  // This shows the component BEFORE clicking Apply, not as a dialog after
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'SellResourceSelector',  // Resolved via ComponentRegistry
      // Only show for successful sales
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
      // NOTE: No onComplete handler here - execution happens in execute() function
      // Component dispatches 'resolution' event which OutcomeDisplay captures
      // Data is stored in ctx.resolutionData.customComponentData
    }
  ],

  preview: {
    calculate: async (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        // Determine most plentiful resource for fraud penalty
        const resources = ctx.kingdom.resources;
        const plentifulResource = getMostPlentifulResource(resources);
        
        return {
          resources: [],
          // ✨ AUTO-CONVERSION: OutcomeBadges with {{value}} are automatically converted to modifiers
          // No need to manually create matching modifier - ResolutionDataBuilder handles it
          outcomeBadges: [{
            icon: getResourceIcon(plentifulResource),
            template: `Lose {{value}} ${capitalize(plentifulResource)}`,
            value: { type: 'dice', formula: '1d4' },
            variant: 'negative'
          }]
        };
      }
      
      // Success/failure - component handles selection
      return { resources: [] };
    }
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // ✅ Get user selection from customComponentData (set by SellResourceSelector)
        const customData = ctx.resolutionData?.customComponentData;
        console.log('[SellSurplus] 🔍 customComponentData:', customData);
        
        if (!customData?.selectedResource || !customData?.selectedAmount || customData?.goldGained === undefined) {
          console.warn('[SellSurplus] ⚠️ No resource selection - user might not have selected anything');
          return { success: true };
        }
        
        // Apply resource changes based on user selection
        const saleResult = await applyResourceChanges([
          { resource: customData.selectedResource, amount: -customData.selectedAmount },
          { resource: 'gold', amount: customData.goldGained }
        ], 'sell-surplus');
        
        if (!saleResult.success) {
          throw new Error(saleResult.error || 'Failed to sell resources');
        }
        
        console.log(`[SellSurplus] ✅ Sold ${customData.selectedAmount} ${customData.selectedResource} for ${customData.goldGained} gold`);
        return { success: true };
        
      case 'criticalFailure':
        // Get rolled value from numericModifiers (populated by ResolutionDataBuilder)
        const penaltyModifier = ctx.resolutionData?.numericModifiers?.[0];
        
        if (!penaltyModifier) {
          // User hasn't rolled yet - this is fine, they'll roll in OutcomeDisplay
          console.log('[SellSurplus] ⏳ Waiting for fraud penalty roll');
          return { success: true };
        }
        
        // Resource is stored in the modifier by ResolutionDataBuilder
        const resource = penaltyModifier.resource;
        const amount = Math.abs(penaltyModifier.value);
        
        // Apply loss (GameCommandsService auto-converts shortage to unrest)
        const result = await applyResourceChanges([
          { resource, amount: -amount }
        ], 'sell-surplus');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply fraud penalty');
        }
        
        console.log(`[SellSurplus] ✅ Applied fraud penalty: -${amount} ${resource}`);
        return { success: true };
        
      case 'failure':
        // No action taken on failure
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});

/**
 * Helper: Find most plentiful resource (random selection if tied)
 */
function getMostPlentifulResource(resources: any): 'food' | 'lumber' | 'stone' | 'ore' {
  const standard = ['food', 'lumber', 'stone', 'ore'] as const;
  const counts = standard.map(r => ({ 
    resource: r, 
    amount: resources[r] || 0 
  }));
  
  // Get max amount
  const max = Math.max(...counts.map(c => c.amount));
  
  // Get all resources tied for max
  const tied = counts.filter(c => c.amount === max);
  
  // Random selection if tied
  return tied[Math.floor(Math.random() * tied.length)].resource;
}

/**
 * Helper: Capitalize resource name
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
