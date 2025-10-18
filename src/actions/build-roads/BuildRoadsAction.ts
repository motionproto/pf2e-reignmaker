/**
 * Build Roads Action Implementation
 * Calculates road segments based on skill proficiency rank
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult 
} from '../shared/ActionHelpers';
import { getKingdomActor } from '../../stores/KingdomStore';

/**
 * Convert proficiency rank to number of road segments
 * Critical success always gives at least 2 segments
 * 0 = untrained (2 segments - minimum)
 * 1 = trained (2 segments - minimum)
 * 2 = expert (2 segments)
 * 3 = master (3 segments)
 * 4 = legendary (4 segments)
 */
function getRoadSegmentsFromProficiency(proficiencyRank: number): number {
  return Math.max(2, proficiencyRank);
}

const BuildRoadsAction: CustomActionImplementation = {
  id: 'build-roads',
  
  /**
   * Custom resolution to calculate road segments based on proficiency
   */
  customResolution: {
    component: null, // No custom UI needed
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('build-roads', 'Calculating road segments');
      
      try {
        const outcome = instance?.metadata?.outcome || 'success';
        
        // Get the proficiency rank from the roll metadata
        // This should be stored by PF2eSkillService when the roll was made
        let proficiencyRank = 0;
        
        // Try to get proficiency from the pending check flag
        const pendingCheck = await game.user?.getFlag('pf2e-reignmaker', 'pendingCheck') as any;
        if (pendingCheck?.proficiencyRank !== undefined) {
          proficiencyRank = pendingCheck.proficiencyRank;
        }
        
        // Calculate road segments based on outcome
        let roadSegments = 0;
        let message = '';
        
        switch (outcome) {
          case 'criticalSuccess':
            // Critical success: segments based on proficiency
            roadSegments = getRoadSegmentsFromProficiency(proficiencyRank);
            const proficiencyName = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'][proficiencyRank] || 'Unknown';
            message = `Build ${roadSegments} road segment${roadSegments !== 1 ? 's' : ''} (${proficiencyName} proficiency). Build the targeted road segment${roadSegments !== 1 ? 's' : ''} on the map.`;
            break;
            
          case 'success':
            // Success: 1 segment
            roadSegments = 1;
            message = 'Build 1 road segment. Build the targeted road segment on the map.';
            break;
            
          case 'failure':
            // Failure: no effect
            message = 'No effect';
            break;
            
          case 'criticalFailure':
            // Critical failure: work crews lost (handled by modifiers in JSON)
            message = 'Work crews are lost';
            break;
        }
        
        logActionSuccess('build-roads', `${message} (proficiency rank: ${proficiencyRank})`);
        
        return createSuccessResult(message, {
          roadSegments,
          proficiencyRank,
          outcome
        });
        
      } catch (error) {
        logActionError('build-roads', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Always use custom resolution to calculate segments
  needsCustomResolution(outcome): boolean {
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default BuildRoadsAction;
