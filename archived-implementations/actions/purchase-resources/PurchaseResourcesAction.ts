/**
 * PurchaseResourcesAction - Custom implementation for Purchase Resources
 * 
 * Uses custom UI components to show trade rates and handle purchases.
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
import PurchaseResourceSelector from '../../view/kingdom/components/OutcomeDisplay/components/PurchaseResourceSelector.svelte';

export const PurchaseResourcesAction = {
  id: 'purchase-resources',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Must have a commerce structure
    if (!hasCommerceStructure()) {
      return {
        met: false,
        reason: 'Requires a commerce structure'
      };
    }
    
    // Must have enough gold for at least one transaction
    const currentGold = kingdomData.resources?.gold || 0;
    const tradeRates = getBestTradeRates();
    const goldCostPerTransaction = tradeRates.buy.goldGain;
    
    if (currentGold < goldCostPerTransaction) {
      return {
        met: false,
        reason: `Requires at least ${goldCostPerTransaction} gold to purchase resources (current: ${currentGold})`
      };
    }
    
    return { met: true };
  },
  
  customResolution: {
    component: PurchaseResourceSelector,
    
    validateData(resolutionData: ResolutionData): boolean {
      // Validate that a resource was selected and amount is valid
      const { selectedResource, selectedAmount } = resolutionData.customComponentData || {};
      return !!(selectedResource && selectedAmount && selectedAmount > 0);
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('purchase-resources', 'Purchasing resources');
      
      try {
        const { selectedResource, selectedAmount, goldCost } = resolutionData.customComponentData || {};
        
        if (!selectedResource || !selectedAmount || goldCost === undefined) {
          return { success: false, error: 'No resource selection was made' };
        }
        
        // Apply resource changes using shared helper
        const result = await applyResourceChanges([
          { resource: 'gold', amount: -goldCost },
          { resource: selectedResource, amount: selectedAmount }
        ], 'purchase-resources');
        
        if (!result.success) {
          return result;
        }
        
        // Build success message
        const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
        const message = `Purchased ${selectedAmount} ${resourceName} for ${goldCost} gold!`;
        
        logActionSuccess('purchase-resources', message);
        return { success: true, data: { message } };
        
      } catch (error) {
        logActionError('purchase-resources', error as Error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to purchase resources' };
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // Only need custom resolution for successful purchases
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default PurchaseResourcesAction;
