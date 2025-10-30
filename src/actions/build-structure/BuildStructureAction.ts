/**
 * BuildStructureAction - Custom implementation for Build Structure
 * 
 * Handles structure construction with build queue integration and
 * critical success cost reduction (50% off).
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { getKingdomActor } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

export const BuildStructureAction = {
  id: 'build-structure',
  
  /**
   * Check if action can be performed
   * Requirements:
   * - Must have at least one settlement
   * - Must have available structures to build
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    const settlements = kingdomData.settlements || [];
    
    if (settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available for construction'
      };
    }
    
    // Additional validation could check for available structures
    // but this is typically handled by the dialog UI
    
    return { met: true };
  },
  
  /**
   * Custom resolution for build structure
   * Handles adding structure to build queue with cost calculation
   */
  customResolution: {
    component: null, // Uses BuildStructureDialog handled by ActionsPhase
    
    /**
     * Validate that resolution data contains required structure info
     */
    validateData(resolutionData: ResolutionData): boolean {
      return !!(
        resolutionData.customComponentData?.structureId &&
        resolutionData.customComponentData?.settlementId
      );
    },
    
    /**
     * Execute custom resolution logic
     * Adds structure to build queue with appropriate cost modifier
     */
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('build-structure', 'Adding structure to build queue');
      
      const { structureId, settlementId } = resolutionData.customComponentData || {};
      
      if (!structureId || !settlementId) {
        return createErrorResult('Build structure data missing');
      }
      
      try {
        // Get structure info
        const { structuresService } = await import('../../services/structures');
        const structure = structuresService.getStructure(structureId);
        
        if (!structure) {
          return createErrorResult('Structure not found');
        }
        
        // Get outcome from instance metadata
        const outcome = instance?.metadata?.outcome || 'success';
        const isCriticalSuccess = outcome === 'criticalSuccess';
        
        // Add to build queue
        const { createBuildStructureController } = await import('../../controllers/BuildStructureController');
        const buildController = await createBuildStructureController();
        
        const result = await buildController.addToBuildQueue(structureId, settlementId);
        
        if (!result.success || !result.project) {
          logActionError('build-structure', result.error || 'Failed to add to build queue');
          return createErrorResult(result.error || 'Failed to start construction');
        }
        
        // Apply cost modifier for critical success (50% off)
        if (isCriticalSuccess) {
          const costModifier = 0.5;
          const actor = getKingdomActor();
          
          if (actor) {
            await actor.updateKingdomData((kingdom: KingdomData) => {
              const project = kingdom.buildQueue?.find((p: any) => p.id === result.project!.id);
              if (project && project.totalCost) {
                // Work with plain objects (already converted by BuildQueueService)
                const totalCostObj = project.totalCost as any;
                const remainingCostObj = project.remainingCost as any;
                
                // Update totalCost with reduced amounts (rounded up)
                for (const [resource, amount] of Object.entries(totalCostObj)) {
                  totalCostObj[resource] = Math.ceil((amount as number) * costModifier);
                }
                
                // Also update remainingCost to match
                if (remainingCostObj) {
                  for (const [resource, amount] of Object.entries(remainingCostObj)) {
                    remainingCostObj[resource] = Math.ceil((amount as number) * costModifier);
                  }
                }
              }
            });
          }
        }
        
        // Show appropriate success message
        const game = (window as any).game;
        if (isCriticalSuccess) {
          game?.ui?.notifications?.info(`🎉 Critical Success! ${structure.name} added to build queue at half cost!`);
        } else {
          game?.ui?.notifications?.info(`✅ ${structure.name} added to build queue!`);
        }
        
        game?.ui?.notifications?.info(`Pay for construction during the Upkeep phase.`);
        
        logActionSuccess('build-structure', `Added ${structure.name} to build queue`);
        return createSuccessResult(`${structure.name} added to build queue`);
        
      } catch (error) {
        logActionError('build-structure', error as Error);
        return createErrorResult(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  },
  
  /**
   * Determine which outcomes need custom resolution
   * For build-structure: success and criticalSuccess need to add to build queue
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default BuildStructureAction;
