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
     * Execute an action and apply its effects using GameEffectsService + GameEffectsResolver
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
        
        // Get game effects for this outcome
        const gameEffects = effect?.gameEffects || [];
        
        // Track overall success and applied changes
        let overallSuccess = true;
        const appliedResources: Array<{ resource: string; value: number }> = [];
        const appliedSpecialEffects: string[] = [];
        
        // Apply resource modifiers first (if any)
        if (modifiers.length > 0) {
            const gameEffectsService = await createGameEffectsService();
            const result = await gameEffectsService.applyOutcome({
                type: 'action',
                sourceId: action.id,
                sourceName: action.name,
                outcome: outcome as OutcomeDegree,
                modifiers,
                preRolledValues
            });
            
            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                    applied: result.applied,
                    messages
                };
            }
            
            appliedResources.push(...result.applied.resources);
            appliedSpecialEffects.push(...result.applied.specialEffects);
        }
        
        // Apply game effects (if any)
        if (gameEffects.length > 0) {
            const { createGameEffectsResolver } = await import('../../services/GameEffectsResolver');
            const resolver = await createGameEffectsResolver();
            
            for (const gameEffect of gameEffects) {
                const result = await this.executeGameEffect(
                    gameEffect,
                    resolver,
                    kingdomData,
                    outcome === 'criticalSuccess'
                );
                
                if (result.success) {
                    appliedSpecialEffects.push(gameEffect.type);
                    if (result.data?.message) {
                        messages.push(result.data.message);
                    }
                } else {
                    overallSuccess = false;
                    if (result.error) {
                        messages.push(`Error: ${result.error}`);
                    }
                }
            }
        }
        
        return {
            success: overallSuccess,
            applied: {
                resources: appliedResources,
                specialEffects: appliedSpecialEffects
            },
            messages
        };
    }
    
    /**
     * Execute a single game effect by dispatching to the appropriate resolver method
     */
    private async executeGameEffect(
        gameEffect: any,
        resolver: any,
        kingdomData: KingdomData,
        isCriticalSuccess: boolean
    ) {
        console.log(`🎮 [ActionResolver] Executing game effect: ${gameEffect.type}`);
        
        switch (gameEffect.type) {
            case 'recruitArmy': {
                // Determine army level
                // For 'kingdom-level', we need to get the party level from game.actors
                let level = 1; // Default level
                
                if (gameEffect.level === 'kingdom-level') {
                    // Try to get party level from game actors
                    const game = (globalThis as any).game;
                    if (game?.actors) {
                        // Find party actors and get their level
                        const partyActors = Array.from(game.actors).filter((a: any) => 
                            a.type === 'character' && a.hasPlayerOwner
                        );
                        if (partyActors.length > 0) {
                            // Use the first party member's level as reference
                            level = (partyActors[0] as any).level || 1;
                        }
                    }
                } else if (typeof gameEffect.level === 'number') {
                    level = gameEffect.level;
                }
                    
                return await resolver.recruitArmy(level);
            }
            
            case 'disbandArmy':
                return await resolver.disbandArmy(gameEffect.targetArmy);
            
            case 'foundSettlement': {
                // For critical success on Establish Settlement, grant free structure
                const grantFreeStructure = isCriticalSuccess;
                return await resolver.foundSettlement(
                    gameEffect.name || 'New Settlement',
                    gameEffect.location || { x: 0, y: 0 },
                    grantFreeStructure
                );
            }
            
            // TODO: Add more game effect handlers as we implement them
            // case 'claimHexes': return await resolver.claimHexes(...)
            // case 'buildRoads': return await resolver.buildRoads(...)
            // case 'fortifyHex': return await resolver.fortifyHex(...)
            // case 'upgradeSettlement': return await resolver.upgradeSettlement(...)
            // case 'buildStructure': return await resolver.buildStructure(...)
            // case 'trainArmy': return await resolver.trainArmy(...)
            // etc.
            
            default:
                console.warn(`⚠️ [ActionResolver] Unknown game effect type: ${gameEffect.type}`);
                return {
                    success: false,
                    error: `Unknown game effect type: ${gameEffect.type}`
                };
        }
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
