/**
 * Claim Hexes Action Implementation
 * Uses hex selector service to let players select hexes on the map
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { KingdomData } from '../../actors/KingdomActor';
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

const ClaimHexesAction: CustomActionImplementation = {
  id: 'claim-hexes',
  
  // No checkRequirements needed - action has no cost and is always available
  // The hex selector will enforce adjacency during selection
  
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
        
        // Import validator
        const { validateClaimHex } = await import('./claimHexValidator');
        
        // Invoke hex selector service with validation
        const proficiencyName = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'][proficiencyRank] || 'Unknown';
        const selectedHexes = await hexSelectorService.selectHexes({
          title: `Select ${hexCount} Hex${hexCount !== 1 ? 'es' : ''} to Claim`,
          count: hexCount,
          colorType: 'claim',
          validationFn: validateClaimHex
        });
        
        // Handle cancellation
        if (!selectedHexes || selectedHexes.length === 0) {
          logActionError('claim-hexes', new Error('Hex selection cancelled'));
          return createErrorResult('Hex selection cancelled');
        }
        
        // Update Kingdom Store directly (Kingdom Store is the source of truth, NOT Kingmaker)
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
          for (const hexId of selectedHexes) {
            const hex = kingdom.hexes.find((h: any) => h.id === hexId);
            if (hex) {
              hex.claimedBy = 1;
              console.log(`🏴 [ClaimHexes] Claimed hex ${hexId} in Kingdom Store`);
            } else {
              console.warn(`[ClaimHexes] Hex ${hexId} not found in Kingdom Store`);
            }
          }
          
          // Update kingdom size (count of claimed hexes)
          kingdom.size = kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length;
          
          console.log(`✅ [ClaimHexes] Updated Kingdom Store - now ${kingdom.size} claimed hex${kingdom.size !== 1 ? 'es' : ''}`);
        });
        
        // Ensure PIXI container is visible (scene control active)
        const { ReignMakerMapLayer } = await import('../../services/map/ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        mapLayer.showPixiContainer();
        console.log('[ClaimHexes] ✅ Scene control activated (PIXI container visible)');
        
        // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
        // No need to manually call showOverlay() - the reactive subscriptions handle it!
        // Territory and border overlays subscribe to claimedHexes store and auto-redraw.
        console.log('[ClaimHexes] 🔄 Reactive overlays will auto-update from Kingdom Store change');
        
        
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
