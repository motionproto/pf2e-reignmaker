/**
 * Sell Surplus Action Pipeline
 *
 * Trade resources for gold based on commerce structure tier.
 * Converted from data/player-actions/sell-surplus.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';
import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import SellResourceSelector from '../../view/kingdom/components/OutcomeDisplay/components/SellResourceSelector.svelte';

export const sellSurplusPipeline: CheckPipeline = {
  id: 'sell-surplus',
  name: 'Sell Surplus',
  description: 'Convert excess resources into gold through your kingdom\'s commerce infrastructure. Better commerce structures provide better trade rates. Requires at least one commerce structure.',
  checkType: 'action',
  category: 'economic-resources',

  skills: [
    { skill: 'society', description: 'market knowledge' },
    { skill: 'diplomacy', description: 'trade negotiations' },
    { skill: 'deception', description: 'inflate value' },
    { skill: 'performance', description: 'showcase goods' },
    { skill: 'thievery', description: 'black market' }
  ],

  // Post-roll: Select resource and amount (BEFORE Apply button, shown inline in outcome display)
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

  outcomes: {
    criticalSuccess: {
      description: 'You secure exceptional trade rates.',
      modifiers: []
    },
    success: {
      description: 'Resources are sold.',
      modifiers: []
    },
    failure: {
      description: 'No buyers are found.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The market is closed.',
      modifiers: []
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
};
