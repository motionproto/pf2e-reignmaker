/**
 * ActionResolver - DEPRECATED: Backward compatibility wrapper
 * 
 * This class now delegates to the new focused services:
 * - ActionAvailabilityService (requirements)
 * - ActionExecutionService (execution)
 * - GameCommandDispatcher (game commands)
 * 
 * Use the new services directly for new code.
 */

import type { PlayerAction } from './action-types';
import type { KingdomData } from '../../actors/KingdomActor';
import { actionAvailabilityService, type ActionRequirement } from '../../services/actions/ActionAvailabilityService';
import { actionExecutionService, type ActionOutcome } from '../../services/actions/ActionExecutionService';

// Re-export types for backward compatibility
export type { ActionRequirement, ActionOutcome };

export class ActionResolver {
    /**
     * Check if an action can be performed based on kingdom state
     * @deprecated Use actionAvailabilityService.checkRequirements() directly
     */
    checkActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData,
        instance?: any
    ): ActionRequirement {
        return actionAvailabilityService.checkRequirements(action, kingdomData, instance);
    }
    
    /**
     * Get the modifiers for an action outcome
     * @deprecated Use actionExecutionService.getOutcomeModifiers() directly
     */
    getOutcomeModifiers(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ) {
        return actionExecutionService.getOutcomeModifiers(action, outcome);
    }
    
    /**
     * Execute an action and apply its effects
     * @deprecated Use actionExecutionService.executeAction() directly
     */
    async executeAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        kingdomData: KingdomData,
        preRolledValues?: Map<number | string, number>
    ): Promise<ActionOutcome> {
        return actionExecutionService.executeAction(action, outcome, kingdomData, preRolledValues);
    }
    
    /**
     * Get available actions for a category
     * @deprecated Use actionAvailabilityService.getAvailableActions() directly
     */
    getAvailableActions(
        category: string,
        kingdomData: KingdomData,
        allActions: PlayerAction[]
    ): PlayerAction[] {
        return actionAvailabilityService.getAvailableActions(category, kingdomData, allActions);
    }
    
    /**
     * Calculate DC for an action based on character level
     * @deprecated Use actionExecutionService.getActionDC() directly
     */
    getActionDC(characterLevel: number): number {
        return actionExecutionService.getActionDC(characterLevel);
    }
}

// Export singleton instance
export const actionResolver = new ActionResolver();
