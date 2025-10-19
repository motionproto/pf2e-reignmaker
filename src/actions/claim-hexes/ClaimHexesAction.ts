/**
 * Claim Hexes Action Implementation
 * Uses hex selector service to let players select hexes on the map
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
import { hexSelectorService } from '../../services/hex-selector';

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

/**
 * Mark hexes as claimed in Kingmaker state
 */
async function markHexesAsClaimed(hexIds: string[]): Promise<void> {
  const km = (globalThis as any).kingmaker;
  if (!km?.state) {
    console.warn('[ClaimHexes] Kingmaker state not available');
    return;
  }
  
  for (const hexId of hexIds) {
    const [i, j] = hexId.split(':').map(Number);
    const numericId = (i * 100) + j;
    
    console.log(`🏴 [ClaimHexes] Claiming hex ${hexId} (${numericId})`);
    
    // Update Kingmaker state
    km.state.updateSource({
      hexes: {
        [numericId]: {
          claimed: true,
          explored: true
        }
      }
    });
  }
  
  await km.state.save();
  console.log(`✅ [ClaimHexes] Claimed ${hexIds.length} hex${hexIds.length !== 1 ? 'es' : ''} in Kingmaker`);
}

const ClaimHexesAction: CustomActionImplementation = {
  id: 'claim-hexes',
  
  /**
   * Custom resolution using hex selector service
   */
  customResolution: {
    component: null, // No dialog needed - selector handles UI
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('claim-hexes', 'Starting hex claim process');
      
      try {
        const outcome = instance?.metadata?.outcome || 'success';
        
        // Get the proficiency rank from the roll metadata
        let proficiencyRank = 0;
        const game = (globalThis as any).game;
        const pendingCheck = await game.user?.getFlag('pf2e-reignmaker', 'pendingCheck') as any;
        if (pendingCheck?.proficiencyRank !== undefined) {
          proficiencyRank = pendingCheck.proficiencyRank;
        }
        
        // Calculate how many hexes can be claimed
        let hexCount = 0;
        
        switch (outcome) {
          case 'criticalSuccess':
            hexCount = getHexesFromProficiency(proficiencyRank);
            break;
          case 'success':
            hexCount = 1;
            break;
          case 'failure':
          case 'criticalFailure':
            // No hexes to claim on failure
            const failureMessage = outcome === 'criticalFailure' 
              ? 'Critical failure - no hexes claimed'
              : 'Failure - no hexes claimed';
            logActionSuccess('claim-hexes', failureMessage);
            return createSuccessResult(failureMessage);
        }
        
        // Invoke hex selector service
        const proficiencyName = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'][proficiencyRank] || 'Unknown';
        const selectedHexes = await hexSelectorService.selectHexes({
          title: `Select ${hexCount} Hex${hexCount !== 1 ? 'es' : ''} to Claim`,
          count: hexCount,
          colorType: 'claim'
        });
        
        // Handle cancellation
        if (!selectedHexes || selectedHexes.length === 0) {
          logActionError('claim-hexes', new Error('Hex selection cancelled'));
          return createErrorResult('Hex selection cancelled');
        }
        
        // Mark hexes as claimed in Kingmaker
        await markHexesAsClaimed(selectedHexes);
        
        // Sync territory to update Reignmaker
        const { territoryService } = await import('../../services/territory');
        await territoryService.syncFromKingmaker();
        
        const message = outcome === 'criticalSuccess'
          ? `Claimed ${hexCount} hex${hexCount !== 1 ? 'es' : ''} (${proficiencyName} proficiency): ${selectedHexes.join(', ')}`
          : `Claimed hex: ${selectedHexes.join(', ')}`;
        
        logActionSuccess('claim-hexes', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('claim-hexes', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Only use custom resolution for success outcomes
  needsCustomResolution(outcome): boolean {
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default ClaimHexesAction;
