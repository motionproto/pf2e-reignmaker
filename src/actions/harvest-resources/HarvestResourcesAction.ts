/**
 * HarvestResourcesAction - Custom implementation for Harvest Resources
 * 
 * Allows player to choose which resource type to harvest.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { updateKingdom } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

export const HarvestResourcesAction = {
  id: 'harvest-resources',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    return { met: true };
  },
  
  customResolution: {
    component: null,
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('harvest-resources', 'Selecting resource to harvest');
      
      const outcome = instance?.appliedOutcome?.outcome || 'success';
      
      try {
        // Prompt for resource selection
        const resourceType = await promptForResourceSelection();
        if (!resourceType) {
          return createErrorResult('Resource selection cancelled');
        }
        
        // Apply outcome
        let amount = 0;
        let unrestGained = 0;
        
        if (outcome === 'criticalSuccess') {
          amount = 2;
        } else if (outcome === 'success') {
          amount = 1;
        } else if (outcome === 'failure') {
          amount = 0;
        } else if (outcome === 'criticalFailure') {
          unrestGained = 1;
        }
        
        // Apply changes
        await updateKingdom(kingdom => {
          if (amount > 0 && kingdom.resources) {
            (kingdom.resources as any)[resourceType] = ((kingdom.resources as any)[resourceType] || 0) + amount;
          }
          if (unrestGained > 0) {
            kingdom.unrest = (kingdom.unrest || 0) + unrestGained;
          }
        });
        
        let message = '';
        if (amount > 0) {
          message = `Harvested ${amount} ${resourceType}!`;
        } else if (unrestGained > 0) {
          message = `Failed to harvest resources and gained ${unrestGained} unrest!`;
        } else {
          message = 'Failed to harvest any resources.';
        }
        
        logActionSuccess('harvest-resources', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('harvest-resources', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to harvest resources');
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return true; // All outcomes need custom resolution to select resource type
  }
};

async function promptForResourceSelection(): Promise<string | null> {
  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    
    const resources = ['food', 'lumber', 'stone', 'ore', 'luxuries'];
    const resourceOptions = resources
      .map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`)
      .join('\n');
    
    new Dialog({
      title: 'Select Resource to Harvest',
      content: `
        <div style="margin-bottom: 1rem;">
          <label for="resource-select" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Resource Type:
          </label>
          <select 
            id="resource-select" 
            name="resource-select" 
            style="width: 100%; padding: 0.5rem;"
          >
            ${resourceOptions}
          </select>
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Harvest',
          callback: (html: any) => {
            const select = html.find('#resource-select')[0] as HTMLSelectElement;
            resolve(select?.value || null);
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

export default HarvestResourcesAction;
