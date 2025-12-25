/**
 * Purchase Resources Action Pipeline
 * Purchase resources with gold based on commerce structure tier
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { getBestTradeRates } from '../../services/commerce/tradeRates';

export const purchaseResourcesPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'purchase-resources',
  name: 'Purchase Resources',
  description: 'Use the kingdom\'s treasury to acquire needed materials. Better commerce structures provide better trade rates.',
  brief: 'Purchase resources with gold based on commerce structure tier',
  category: 'economic-resources',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'negotiate deals', doctrine: 'virtuous' },
    { skill: 'society', description: 'find suppliers', doctrine: 'practical' },
    { skill: 'intimidation', description: 'demand better prices', doctrine: 'ruthless' },
    { skill: 'deception', description: 'misleading negotiations', doctrine: 'ruthless' },
    { skill: 'thievery', description: 'confiscate shipments', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You secure exceptional trade rates.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Purchase resources', 'fa-shopping-cart', 'info')
      ]
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
      },
      onComplete: async (data: any, ctx: any) => {
        const { selectedResource, selectedAmount, goldCost } = data || {};
        
        if (!selectedResource || !selectedAmount || goldCost === undefined) {
          throw new Error('No resource selection was made');
        }
        
        const result = await applyResourceChanges([
          { resource: 'gold', amount: -goldCost },
          { resource: selectedResource, amount: selectedAmount }
        ], 'purchase-resources');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to purchase resources');
        }
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Resource changes are applied by onComplete handler in postRollInteractions
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
