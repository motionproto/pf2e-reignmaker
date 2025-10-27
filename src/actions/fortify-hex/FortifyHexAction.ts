/**
 * Fortify Hex Action Implementation
 * Builds or upgrades fortifications in claimed territory
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

const FortifyHexAction: CustomActionImplementation = {
  id: 'fortify-hex',
  
  /**
   * Check if action requirements are met
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check if we have claimed hexes to fortify
    const claimedHexes = (kingdomData.hexes || []).filter((h: any) => h.claimedBy === PLAYER_KINGDOM);
    if (claimedHexes.length === 0) {
      return {
        met: false,
        reason: 'No claimed territory to fortify'
      };
    }
    
    // Check if we have resources for at least the cheapest fortification (Earthworks = 1 lumber)
    if ((kingdomData.resources?.lumber || 0) < 1) {
      return {
        met: false,
        reason: 'Insufficient lumber (need at least 1 for Earthworks)',
        requiredResources: new Map([['lumber', 1]]),
        missingResources: new Map([['lumber', 1 - (kingdomData.resources?.lumber || 0)]])
      };
    }
    
    return { met: true };
  },
  
  /**
   * Custom resolution using hex selector service
   */
  customResolution: {
    component: null, // No dialog needed - selector handles UI
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('fortify-hex', 'Starting fortification process');
      
      try {
        const outcome = instance?.metadata?.outcome || 'success';
        
        // Only proceed on success outcomes
        if (outcome === 'failure' || outcome === 'criticalFailure') {
          const failureMessage = outcome === 'criticalFailure' 
            ? 'Critical failure - workers injured in construction mishap'
            : 'Failure - construction accidents delay progress';
          logActionSuccess('fortify-hex', failureMessage);
          return createSuccessResult(failureMessage);
        }
        
        // Load fortification data
        const fortificationData = await import('../../../data/player-actions/fortify-hex.json');
        
        // Import validator
        const { validateFortifyHex } = await import('./fortifyHexValidator');
        
        // Ensure PIXI container and fortification overlay are visible BEFORE selection starts
        const { ReignMakerMapLayer } = await import('../../services/map/ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        mapLayer.showPixiContainer();
        
        // Enable fortification overlay so user can see existing fortifications
        const { OverlayManager } = await import('../../services/map/OverlayManager');
        const overlayManager = OverlayManager.getInstance();
        await overlayManager.showOverlay('fortifications');

        // Invoke hex selector service with validation
        const { hexSelectorService } = await import('../../services/hex-selector');
        
        // Retry loop - keep selector open until affordable hex selected or explicit cancel
        let hexId: string | null = null;
        let hex: any = null;
        let currentTier = 0;
        let affordableTier = 0;
        let tierConfig: any = null;
        let cost: any = {};
        
        while (!hexId) {
          const selectedHexes = await hexSelectorService.selectHexes({
            title: 'Select Hex to Fortify',
            count: 1,
            colorType: 'claim' // Use claim color for fortifications
            // No validationFn - we validate affordability in the retry loop
          });
          
          // Handle cancellation - exit loop
          if (!selectedHexes || selectedHexes.length === 0) {
            logActionSuccess('fortify-hex', 'Fortification cancelled by user');
            return createSuccessResult('Fortification cancelled');
          }
          
          const testHexId = selectedHexes[0];
          
          // Update Kingdom Store
          const { updateKingdom } = await import('../../stores/KingdomStore');
          const { kingdomData } = await import('../../stores/KingdomStore');
          const { get } = await import('svelte/store');
          const kingdom = get(kingdomData);
          
          // Find the hex
          const testHex = kingdom.hexes.find((h: any) => h.id === testHexId);
          if (!testHex) {
            ui.notifications?.error(`Hex ${testHexId} not found. Please try another hex.`);
            continue; // Loop back to selector
          }
          
          // Determine current tier
          currentTier = testHex.fortification?.tier || 0;
          
          if (currentTier >= 4) {
            ui.notifications?.warn('Hex already has maximum fortification (Fortress). Please select another hex.');
            continue; // Loop back to selector
          }
          
          // Find the highest tier we can afford (starting from ideal next tier)
          const idealTier = currentTier + 1;
          const minTier = currentTier === 0 ? 1 : currentTier + 1;
          affordableTier = 0;
          tierConfig = null;
          cost = {};
          
          // Try tiers from ideal down to minimum
          for (let tier = idealTier; tier >= minTier; tier--) {
            const config = fortificationData.tiers[tier - 1];
            const tierCost = config.cost;
            
            // Check if we can afford this tier
            let canAfford = true;
            for (const [resource, amount] of Object.entries(tierCost)) {
              const available = kingdom.resources[resource] || 0;
              if (available < amount) {
                canAfford = false;
                break;
              }
            }
            
            if (canAfford) {
              affordableTier = tier;
              tierConfig = config;
              cost = tierCost;
              break;
            }
          }
          
          // If we can't afford even the minimum tier for this hex
          if (!tierConfig) {
            const minTierConfig = fortificationData.tiers[minTier - 1];
            const missingResources: string[] = [];
            for (const [resource, amount] of Object.entries(minTierConfig.cost)) {
              const available = kingdom.resources[resource] || 0;
              if (available < amount) {
                missingResources.push(`${resource}: need ${amount}, have ${available}`);
              }
            }
            ui.notifications?.error(`Cannot afford upgrade for this hex (${missingResources.join(', ')}). Try another hex or cancel.`);
            continue; // Loop back to selector
          }
          
          // Success - we found an affordable hex
          hexId = testHexId;
          hex = testHex;
        }
        
        const nextTier = affordableTier;
        const idealTier = currentTier + 1;
        
        // Notify if we're building a lower tier than ideal
        if (nextTier < idealTier) {
          const idealConfig = fortificationData.tiers[idealTier - 1];
          ui.notifications?.warn(`Insufficient resources for ${idealConfig.name}. Building ${tierConfig.name} instead.`);
        }
        
        // Get fresh kingdom reference for the update
        const { updateKingdom } = await import('../../stores/KingdomStore');
        
        // Deduct resources and update fortification
        await updateKingdom(kingdom => {
          // Deduct resources
          for (const [resource, amount] of Object.entries(cost)) {
            kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) - (amount as number));
          }
          
          // Update hex fortification
          const hex = kingdom.hexes.find((h: any) => h.id === hexId);
          if (hex) {
            hex.fortification = {
              tier: nextTier as 1 | 2 | 3 | 4,
              maintenancePaid: true,
              turnBuilt: kingdom.currentTurn  // No maintenance required on turn built
            };

          }
        });
        
        // ✅ REACTIVE OVERLAYS: Kingdom Store change automatically triggers overlay updates
        // The fortification overlay is already active and subscribed to kingdomData changes

        const actionVerb = currentTier === 0 ? 'Built' : `Upgraded to`;
        const costSummary = Object.entries(cost)
          .map(([r, a]) => `${a} ${r}`)
          .join(', ');
        
        // Include benefit description from tier data
        const benefits = tierConfig.description;
        
        const message = outcome === 'criticalSuccess'
          ? `${actionVerb} ${tierConfig.name} at hex ${hexId} (cost: ${costSummary}). ${benefits}. Unrest reduced by 1.`
          : `${actionVerb} ${tierConfig.name} at hex ${hexId} (cost: ${costSummary}). ${benefits}`;
        
        logActionSuccess('fortify-hex', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('fortify-hex', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Only use custom resolution for success outcomes
  needsCustomResolution(outcome): boolean {
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default FortifyHexAction;
