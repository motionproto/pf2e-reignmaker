/**
 * Outfit Army Action - Custom Implementation
 * 
 * Validates that at least one army exists with available equipment slots
 * Uses custom resolution component to show equipment selection dialog on success
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import OutfitArmyResolution from './OutfitArmyResolution.svelte';
import { 
  createSuccessResult, 
  createErrorResult,
  type ResolveResult 
} from '../shared/ActionHelpers';

const OutfitArmyAction: CustomActionImplementation = {
  id: 'outfit-army',
  
  /**
   * Pre-roll dialog configuration
   */
  preRollDialog: {
    dialogId: 'army-selection',
    extractMetadata: (dialogResult: any) => ({
      armyId: dialogResult.armyId
    })
  },
  
  /**
   * Check if there are any armies with available equipment slots
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    if (!kingdomData.armies || kingdomData.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available to outfit'
      };
    }
    
    // Check if any army has available equipment slots (< 4 upgrades)
    const eligibleArmies = kingdomData.armies.filter(army => {
      const equipmentCount = army.equipment 
        ? Object.values(army.equipment).filter(Boolean).length 
        : 0;
      return equipmentCount < 4 && army.actorId;
    });
    
    if (eligibleArmies.length === 0) {
      return {
        met: false,
        reason: 'No armies with available equipment slots (all armies fully upgraded or missing actors)'
      };
    }
    
    return { met: true };
  },
  
  /**
   * Custom resolution component to allow player to choose equipment type
   * Only shown on success/criticalSuccess outcomes
   */
  customResolution: {
    component: OutfitArmyResolution,
    
    /**
     * Validate that resolution data contains equipment selection
     */
    validateData(resolutionData: ResolutionData): boolean {
      return !!(resolutionData.customComponentData?.equipmentType);
    },
    
    /**
     * Execute outfitting logic with player's equipment choice
     */
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      try {
        // Get armyId from global state (set during pre-roll dialog)
        const armyId = (globalThis as any).__pendingOutfitArmyArmy;
        
        if (!armyId) {
          return createErrorResult('No army selected for outfitting');
        }
        
        // Get equipment type from resolution data
        const equipmentType = resolutionData.customComponentData?.equipmentType;
        if (!equipmentType) {
          return createErrorResult('No equipment type selected');
        }
        
        // Get outcome (success or criticalSuccess)
        const outcome = resolutionData.customComponentData?.outcome || 'success';
        
        // Use GameCommandsResolver to handle the outfitting
        const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
        const resolver = await createGameCommandsResolver();
        
        const result = await resolver.outfitArmy(armyId, equipmentType, outcome);
        
        if (!result.success) {
          return createErrorResult(result.error || 'Failed to outfit army');
        }
        
        // Clean up global state
        delete (globalThis as any).__pendingOutfitArmyArmy;
        
        return createSuccessResult(result.data?.message || 'Army outfitted successfully');
        
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  },
  
  /**
   * Only success and critical success need custom resolution (equipment selection)
   * Failure/critical failure are handled automatically by JSON costs
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default OutfitArmyAction;
