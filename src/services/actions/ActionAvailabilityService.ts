/**
 * ActionAvailabilityService
 * 
 * Handles action requirement checking and filtering.
 * Separated from ActionResolver for Single Responsibility Principle.
 */

import type { PlayerAction } from '../../controllers/actions/action-types';
import type { KingdomData } from '../../actors/KingdomActor';
import { pipelineRegistry } from '../../pipelines/PipelineRegistry';
import { checkCustomRequirements } from '../../controllers/actions/implementations';

export interface ActionRequirement {
    met: boolean;
    reason?: string;
    requiredResources?: Map<string, number>;
    missingResources?: Map<string, number>;
}

function hasRequiredResources(kingdom: KingdomData, required: Map<string, number>): { valid: boolean; missing?: Map<string, number> } {
  const missing = new Map<string, number>();
  for (const [resource, amount] of required.entries()) {
    const current = kingdom.resources?.[resource] || 0;
    if (current < amount) {
      missing.set(resource, amount - current);
    }
  }
  return missing.size > 0 ? { valid: false, missing } : { valid: true };
}

export class ActionAvailabilityService {
    /**
     * Check if an action can be performed based on kingdom state
     */
    checkRequirements(
        action: PlayerAction,
        kingdomData: KingdomData,
        instance?: any
    ): ActionRequirement {
        // 1. Check pipeline requirements first (single source of truth)
        const pipeline = pipelineRegistry.getPipeline(action.id);
        if (pipeline?.requirements) {
            return pipeline.requirements(kingdomData, instance);
        }
        
        // 2. Check for custom implementation (deprecated but kept for compatibility)
        const customCheck = checkCustomRequirements(action.id, kingdomData, instance);
        if (customCheck !== null) {
            return customCheck;
        }
        
        // 3. Check resource costs using shared utility
        if (action.cost && action.cost.size > 0) {
            const resourceCheck = hasRequiredResources(kingdomData, action.cost);
            
            if (!resourceCheck.valid) {
                return {
                    met: false,
                    reason: 'Insufficient resources',
                    requiredResources: action.cost,
                    missingResources: resourceCheck.missing
                };
            }
        }
        
        return { met: true };
    }
    
    /**
     * Get available actions for a category
     */
    getAvailableActions(
        category: string,
        kingdomData: KingdomData,
        allActions: PlayerAction[]
    ): PlayerAction[] {
        return allActions
            .filter(action => action.category === category)
            .filter(action => this.checkRequirements(action, kingdomData).met);
    }
}

// Export singleton instance
export const actionAvailabilityService = new ActionAvailabilityService();
