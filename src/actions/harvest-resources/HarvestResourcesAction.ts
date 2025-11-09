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
  type ResolveResult
} from '../shared/ActionHelpers';
import { applyResourceChanges } from '../shared/InlineActionHelpers';

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
        // Get selection from customComponentData (set by component)
        const { selectedResource, amount } = resolutionData.customComponentData || {};
        
        if (!selectedResource || !amount) {
          return { success: false, error: 'No resource was selected' };
        }
        
        // Apply resource using shared helper
        const result = await applyResourceChanges([
          { resource: selectedResource, amount }
        ], 'harvest-resources');
        
        if (!result.success) {
          return result;
        }
        
        // Build success message
        const resourceName = selectedResource.charAt(0).toUpperCase() + selectedResource.slice(1);
        const message = `Harvested ${amount} ${resourceName}!`;
        
        logActionSuccess('harvest-resources', message);
        return { success: true, data: { message } };
        
      } catch (error) {
        logActionError('harvest-resources', error as Error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to harvest resources' };
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // Only need custom resolution for successful harvests
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default HarvestResourcesAction;
