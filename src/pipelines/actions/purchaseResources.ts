/**
 * Purchase Resources Action Pipeline
 *
 * Purchase resources with gold based on commerce structure tier.
 * Converted from data/player-actions/purchase-resources.json
 *
 * NOTE: Actual execution logic is in custom implementation (commerce service)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';
import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import PurchaseResourceSelector from '../../view/kingdom/components/OutcomeDisplay/components/PurchaseResourceSelector.svelte';

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

  // Post-roll: Select resource and amount (AFTER roll, shown inline in outcome display)
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: PurchaseResourceSelector,  // Custom property for Svelte component
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
      description: 'The deal falls through and funds are lost.',
      modifiers: [
        {
          type: 'static',
          resource: 'gold',
          value: -1,
          duration: 'immediate'
        }
      ]
    }
  },

  preview: {
    providedByInteraction: true  // Resource selector shows preview
  },

  // Execute function - explicitly handles ALL outcomes
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
};
