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
import type { SpecialEffect } from '../../types/special-effects';
import { parseLegacyEffect } from '../../types/special-effects';

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
        specialEffects: SpecialEffect[];
    };
    messages: string[];
}

export class ActionResolver {
    /**
     * Check if an action can be performed based on kingdom state
     */
    checkActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData,
        instance?: any
    ): ActionRequirement {
        // Check for custom implementation first
        const customCheck = checkCustomRequirements(action.id, kingdomData, instance);
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
            
            case 'collect-stipend':
                // Check for taxation structure (Counting House T2+, Treasury T3, Exchequer T4)
                const REVENUE_STRUCTURES = ['counting-house', 'treasury', 'exchequer'];
                const hasTaxationStructure = kingdomData.settlements?.some((s: any) => 
                    s.structureIds?.some((id: string) => REVENUE_STRUCTURES.includes(id))
                );
                
                if (!hasTaxationStructure) {
                    return {
                        met: false,
                        reason: 'Requires Counting House (T2) or higher Taxation structure'
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
        const effect = (action as any).effects?.[outcome] || action[outcome];
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
    console.log(`🎮 [ActionResolver] Executing action: ${action.id} (${outcome})`);
    logger.info(`🎮 [ActionResolver] Executing action: ${action.id} (${outcome})`);
    const messages: string[] = [];
        
        // Get outcome message (check both effects.* and direct properties)
        const effect = (action as any).effects?.[outcome] || action[outcome];
        if (effect?.description) {
            messages.push(effect.description);
        }
        
        // Get modifiers for this outcome
        const modifiers = this.getOutcomeModifiers(action, outcome);
        logger.info(`  📋 Found ${modifiers.length} modifiers`);
        
    // Get game effects for this outcome
    const gameCommands = effect?.gameCommands || [];
    console.log(`  🎯 [ActionResolver] Found ${gameCommands.length} game commands for ${action.id}`);
    logger.info(`  🎯 Found ${gameCommands.length} game commands`);
    if (gameCommands.length > 0) {
      console.log(`  🎯 [ActionResolver] Game commands:`, gameCommands);
      logger.info(`  🎯 Game commands:`, gameCommands);
    }
        if (preRolledValues && preRolledValues.size > 0) {
            logger.info(`  🎲 Pre-rolled values:`, Array.from(preRolledValues.entries()));
        }
        
        // Track overall success and applied changes
        let overallSuccess = true;
        const appliedResources: Array<{ resource: string; value: number }> = [];
        const appliedSpecialEffects: SpecialEffect[] = [];
        
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
                    outcome === 'criticalSuccess',
                    preRolledValues,
                    modifiers  // Pass modifiers so we can look up dice values
                );
                
                if (result.success) {
                    // FIXED: Only push the actual message, not the legacy game command name
                    // Add GameCommand messages to specialEffects (already structured)
                    if (result.data?.message) {
                        // Check if message is already a SpecialEffect object or needs conversion
                        const effect = typeof result.data.message === 'string' 
                            ? parseLegacyEffect(result.data.message)
                            : result.data.message;
                        appliedSpecialEffects.push(effect);
                        logger.info(`  💬 GameCommand effect:`, effect);
                    }
                } else {
                    overallSuccess = false;
                    if (result.error) {
                        // Errors still go to messages for now (could show as special effect in future)
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
        isCriticalSuccess: boolean,
        preRolledValues?: Map<number | string, number>,
        modifiers?: any[]
    ) {

        switch (gameEffect.type) {
            case 'recruitArmy': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping recruitArmy - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'disbandArmy': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping disbandArmy - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'foundSettlement': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping foundSettlement - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'giveActorGold': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping giveActorGold - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'trainArmy': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping trainArmy - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'requestMilitaryAidRecruitment': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping requestMilitaryAidRecruitment - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'requestMilitaryAidEquipment': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This command is prepared in CheckInstanceHelpers and executed in ActionsPhase
                // Executing it here would cause double execution
                console.log('⏭️ [ActionResolver] Skipping requestMilitaryAidEquipment - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'requestMilitaryAidFactionAttitude': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                // This is a Request Military Aid-specific wrapper around adjustFactionAttitude
                // Prepared in CheckInstanceHelpers and executed in ActionsPhase
                console.log('⏭️ [ActionResolver] Skipping requestMilitaryAidFactionAttitude - handled by prepare/commit pattern');
                return { success: true }; // Don't block resolution
            }
            
            case 'reduceImprisoned': {
                // Get settlementId from pending state (pre-dialog action)
                let settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
                
                if (!settlementId) {
                    return {
                        success: false,
                        error: 'No settlement selected for execute/pardon'
                    };
                }
                
                // Handle amount - could be "all", "rolled", or a dice formula
                let amount = gameEffect.amount;
                
                if (amount === 'rolled') {
                    // Find the dice modifier for "imprisoned" resource and get its rolled value
                    // Dice rolls are stored by modifier index in preRolledValues
                    if (!modifiers) {
                        return {
                            success: false,
                            error: 'No modifiers provided for rolled dice lookup'
                        };
                    }
                    
                    const imprisonedModifierIndex = modifiers.findIndex(m => 
                        m.resource === 'imprisoned' && (m.type === 'dice' || m.formula)
                    );
                    
                    if (imprisonedModifierIndex === -1) {
                        return {
                            success: false,
                            error: 'No dice modifier found for imprisoned unrest'
                        };
                    }
                    
                    // Look up by modifier index
                    const rolledValue = preRolledValues?.get(imprisonedModifierIndex);
                    
                    if (rolledValue === undefined) {
                        return {
                            success: false,
                            error: 'Dice roll required before executing game command'
                        };
                    }
                    
                    amount = rolledValue;
                }
                
                return await resolver.reduceImprisoned(settlementId, amount);
            }
            
            case 'deployArmy': {
                // Get armyId and path from pending state (set by ArmyDeploymentPanel)
                const pendingData = (globalThis as any).__pendingDeployArmy;
                
                if (!pendingData) {
                    return {
                        success: false,
                        error: 'No army deployment data available'
                    };
                }
                
                const { armyId, path } = pendingData;
                
                if (!armyId || !path || path.length < 2) {
                    return {
                        success: false,
                        error: 'Invalid deployment data - missing army or path'
                    };
                }
                
                // Get outcome and conditions from gameEffect (passed from action JSON)
                const outcomeString = gameEffect.outcome || 'success';
                const conditionsToApply = gameEffect.conditionsToApply || [];
                
                // Clean up pending data
                delete (globalThis as any).__pendingDeployArmy;
                
                return await resolver.deployArmy(armyId, path, outcomeString, conditionsToApply);
            }
            
            case 'chooseAndGainResource': {
                // Player chooses a resource from list and gains specified amount
                const resources = gameEffect.resources || ['food', 'lumber', 'stone', 'ore'];
                const amount = gameEffect.amount || 1;
                
                return await resolver.chooseAndGainResource(resources, amount);
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
