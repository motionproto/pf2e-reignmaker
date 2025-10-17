/**
 * Repair Structure Action Implementation
 * Handles structure repair business logic
 */

import type { CustomActionImplementation } from './index';
import type { ResolutionData } from '../../../types/modifiers';
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult 
} from './ActionHelpers';
import RepairCostChoice from '../../../view/kingdom/components/RepairCostChoice.svelte';
import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import { settlementStructureManagement } from '../../../services/structures/management';
import { StructureCondition } from '../../../models/Settlement';

const RepairStructureAction: CustomActionImplementation = {
  id: 'repair-structure',
  
  // Custom resolution shows cost choice on success and handles repair logic
  customResolution: {
    component: RepairCostChoice,
    
    validateData(resolutionData: ResolutionData): boolean {
      const data = resolutionData.customComponentData;
      
      // Check required data
      if (!data?.structureId || !data?.settlementId || !data?.cost) {
        return false;
      }
      
      // Validate affordability
      const actor = getKingdomActor();
      const kingdom = actor?.getKingdom();
      if (!kingdom) return false;
      
      for (const [resource, amount] of Object.entries(data.cost)) {
        const available = (kingdom.resources as any)[resource] || 0;
        if (available < (amount as number)) {
          return false;
        }
      }
      
      return true;
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      logActionStart('repair-structure', 'Processing repair');
      
      try {
        const { structureId, settlementId, cost } = resolutionData.customComponentData;
        
        if (!structureId || !settlementId || !cost) {
          return createErrorResult('Missing repair data');
        }
        
        const actor = getKingdomActor();
        if (!actor) {
          return createErrorResult('No kingdom actor available');
        }
        
        const kingdom = actor.getKingdom();
        if (!kingdom) {
          return createErrorResult('No kingdom data available');
        }
        
        // 1. Deduct resources
        await updateKingdom(k => {
          for (const [resource, amount] of Object.entries(cost)) {
            if ((k.resources as any)[resource] !== undefined) {
              (k.resources as any)[resource] -= (amount as number);
            }
          }
        });
        
        // 2. Remove damaged condition
        await settlementStructureManagement.updateStructureCondition(
          structureId,
          settlementId,
          StructureCondition.GOOD
        );
        
        // 3. Recalculate settlement properties
        const { settlementService } = await import('../../../services/settlements');
        await settlementService.updateSettlementDerivedProperties(settlementId);
        
        logActionSuccess('repair-structure', 'Structure repaired successfully');
        return createSuccessResult('Structure repaired successfully');
        
      } catch (error) {
        logActionError('repair-structure', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Only show custom component on success outcome
  needsCustomResolution(outcome): boolean {
    return outcome === 'success';
  }
};

export default RepairStructureAction;
