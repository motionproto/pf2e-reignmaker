/**
 * PurchaseResourcesAction - Custom implementation for Purchase Resources
 * 
 * Uses custom UI components to show trade rates and handle purchases.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { updateKingdom } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';
import { hasCommerceStructure } from '../../services/commerce/tradeRates';

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
        
        if (!selectedResource || !selectedAmount) {
          return createErrorResult('No resource selection was made');
        }
        
        // Resource changes are handled by OutcomeDisplay via modifiers
        // (component emits modifiers which get processed by computeResolutionData)
        // This execute() is just for validation and success message
        
        const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
        const message = `Purchased ${selectedAmount} ${resourceName} for ${goldCost} gold!`;
        
        logActionSuccess('purchase-resources', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('purchase-resources', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to purchase resources');
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // Only need custom resolution for successful purchases
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default PurchaseResourcesAction;
