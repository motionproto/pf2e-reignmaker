/**
 * SellSurplusAction - Custom implementation for Sell Surplus
 * 
 * Allows player to trade 2 resources for gold.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { updateKingdom, getKingdomData } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';
import { getBestTradeRates, getCriticalSuccessRates, hasCommerceStructure } from '../../services/commerce/tradeRates';

export const SellSurplusAction = {
  id: 'sell-surplus',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Must have a commerce structure
    if (!hasCommerceStructure()) {
      return {
        met: false,
        reason: 'Requires a commerce structure (Market Square, Bazaar, Merchant Guild, or Imperial Bank)'
      };
    }
    
    // Need at least 2 of any resource type (based on base trade rate)
    const baseRates = getBestTradeRates();
    const minAmount = baseRates.sell.resourceCost;
    
    const resources = kingdomData.resources;
    const hasEnough = resources && (
      (resources.food || 0) >= minAmount ||
      (resources.lumber || 0) >= minAmount ||
      (resources.stone || 0) >= minAmount ||
      (resources.ore || 0) >= minAmount ||
      (resources.luxuries || 0) >= minAmount
    );
    
    if (!hasEnough) {
      return {
        met: false,
        reason: `Need at least ${minAmount} of any resource to sell`
      };
    }
    
    return { met: true };
  },
  
  customResolution: {
    component: null,
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('sell-surplus', 'Selling surplus resources');
      
      const outcome = instance?.appliedOutcome?.outcome || 'success';
      
      try {
        const kingdom = getKingdomData();
        
        // Show custom dialog to select resource
        const selection = await showSellDialog(kingdom.resources, outcome);
        if (!selection) {
          return createErrorResult('Sale cancelled');
        }
        
        const { resourceType, amount } = selection;
        
        // Validate
        if (amount === 0) {
          return createErrorResult('No resources selected');
        }
        
        // Get trade rates from commerce structures
        // Critical success gets one tier higher
        const tradeRates = outcome === 'criticalSuccess' 
          ? getCriticalSuccessRates() 
          : getBestTradeRates();
        const { resourceCost, goldGain } = tradeRates.sell;
        
        if (amount % resourceCost !== 0) {
          return createErrorResult(`Amount must be divisible by ${resourceCost} (trade in sets of ${resourceCost})`);
        }
        
        // Calculate gold gained based on trade rates
        const goldGained = Math.floor((amount / resourceCost) * goldGain);
        
        if (outcome === 'failure' || outcome === 'criticalFailure') {
          return createSuccessResult('No buyers found this turn.');
        }
        
        // Apply sale - deduct resources and add gold
        await updateKingdom(kingdom => {
          if (kingdom.resources) {
            // Deduct selected resource
            (kingdom.resources as any)[resourceType] = ((kingdom.resources as any)[resourceType] || 0) - amount;
            // Add gold
            kingdom.resources.gold = (kingdom.resources.gold || 0) + goldGained;
          }
        });
        
        const rateInfo = `${resourceCost}:${goldGain}`;
        const tierBonus = outcome === 'criticalSuccess' ? ' (tier bonus!)' : '';
        const message = `Sold ${amount} ${resourceType} for ${goldGained} gold (${rateInfo}${tierBonus})`;
        logActionSuccess('sell-surplus', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('sell-surplus', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to sell surplus');
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

/**
 * Show Svelte dialog for selling resources
 */
async function showSellDialog(
  resources: any,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
): Promise<{ resourceType: string; amount: number } | null> {
  return new Promise(async (resolve) => {
    // Get trade rates (critical success gets tier bonus)
    const tradeRates = outcome === 'criticalSuccess' 
      ? getCriticalSuccessRates() 
      : getBestTradeRates();
    
    // Dynamically import the dialog component
    const { default: SellSurplusDialog } = await import('./SellSurplusDialog.svelte');
    
    // Create a container for the dialog
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    // Mount the Svelte component (Svelte 4 API)
    const component = new SellSurplusDialog({
      target: container,
      props: {
        show: true,
        resources,
        outcome,
        tradeRates
      }
    });
    
    // Listen for events
    component.$on('confirm', (event: any) => {
      const { resourceType, amount } = event.detail;
      cleanup();
      resolve({ resourceType, amount });
    });
    
    component.$on('cancel', () => {
      cleanup();
      resolve(null);
    });
    
    function cleanup() {
      component.$destroy();
      document.body.removeChild(container);
    }
  });
}

export default SellSurplusAction;
