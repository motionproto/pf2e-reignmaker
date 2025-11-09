/**
 * SellSurplusAction - Custom implementation for Sell Surplus
 * 
 * Uses custom UI components to show trade rates and handle resource sales.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  type ResolveResult
} from '../shared/ActionHelpers';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { hasCommerceStructure, getBestTradeRates } from '../../services/commerce/tradeRates';
import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';

// Import the Svelte component (will be passed to OutcomeDisplay)
import SellResourceSelector from '../../view/kingdom/components/OutcomeDisplay/components/SellResourceSelector.svelte';

export const SellSurplusAction = {
  id: 'sell-surplus',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Must have a commerce structure
    if (!hasCommerceStructure()) {
      return {
        met: false,
        reason: 'Requires a commerce structure'
      };
    }
    
    // Need at least enough of any resource type to meet trade rate
    const baseRates = getBestTradeRates();
    const minAmount = baseRates.sell.resourceCost;
    
    const resources = kingdomData.resources;
    const hasEnough = resources && (
      (resources.food || 0) >= minAmount ||
      (resources.lumber || 0) >= minAmount ||
      (resources.stone || 0) >= minAmount ||
      (resources.ore || 0) >= minAmount
    );
    
    if (!hasEnough) {
      return {
        met: false,
        reason: `Need at least ${minAmount} of any resource to sell`
      };
    }
    
    return { met: true };
  },
  
  customResolution: {
    component: SellResourceSelector,
    
    validateData(resolutionData: ResolutionData): boolean {
      // Validate that a resource was selected and amount is valid
      const { selectedResource, selectedAmount } = resolutionData.customComponentData || {};
      return !!(selectedResource && selectedAmount && selectedAmount > 0);
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('sell-surplus', 'Selling surplus resources');
      
      try {
        const { selectedResource, selectedAmount, goldGained } = resolutionData.customComponentData || {};
        
        if (!selectedResource || !selectedAmount || goldGained === undefined) {
          return { success: false, error: 'No resource selection was made' };
        }
        
        // Apply resource changes using shared helper
        const result = await applyResourceChanges([
          { resource: selectedResource, amount: -selectedAmount },
          { resource: 'gold', amount: goldGained }
        ], 'sell-surplus');
        
        if (!result.success) {
          return result;
        }
        
        // Build success message
        const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
        const message = `Sold ${selectedAmount} ${resourceName} for ${goldGained} gold!`;
        
        logActionSuccess('sell-surplus', message);
        return { success: true, data: { message } };
        
      } catch (error) {
        logActionError('sell-surplus', error as Error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to sell surplus' };
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // Only need custom resolution for successful sales
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default SellSurplusAction;
