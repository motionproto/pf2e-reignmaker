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
      console.log('🔧 [FortifyHex] NEW CODE LOADED - execute() called');
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
        
        // Invoke hex selector service with validation
        // (hexSelectorService now handles all overlay management via temporary overlay system)
        const { hexSelectorService } = await import('../../services/hex-selector');
        
        // Import kingdom store and svelte for getHexInfo callback
        const { kingdomData: kingdomDataStore } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        
        // Retry loop - keep selector open until affordable hex selected or explicit cancel
        let hexId: string | null = null;
        let hex: any = null;
        let currentTier = 0;
        let affordableTier = 0;
        let tierConfig: any = null;
        let cost: any = {};
        
        while (!hexId) {
          const config: any = {
            title: 'Select Hex to Fortify',
            count: 1,
            colorType: 'fortify' as const, // Shows territory, roads, settlements, and fortifications
            
            // Validation function with detailed error messages
            validationFn: (hexId: string) => {
              const kingdom = get(kingdomDataStore) as KingdomData;
              
              // Find the hex
              const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
              if (!hex) {
                return { valid: false, message: 'Hex not found' };
              }
              
              // Must be claimed territory
              if (hex.claimedBy !== PLAYER_KINGDOM) {
                return { valid: false, message: 'Must be in claimed territory' };
              }
              
              // Check current tier
              const currentTier = hex.fortification?.tier || 0;
              if (currentTier >= 4) {
                return { valid: false, message: 'Already at maximum fortification (Fortress)' };
              }
              
              // Cannot fortify hexes with settlements
              const hasSettlement = (kingdom.settlements || []).some(s => {
                if (!s.location || (s.location.x === 0 && s.location.y === 0)) return false;
                const settlementHexId = `${s.location.x}.${s.location.y}`;
                return settlementHexId === hexId;
              });
              
              if (hasSettlement) {
                return { valid: false, message: 'Cannot fortify hexes with settlements' };
              }
              
              // Check affordability for next tier
              const nextTier = currentTier + 1;
              const tierConfig = fortificationData.tiers[nextTier - 1];
              
              if (!tierConfig) {
                return { valid: false, message: 'Invalid tier' };
              }
              
              // Check if we can afford this tier
              const missingResources: string[] = [];
              for (const [resource, amount] of Object.entries(tierConfig.cost)) {
                const available = kingdom.resources[resource] || 0;
                if (available < amount) {
                  const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
                  missingResources.push(`${resourceName}: need ${amount}, have ${available}`);
                }
              }
              
              if (missingResources.length > 0) {
                return { 
                  valid: false, 
                  message: `Cannot afford ${tierConfig.name}. ${missingResources.join(', ')}` 
                };
              }
              
              return { valid: true };
            },
            
            // Display cost information for selected hex
            getHexInfo: (hoveredHexId: string) => {
              console.log('[FortifyHex] getHexInfo called for hex:', hoveredHexId);
              const kingdom = get(kingdomDataStore) as KingdomData;
              
              // Find the hovered hex
              const hoveredHex = kingdom.hexes?.find((h: any) => h.id === hoveredHexId);
              if (!hoveredHex) {
                console.log('[FortifyHex] Hex not found in kingdom data');
                return null;
              }
              
              // Get current fortification tier
              const currentTier = hoveredHex.fortification?.tier || 0;
              
              // Check if already at max tier
              if (currentTier >= 4) {
                console.log('[FortifyHex] Max tier reached');
                return `<div style="color: #FFB347; text-align: center;">
                  <i class="fas fa-crown"></i> Maximum fortification (Fortress)
                </div>`;
              }
              
              // Calculate next tier
              const nextTier = currentTier + 1;
              const tierConfig = fortificationData.tiers[nextTier - 1];
              console.log('[FortifyHex] Displaying cost for tier:', tierConfig.name);
              
              // Check affordability
              const cost = tierConfig.cost;
              const missingResources: string[] = [];
              let canAfford = true;
              
              for (const [resource, amount] of Object.entries(cost)) {
                const available = kingdom.resources[resource] || 0;
                if (available < amount) {
                  canAfford = false;
                  missingResources.push(`${resource}: need ${amount}, have ${available}`);
                }
              }
              
              // Format cost display
              const costStr = Object.entries(cost)
                .map(([r, a]) => `${a} ${r.charAt(0).toUpperCase() + r.slice(1)}`)
                .join(', ');
              
              const affordabilityIcon = canAfford 
                ? '<i class="fas fa-check-circle" style="color: #4CAF50;"></i>'
                : '<i class="fas fa-times-circle" style="color: #FF5252;"></i>';
              
              const affordabilityText = canAfford
                ? '<span style="color: #4CAF50;">✓ Can Afford</span>'
                : `<span style="color: #FF5252;">✗ ${missingResources.join(', ')}</span>`;
              
              return `
                <div style="line-height: 1.6;">
                  <div style="font-weight: bold; margin-bottom: 4px; color: #D2691E;">
                    ${currentTier === 0 ? 'Build' : 'Upgrade to'}: ${tierConfig.name}
                  </div>
                  <div style="margin-bottom: 4px;">
                    <strong>Cost:</strong> ${costStr}
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${affordabilityIcon} ${affordabilityText}
                  </div>
                </div>
              `;
            }
          };
          
          console.log('[FortifyHex] Config object created, has getHexInfo?', !!config.getHexInfo);
          
          const selectedHexes = await hexSelectorService.selectHexes(config);
          
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
