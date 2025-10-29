/**
 * ActionResolver - Handles player action resolution and validation
 * 
 * This service manages action requirements and delegates outcome application
 * to the unified GameCommandsService.
 */

import type { PlayerAction } from './action-types';
import type { KingdomData } from '../../actors/KingdomActor';
import { createGameCommandsService, type OutcomeDegree } from '../../services/GameCommandsService';
import { logger } from '../../utils/Logger';
import { structuresService } from '../../services/structures';
import { checkCustomRequirements } from './implementations';

// TEMPORARY: Inline helpers from deleted resolution-service.ts
function getLevelBasedDC(level: number): number {
  const dcByLevel: Record<number, number> = {
    1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
    6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
    11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
    16: 35, 17: 36, 18: 38, 19: 39, 20: 40
  };
  return dcByLevel[level] || 15;
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
        // Check for custom implementation first
        const customCheck = checkCustomRequirements(action.id, kingdomData);
        if (customCheck !== null) {
            // Custom implementation exists, use it
            return customCheck;
        }
        
        // Fall back to default requirement checking
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
     * NOTE: This method now only handles actions without custom implementations.
     * Actions with custom implementations should be registered in the implementations/ folder.
     */
    private checkSpecificActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData
    ): ActionRequirement {
        switch (action.id) {
            // arrest-dissidents now handled by ArrestDissidentsAction implementation
                
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
     * Execute an action and apply its effects using GameCommandsService + GameCommandsResolver
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
        const gameCommands = effect?.gameCommands || [];
        
        // Track overall success and applied changes
        let overallSuccess = true;
        const appliedResources: Array<{ resource: string; value: number }> = [];
        const appliedSpecialEffects: string[] = [];
        
        // Apply resource modifiers first (if any)
        if (modifiers.length > 0) {
            const gameCommandsService = await createGameCommandsService();
            const result = await gameCommandsService.applyOutcome({
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
        if (gameCommands.length > 0) {
            const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
            const resolver = await createGameCommandsResolver();
            
            for (const gameEffect of gameCommands) {
                const result = await this.executeGameCommand(
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
    private async executeGameCommand(
        gameEffect: any,
        resolver: any,
        kingdomData: KingdomData,
        isCriticalSuccess: boolean
    ) {

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
            
            case 'giveActorGold': {
                // Get settlementId from gameEffect OR from pending action state
                let settlementId = gameEffect.settlementId;
                
                // If not in gameEffect, check for pending state (for pre-dialog actions)
                if (!settlementId && (globalThis as any).__pendingStipendSettlement) {
                    settlementId = (globalThis as any).__pendingStipendSettlement;
                }
                
                if (!settlementId) {
                    return {
                        success: false,
                        error: 'No settlement selected for stipend collection'
                    };
                }
                
                const multiplier = parseFloat(gameEffect.multiplier) || 1;
                return await resolver.giveActorGold(multiplier, settlementId);
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
                logger.warn(`⚠️ [ActionResolver] Unknown game effect type: ${gameEffect.type}`);
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
