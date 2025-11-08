/**
 * Send Scouts Action Implementation
 * Reveals unexplored hexes on the map
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
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
import { hexSelectorService } from '../../services/hex-selector';
import { worldExplorerService } from '../../services/WorldExplorerService';
import { logger } from '../../utils/Logger';

const SendScoutsAction: CustomActionImplementation = {
  id: 'send-scouts',
  
  /**
   * Check if action requirements are met
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check gold cost only
    // Note: We don't track hex exploration state in our data, so no validation needed
    const goldCost = 1;
    if ((kingdomData.resources?.gold || 0) < goldCost) {
      return {
        met: false,
        reason: 'Insufficient gold',
        requiredResources: new Map([['gold', goldCost]]),
        missingResources: new Map([['gold', goldCost - (kingdomData.resources?.gold || 0)]])
      };
    }
    
    return { met: true };
  },

  /**
   * Custom resolution using hex selector service + World Explorer integration
   */
  customResolution: {
    component: null, // No dialog needed - selector handles UI

    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },

    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('send-scouts', 'Starting scout hex selection');

      try {
        const outcome = instance?.metadata?.outcome || 'success';

        // Determine hex count based on success level
        // Critical Success: 2 hexes, Success: 1 hex, Failure/Critical Failure: 0 hexes
        let hexCount = 0;
        
        if (outcome === 'criticalSuccess') {
          hexCount = 2;
        } else if (outcome === 'success') {
          hexCount = 1;
        } else {
          // Failure or Critical Failure - no hexes to scout
          const message = outcome === 'criticalFailure' 
            ? 'Scouts lost - no hexes revealed'
            : 'No report - no hexes revealed';
          logActionSuccess('send-scouts', message);
          return createSuccessResult(message);
        }
        
        logActionStart('send-scouts', `Outcome: ${outcome}, selecting ${hexCount} hex${hexCount !== 1 ? 'es' : ''}`);

        // Create validation function to filter out already-revealed hexes
        const validateHex = (hexId: string): boolean => {
          // Only allow selection of hexes that are NOT already revealed
          if (worldExplorerService.isAvailable()) {
            const isRevealed = worldExplorerService.isRevealed(hexId);
            if (isRevealed) {

              return false;
            }
          }
          return true;
        };

        // Open hex selector
        const selectedHexes = await hexSelectorService.selectHexes({
          title: `Select ${hexCount} Hex${hexCount !== 1 ? 'es' : ''} to Scout`,
          count: hexCount,
          colorType: 'scout',
          validationFn: validateHex
        });

        // Handle cancellation gracefully (not an error - user choice)
        // No gold deducted if cancelled
        if (!selectedHexes || selectedHexes.length === 0) {
          const message = 'Hex selection cancelled - no gold deducted';
          logActionSuccess('send-scouts', message);
          return createSuccessResult(message);
        }

        // Deduct gold cost (1 gold) AFTER confirming selection
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
          if (!kingdom.resources) kingdom.resources = {};
          if (!kingdom.resources.gold) kingdom.resources.gold = 0;
          kingdom.resources.gold -= 1;
        });

        // Note: Hex reveal now happens in HexSelectorService.handleDone() for scout actions
        // This allows the user to see the World Explorer fog lift before dismissing the panel
        
        const message = `Scouted ${selectedHexes.length} ${selectedHexes.length === 1 ? 'hex' : 'hexes'}: ${selectedHexes.join(', ')}`;
        logActionSuccess('send-scouts', message);
        return createSuccessResult(message);

      } catch (error) {
        logActionError('send-scouts', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },

  // Use custom resolution for all outcomes
  needsCustomResolution(outcome): boolean {
    return true;
  }
};

export default SendScoutsAction;
