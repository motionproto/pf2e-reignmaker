/**
 * Claim Hexes Action Implementation
 * Calculates hexes based on skill proficiency rank
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
 * Convert proficiency rank to number of hexes
 * Critical success always gives at least 2 hexes
 * 0 = untrained (2 hexes - minimum)
 * 1 = trained (2 hexes - minimum)
 * 2 = expert (2 hexes)
 * 3 = master (3 hexes)
 * 4 = legendary (4 hexes)
 */
function getHexesFromProficiency(proficiencyRank: number): number {
  return Math.max(2, proficiencyRank);
}

const ClaimHexesAction: CustomActionImplementation = {
  id: 'claim-hexes',
  
  /**
   * Custom resolution to calculate hexes based on proficiency
   */
  customResolution: {
    component: null, // No custom UI needed
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('claim-hexes', 'Calculating hexes to claim');
      
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
        
        // Calculate hexes based on outcome
        let hexes = 0;
        let message = '';
        
        switch (outcome) {
          case 'criticalSuccess':
            // Critical success: hexes based on proficiency
            hexes = getHexesFromProficiency(proficiencyRank);
            const proficiencyName = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'][proficiencyRank] || 'Unknown';
            message = `Claim ${hexes} hex${hexes !== 1 ? 'es' : ''} (${proficiencyName} proficiency). Claim the targeted hex${hexes !== 1 ? 'es' : ''} on the map.`;
            break;
            
          case 'success':
            // Success: 1 hex
            hexes = 1;
            message = 'Claim 1 hex. Claim the targeted hex on the map.';
            break;
            
          case 'failure':
            // Failure: no effect
            message = 'No effect';
            break;
            
          case 'criticalFailure':
            // Critical failure: no effect (but generates unrest via JSON modifiers)
            message = 'No effect';
            break;
        }
        
        logActionSuccess('claim-hexes', `${message} (proficiency rank: ${proficiencyRank})`);
        
        return createSuccessResult(message, {
          hexes,
          proficiencyRank,
          outcome
        });
        
      } catch (error) {
        logActionError('claim-hexes', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Always use custom resolution to calculate hexes
  needsCustomResolution(outcome): boolean {
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default ClaimHexesAction;
