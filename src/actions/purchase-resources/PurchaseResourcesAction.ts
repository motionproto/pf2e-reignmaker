/**
 * PurchaseResourcesAction - Custom implementation for Purchase Resources
 * 
 * Allows player to negotiate exchange rate then purchase resources.
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

export const PurchaseResourcesAction = {
  id: 'purchase-resources',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Must have a commerce structure
    if (!hasCommerceStructure()) {
      return {
        met: false,
        reason: 'Requires a commerce structure (Market Square, Bazaar, Merchant Guild, or Imperial Bank)'
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
      logActionStart('purchase-resources', 'Purchasing resources');
      
      const outcome = instance?.appliedOutcome?.outcome || 'success';
      
      try {
        // Handle failure/critical failure outcomes
        if (outcome === 'failure') {
          return createSuccessResult('No trade available this turn.');
        } else if (outcome === 'criticalFailure') {
          // Roll 1d4 and lose that much gold
          const goldLost = Math.floor(Math.random() * 4) + 1;
          await updateKingdom(kingdom => {
            if (kingdom.resources) {
              kingdom.resources.gold = Math.max(0, (kingdom.resources.gold || 0) - goldLost);
            }
          });
          return createSuccessResult(`Negotiations failed! Lost ${goldLost} gold.`);
        }
        
        // Get trade rates from commerce structures
        // Critical success gets one tier higher
        const tradeRates = outcome === 'criticalSuccess' 
          ? getCriticalSuccessRates() 
          : getBestTradeRates();
        const { goldGain: goldCost, resourceCost: resourceGain } = tradeRates.buy;
        // Note: For buying, goldGain is gold cost, resourceCost is resources gained
        
        const kingdom = getKingdomData();
        const availableGold = kingdom.resources?.gold || 0;
        
        if (availableGold < goldCost) {
          return createErrorResult(`Insufficient gold (need at least ${goldCost} gold)`);
        }
        
        // Prompt for resource selection and amount
        const purchase = await promptForPurchase(availableGold, goldCost, resourceGain, outcome);
        if (!purchase) {
          return createErrorResult('Purchase cancelled');
        }
        
        const { resourceType, amount } = purchase;
        
        // Calculate actual cost based on trade ratio
        // amount is in resources, need to calculate gold cost
        const sets = Math.ceil(amount / resourceGain);
        const totalCost = sets * goldCost;
        const actualResources = sets * resourceGain;
        
        // Apply purchase
        await updateKingdom(kingdom => {
          if (kingdom.resources) {
            kingdom.resources.gold = (kingdom.resources.gold || 0) - totalCost;
            (kingdom.resources as any)[resourceType] = ((kingdom.resources as any)[resourceType] || 0) + actualResources;
          }
        });
        
        const rateInfo = `${goldCost}:${resourceGain}`;
        const tierBonus = outcome === 'criticalSuccess' ? ' (tier bonus!)' : '';
        const message = `Purchased ${actualResources} ${resourceType} for ${totalCost} gold (${rateInfo}${tierBonus})`;
        logActionSuccess('purchase-resources', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('purchase-resources', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to purchase resources');
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return true; // All outcomes need custom handling
  }
};

async function promptForPurchase(
  availableGold: number,
  goldCost: number,
  resourceGain: number,
  outcome: string
): Promise<{ resourceType: string; amount: number } | null> {
  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    
    const resources = ['food', 'lumber', 'stone', 'ore', 'luxuries'];
    const resourceOptions = resources
      .map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`)
      .join('\n');
    
    const maxSets = Math.floor(availableGold / goldCost);
    const maxResources = maxSets * resourceGain;
    
    const outcomeNote = outcome === 'criticalSuccess' 
      ? ' <span style="color: #fbbf24; font-weight: bold;">(Critical Success!)</span>'
      : '';
    
    new Dialog({
      title: 'Purchase Resources',
      content: `
        <div style="margin-bottom: 1rem;">
          <p style="margin-bottom: 0.5rem;">
            <strong>Exchange Rate:</strong> ${goldCost} gold → ${resourceGain} resource${resourceGain > 1 ? 's' : ''}${outcomeNote}
          </p>
          <p style="margin-bottom: 1rem; color: #888;">
            Available Gold: ${availableGold} (can buy up to ${maxResources} resources)
          </p>
          
          <label for="resource-select" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Resource Type:
          </label>
          <select 
            id="resource-select" 
            name="resource-select" 
            style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;"
          >
            ${resourceOptions}
          </select>
          
          <label for="amount-input" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Amount (resources):
          </label>
          <input 
            type="number" 
            id="amount-input" 
            name="amount-input" 
            min="${resourceGain}" 
            max="${maxResources}" 
            step="${resourceGain}"
            value="${resourceGain}" 
            style="width: 100%; padding: 0.5rem;"
          />
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-shopping-cart"></i>',
          label: 'Purchase',
          callback: (html: any) => {
            const select = html.find('#resource-select')[0] as HTMLSelectElement;
            const input = html.find('#amount-input')[0] as HTMLInputElement;
            const resourceType = select?.value;
            const amount = parseInt(input?.value || `${resourceGain}`, 10);
            
            if (amount > maxResources) {
              const ui = (globalThis as any).ui;
              ui?.notifications?.warn(`Cannot afford ${amount} resources (max: ${maxResources})`);
              resolve(null);
            } else if (amount % resourceGain !== 0) {
              const ui = (globalThis as any).ui;
              ui?.notifications?.warn(`Amount must be divisible by ${resourceGain} (trade in sets of ${resourceGain})`);
              resolve(null);
            } else {
              resolve({ resourceType, amount });
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'ok',
      close: () => resolve(null)
    }).render(true);
  });
}

export default PurchaseResourcesAction;
