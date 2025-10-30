/**
 * Disband Army Action - Custom Implementation
 * 
 * Validates that at least one army exists before allowing the action
 * Uses custom resolution component to allow player to choose whether to delete the NPC actor
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import DisbandArmyResolution from './DisbandArmyResolution.svelte';
import { 
  createSuccessResult, 
  createErrorResult,
  type ResolveResult 
} from '../shared/ActionHelpers';

const DisbandArmyAction: CustomActionImplementation = {
  id: 'disband-army',
  
  /**
   * Check if there are any armies to disband
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    if (!kingdomData.armies || kingdomData.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available to disband'
      };
    }
    
    return { met: true };
  },
  
  /**
   * Custom resolution component to allow player to choose whether to delete the NPC actor
   */
  customResolution: {
    component: DisbandArmyResolution,
    
    /**
     * Validate that resolution data is present (deleteActor choice)
     */
    validateData(resolutionData: ResolutionData): boolean {
      // Allow missing customComponentData (defaults to true)
      return true;
    },
    
    /**
     * Execute disbanding logic with player's actor deletion choice
     */
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      try {
        // Get armyId from global state (set during pre-roll dialog)
        const armyId = (globalThis as any).__pendingDisbandArmyArmy;
        
        if (!armyId) {
          return createErrorResult('No army selected for disbanding');
        }
        
        // Get deleteActor choice from resolution data (defaults to true)
        const deleteActor = resolutionData.customComponentData?.deleteActor ?? true;
        
        // Use GameCommandsResolver to handle the disbanding
        const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
        const resolver = await createGameCommandsResolver();
        
        const result = await resolver.disbandArmy(armyId, deleteActor);
        
        if (!result.success) {
          return createErrorResult(result.error || 'Failed to disband army');
        }
        
        // Clean up global state
        delete (globalThis as any).__pendingDisbandArmyArmy;
        
        return createSuccessResult(result.data?.message || 'Army disbanded successfully');
        
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  },
  
  /**
   * All outcomes need custom resolution to show the actor deletion choice
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return true;
  }
};

export default DisbandArmyAction;
