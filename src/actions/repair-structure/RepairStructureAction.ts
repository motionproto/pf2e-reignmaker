/**
 * Repair Structure Action Implementation
 * Handles structure repair business logic
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  createSuccessResult,
  createErrorResult,
  replaceTemplatePlaceholders,
  type ResolveResult 
} from '../shared/ActionHelpers';
import RepairCostChoice from './RepairCostChoice.svelte';
import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { settlementStructureManagement } from '../../services/structures/management';
import { structuresService } from '../../services/structures';
import { StructureCondition } from '../../models/Settlement';

const RepairStructureAction: CustomActionImplementation = {
  id: 'repair-structure',
  
  /**
   * Pre-roll dialog configuration
   */
  preRollDialog: {
    dialogId: 'repair-structure',
    extractMetadata: (dialogResult: any) => ({
      structureId: dialogResult.structureId,
      settlementId: dialogResult.settlementId
    })
  },
  
  /**
   * Check if action has custom requirements
   */
  checkRequirements(kingdomData: any): { met: boolean; reason?: string } {
    // Check if there are any damaged structures to repair
    const actor = getKingdomActor();
    if (!actor) return { met: false, reason: 'No kingdom actor available' };
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) return { met: false, reason: 'No kingdom data available' };
    
    // Check if any settlements have damaged structures
    const repairableStructures = structuresService.getRepairableStructures();
    
    if (repairableStructures.length === 0) {
      return { met: false, reason: 'No damaged structures to repair' };
    }
    
    return { met: true };
  },
  
  // Custom resolution shows cost choice on success and handles repair logic
  customResolution: {
    component: RepairCostChoice,
    
    validateData(resolutionData: ResolutionData): boolean {
      const data = resolutionData.customComponentData;

      // Check if user selected a cost option
      if (!data?.structureId || !data?.settlementId || !data?.cost) {
        const message = 'Please select a repair cost option (dice or half cost)';

        (window as any).ui?.notifications?.warn(message);
        return false;
      }
      
      // Don't check affordability here - that's handled in execute()
      // Validation only checks that a choice was made

      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('repair-structure', 'Processing repair');
      
      try {
        // Get structure data from either customComponentData (success) or instance metadata (critical success)
        let structureId: string | undefined;
        let settlementId: string | undefined;
        let cost: any = null;
        
        // Try customComponentData first (success outcome)
        if (resolutionData.customComponentData?.structureId) {
          structureId = resolutionData.customComponentData.structureId;
          settlementId = resolutionData.customComponentData.settlementId;
          cost = resolutionData.customComponentData.cost;
        } 
        // Fall back to instance metadata (critical success outcome)
        else if (instance?.metadata?.structureId) {
          structureId = instance.metadata.structureId;
          settlementId = instance.metadata.settlementId;
          // No cost for critical success
        }
        
        if (!structureId || !settlementId) {
          return createErrorResult('Missing structure or settlement ID');
        }
        
        const actor = getKingdomActor();
        if (!actor) {
          return createErrorResult('No kingdom actor available');
        }
        
        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return createErrorResult('No kingdom data available');
        }
        
        // If cost is provided, check affordability (success outcome with cost choice)
        if (cost && Object.keys(cost).length > 0) {
          // Check if kingdom can afford the cost
          let canAfford = true;
          for (const [resource, amount] of Object.entries(cost)) {
            const available = (kingdom.resources as any)[resource] || 0;
            if (available < (amount as number)) {
              canAfford = false;
              break;
            }
          }
          
          if (!canAfford) {
            // Cannot afford - increase unrest by 1, don't repair structure
            await updateKingdom(k => {
              k.unrest = (k.unrest || 0) + 1;
            });
            
            const structure = structuresService.getStructure(structureId);
            const structureName = structure?.name || 'structure';
            const message = `You can't afford the repairs for ${structureName}. Unrest increases by 1.`;
            
            // Show prominent warning notification to user
            (window as any).ui?.notifications?.warn(message);
            
            logActionSuccess('repair-structure', message);
            return createSuccessResult(message);
          }
          
          // Can afford - deduct resources
          await updateKingdom(k => {
            for (const [resource, amount] of Object.entries(cost)) {
              if ((k.resources as any)[resource] !== undefined) {
                (k.resources as any)[resource] -= (amount as number);
              }
            }
          });
          logActionSuccess('repair-structure', `Deducted repair cost: ${JSON.stringify(cost)}`);
        } else {
          logActionSuccess('repair-structure', 'Repairing for free (critical success)');
        }
        
        // Remove damaged condition (only reaches here if cost was paid or free)
        // This also recalculates settlement skill bonuses via updateStructureCondition
        await settlementStructureManagement.updateStructureCondition(
          structureId,
          settlementId,
          StructureCondition.GOOD
        );
        
        // Get structure name for template replacement
        const structure = structuresService.getStructure(structureId);
        const structureName = structure?.name || 'structure';
        
        // Load action JSON to get outcome descriptions
        const { actionLoader } = await import('../../controllers/actions/action-loader');
        const action = actionLoader.getAllActions().find(a => a.id === 'repair-structure');
        
        // Determine outcome based on whether cost was paid
        const isFree = !cost || Object.keys(cost).length === 0;
        const outcome = isFree ? 'criticalSuccess' : 'success';
        
        // Get description from JSON and replace {structure} placeholder
        // Access outcome directly on action object (criticalSuccess, success, etc.)
        const description = (action as any)?.[outcome]?.description || 'Structure repaired successfully';
        const finalMessage = replaceTemplatePlaceholders(description, { structure: structureName });
        
        logActionSuccess('repair-structure', finalMessage);
        return createSuccessResult(finalMessage);
        
      } catch (error) {
        logActionError('repair-structure', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Only show custom component for success outcome (cost choice)
  // Critical success is handled via gameEffects in action definition
  needsCustomResolution(outcome): boolean {
    return outcome === 'success';
  }
};

export default RepairStructureAction;
