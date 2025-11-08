/**
 * HarvestResourcesAction - Custom implementation for Harvest Resources
 * 
 * Uses ResourceChoiceSelector component to let players choose resource type.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

// Import the Svelte component (will be passed to OutcomeDisplay)
import ResourceChoiceSelector from '../../view/kingdom/components/OutcomeDisplay/components/ResourceChoiceSelector.svelte';

export const HarvestResourcesAction = {
  id: 'harvest-resources',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    return { met: true };
  },
  
  customResolution: {
    component: ResourceChoiceSelector,
    
    validateData(resolutionData: ResolutionData): boolean {
      // Validate that a resource was selected
      return !!(resolutionData.customComponentData?.selectedResource);
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('harvest-resources', 'Applying resource harvest');
      
      try {
        // ✅ NEW: Get selection from customComponentData (set by component)
        const { selectedResource, amount } = resolutionData.customComponentData || {};
        
        if (!selectedResource) {
          return createErrorResult('No resource was selected');
        }
        
        // Resource changes are handled by OutcomeDisplay via numericModifiers
        // (component emits modifiers which get processed by computeResolutionData)
        // This execute() is just for validation and success message
        
        const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
        const message = `Harvested ${amount} ${resourceName}!`;
        
        logActionSuccess('harvest-resources', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('harvest-resources', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to harvest resources');
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // Only need custom resolution for successful harvests
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default HarvestResourcesAction;
