/**
 * Purchase Resources Action Pipeline
 * Purchase resources with gold based on commerce structure tier
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';

export const purchaseResourcesPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'purchase-resources',
  name: 'Purchase Resources',
  description: 'Use the kingdom\'s treasury to acquire needed materials through your commerce infrastructure. Better commerce structures provide better trade rates. Requires at least one commerce structure.',
  brief: 'Purchase resources with gold based on commerce structure tier',
  category: 'economic-resources',
  checkType: 'action',

  skills: [
    { skill: 'society', description: 'find suppliers' },
    { skill: 'diplomacy', description: 'negotiate deals' },
    { skill: 'intimidation', description: 'demand better prices' },
    { skill: 'deception', description: 'misleading negotiations' }
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
      description: 'The negotiations fail catastrophically. Theft and brokerage fees cost you gold.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!hasCommerceStructure()) {
      return { met: false, reason: 'Requires a commerce structure' };
    }
    
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
      component: 'PurchaseResourceSelector',
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        const customData = ctx.resolutionData?.customComponentData;
        
        if (!customData?.selectedResource || !customData?.selectedAmount || customData?.goldCost === undefined) {
          return { success: true };
        }
        
        const purchaseResult = await applyResourceChanges([
          { resource: 'gold', amount: -customData.goldCost },
          { resource: customData.selectedResource, amount: customData.selectedAmount }
        ], 'purchase-resources');
        
        if (!purchaseResult.success) {
          throw new Error(purchaseResult.error || 'Failed to purchase resources');
        }
        
        return { success: true };
        
      case 'criticalFailure':
        const modifiers = ctx.resolutionData?.numericModifiers || [];
        
        if (modifiers.length === 0) {
          return { success: true };
        }
        
        const result = await applyResourceChanges(
          modifiers.map((m: any) => ({ resource: m.resource, amount: m.value })),
          'purchase-resources'
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply modifiers');
        }
        
        return { success: true };
        
      case 'failure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
