/**
 * Repair Structure Action Implementation
 * Shows cost choice dialog on success outcome
 */

import type { CustomActionImplementation } from './index';
import type { ResolutionData } from '../../../types/modifiers';
import type { ResolveResult } from './ActionHelpers';
import RepairCostChoice from '../../../view/kingdom/components/RepairCostChoice.svelte';

const RepairStructureAction: CustomActionImplementation = {
  id: 'repair-structure',
  
  // Custom resolution shows cost choice on success
  customResolution: {
    component: RepairCostChoice,
    
    validateData(resolutionData: ResolutionData): boolean {
      // RepairCostChoice handles its own validation
      return true;
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      // Execution is handled by ActionsPhase.handleCustomSelection
      // This just validates the custom component data was provided
      if (!resolutionData.customComponentData) {
        return {
          success: false,
          error: 'No repair cost selection provided'
        };
      }
      
      return { success: true };
    }
  },
  
  // Only show custom component on success outcome
  needsCustomResolution(outcome): boolean {
    return outcome === 'success';
  }
};

export default RepairStructureAction;
