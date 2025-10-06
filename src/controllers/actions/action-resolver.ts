/**
 * ActionResolver - Handles player action resolution and validation
 * 
 * This service manages action requirements and delegates outcome application
 * to the unified GameEffectsService.
 */

import type { PlayerAction } from './action-types';
import type { KingdomData } from '../../actors/KingdomActor';
import {
    getLevelBasedDC,
    hasRequiredResources
} from '../shared/resolution-service';
import { createGameEffectsService, type OutcomeDegree } from '../../services/GameEffectsService';

export interface ActionRequirement {
    met: boolean;
    reason?: string;
    requiredResources?: Map<string, number>;
    missingResources?: Map<string, number>;
}

export interface ActionOutcome {
    success: boolean;
    error?: string;
    applied?: {
        resources: Array<{ resource: string; value: number }>;
        specialEffects: string[];
    };
    messages: string[];
}

export class ActionResolver {
    /**
     * Check if an action can be performed based on kingdom state
     */
    checkActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData
    ): ActionRequirement {
        // Check specific action-based requirements
        const specificCheck = this.checkSpecificActionRequirements(action, kingdomData);
        if (!specificCheck.met) {
            return specificCheck;
        }
        
        // Check resource costs using shared utility
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
     * Check specific action-based requirements
     */
    private checkSpecificActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData
    ): ActionRequirement {
        switch (action.id) {
            case 'arrest-dissidents':
                // Needs a justice structure with capacity (simplified check)
                // In full implementation, would check for specific structures
                if (kingdomData.unrest === 0) {
                    return {
                        met: false,
                        reason: 'No unrest to arrest'
                    };
                }
                break;
                
            case 'execute-pardon-prisoners':
            case 'execute-or-pardon-prisoners':
                if (kingdomData.imprisonedUnrest <= 0) {
                    return {
                        met: false,
                        reason: 'No imprisoned unrest to resolve'
                    };
                }
                break;
                
            case 'disband-army':
                if (kingdomData.armies.length === 0) {
                    return {
                        met: false,
                        reason: 'No armies to disband'
                    };
                }
                break;
                
            case 'deploy-army':
            case 'outfit-army':
            case 'recover-army':
            case 'train-army':
                if (kingdomData.armies.length === 0) {
                    return {
                        met: false,
                        reason: 'No armies available'
                    };
                }
                break;
                
            case 'upgrade-settlement':
                if (kingdomData.settlements.length === 0) {
                    return {
                        met: false,
                        reason: 'No settlements to upgrade'
                    };
                }
                break;
        }
        
        return { met: true };
    }
    
    /**
     * Get the modifiers for an action outcome
     * Returns the structured EventModifier array from the action data
     */
    getOutcomeModifiers(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ) {
        const effect = action[outcome];
        // ActionModifier is compatible with EventModifier - resource is always a ResourceType in practice
        return (effect?.modifiers || []) as any[];
    }
    
    /**
     * Execute an action and apply its effects using GameEffectsService
     */
    async executeAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        kingdomData: KingdomData,
        preRolledValues?: Map<number | string, number>
    ): Promise<ActionOutcome> {
        const messages: string[] = [];
        
        // Get outcome message
        const effect = action[outcome];
        if (effect?.description) {
            messages.push(effect.description);
        }
        
        // Get modifiers for this outcome
        const modifiers = this.getOutcomeModifiers(action, outcome);
        
        if (modifiers.length === 0) {
            // No modifiers - action has no mechanical effects
            return {
                success: true,
                messages,
                applied: {
                    resources: [],
                    specialEffects: []
                }
            };
        }
        
        // Use GameEffectsService to apply the outcome
        const gameEffects = await createGameEffectsService();
        const result = await gameEffects.applyOutcome({
            type: 'action',
            sourceId: action.id,
            sourceName: action.name,
            outcome: outcome as OutcomeDegree,
            modifiers,
            preRolledValues
        });
        
        return {
            success: result.success,
            error: result.error,
            applied: result.applied,
            messages
        };
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
            .filter(action => this.checkActionRequirements(action, kingdomData).met);
    }
    
    /**
     * Calculate DC for an action based on character level
     */
    getActionDC(characterLevel: number): number {
        // Use shared level-based DC calculation
        return getLevelBasedDC(characterLevel);
    }
}

// Export singleton instance
export const actionResolver = new ActionResolver();
