/**
 * ArrestDissidentsAction - Custom action implementation for Arrest Dissidents
 * 
 * This action allows players to convert unrest into imprisoned unrest by
 * allocating it to settlements with justice structures (dungeons, prisons, etc.)
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import ArrestDissidentsResolution from '../../view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte';
import {
  hasUnrestToArrest,
  calculateImprisonmentCapacity,
  findSettlementsWithImprisonmentCapacity,
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

export const ArrestDissidentsAction = {
  id: 'arrest-dissidents',
  
  /**
   * Check if action can be performed
   * Requirements:
   * - Kingdom must have unrest > 0
   * - At least one justice structure with available capacity
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check if there's any unrest to arrest
    if (!hasUnrestToArrest(kingdomData)) {
      return {
        met: false,
        reason: 'No unrest to arrest'
      };
    }
    
    // Check imprisonment capacity
    const capacity = calculateImprisonmentCapacity(kingdomData);
    if (capacity.available <= 0) {
      return {
        met: false,
        reason: 'No justice structures with available capacity'
      };
    }
    
    return { met: true };
  },
  
  /**
   * Get custom resolution component for success/criticalSuccess outcomes
   * These outcomes require player to choose how to allocate imprisoned unrest
   * across settlements with justice structures.
   */
  customResolution: {
    component: ArrestDissidentsResolution,
    
    /**
     * Validate that resolution data contains required allocations
     */
    validateData(resolutionData: ResolutionData): boolean {
      return !!(
        resolutionData.customComponentData?.allocations &&
        Object.keys(resolutionData.customComponentData.allocations).length > 0
      );
    },
    
    /**
     * Execute custom resolution logic
     * Allocates imprisoned unrest to settlements based on player choices
     */
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      logActionStart('arrest-dissidents', 'Processing allocations');
      
      // Validate allocations exist
      if (!resolutionData.customComponentData?.allocations) {
        return createErrorResult('No imprisoned unrest allocations provided');
      }
      
      try {
        // Use GameCommandsService to handle the allocation
        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        
        const result = await gameCommands.allocateImprisonedUnrest(
          resolutionData.customComponentData.allocations
        );
        
        if (!result.success) {
          logActionError('arrest-dissidents', result.error || 'Unknown error');
          return result;
        }
        
        logActionSuccess('arrest-dissidents', 'Allocated imprisoned unrest');
        return result;
        
      } catch (error) {
        logActionError('arrest-dissidents', error as Error);
        return createErrorResult(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  },
  
  /**
   * Determine which outcomes need custom resolution
   * For arrest-dissidents: success and criticalSuccess need player choices
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

/**
 * Export for index registry
 */
export default ArrestDissidentsAction;
