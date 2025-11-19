/**
 * ActionExecutionService
 * 
 * Handles action execution orchestration and modifier extraction.
 * Separated from ActionResolver for Single Responsibility Principle.
 */

import type { PlayerAction } from '../../controllers/actions/action-types';
import type { KingdomData } from '../../actors/KingdomActor';
import { createGameCommandsService, type OutcomeDegree } from '../GameCommandsService';
import { logger } from '../../utils/Logger';
import type { SpecialEffect } from '../../types/special-effects';
import { parseLegacyEffect } from '../../types/special-effects';
import { gameCommandDispatcher } from './GameCommandDispatcher';

export interface ActionOutcome {
    success: boolean;
    error?: string;
    applied?: {
        resources: Array<{ resource: string; value: number }>;
        specialEffects: SpecialEffect[];
    };
    messages: string[];
}

// Inline helper for DC calculation
function getLevelBasedDC(level: number): number {
  const dcByLevel: Record<number, number> = {
    1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
    6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
    11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
    16: 35, 17: 36, 18: 38, 19: 39, 20: 40
  };
  return dcByLevel[level] || 15;
}

export class ActionExecutionService {
    /**
     * Get the modifiers for an action outcome
     */
    getOutcomeModifiers(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ) {
        const effect = (action as any).effects?.[outcome] || action[outcome];
        return (effect?.modifiers || []) as any[];
    }
    
    /**
     * Execute an action and apply its effects
     */
    async executeAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        kingdomData: KingdomData,
        preRolledValues?: Map<number | string, number>
    ): Promise<ActionOutcome> {
        console.log(`🎮 [ActionExecutionService] Executing action: ${action.id} (${outcome})`);
        logger.info(`🎮 [ActionExecutionService] Executing action: ${action.id} (${outcome})`);
        const messages: string[] = [];
        
        // Get outcome message
        const effect = (action as any).effects?.[outcome] || action[outcome];
        if (effect?.description) {
            messages.push(effect.description);
        }
        
        // Get modifiers for this outcome
        const modifiers = this.getOutcomeModifiers(action, outcome);
        logger.info(`  📋 Found ${modifiers.length} modifiers`);
        
        // Get game commands for this outcome
        const gameCommands = effect?.gameCommands || [];
        console.log(`  🎯 [ActionExecutionService] Found ${gameCommands.length} game commands for ${action.id}`);
        logger.info(`  🎯 Found ${gameCommands.length} game commands`);
        if (gameCommands.length > 0) {
            console.log(`  🎯 [ActionExecutionService] Game commands:`, gameCommands);
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
        
        // Apply game commands (if any)
        if (gameCommands.length > 0) {
            const { createGameCommandsResolver } = await import('../GameCommandsResolver');
            const resolver = await createGameCommandsResolver();
            
            for (const gameEffect of gameCommands) {
                const result = await gameCommandDispatcher.dispatch(
                    gameEffect,
                    resolver,
                    kingdomData,
                    outcome === 'criticalSuccess',
                    preRolledValues,
                    modifiers
                );
                
                if (result.success) {
                    if (result.data?.message) {
                        const effect = typeof result.data.message === 'string' 
                            ? parseLegacyEffect(result.data.message)
                            : result.data.message;
                        appliedSpecialEffects.push(effect);
                        logger.info(`  💬 GameCommand effect:`, effect);
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
     * Calculate DC for an action based on character level
     */
    getActionDC(characterLevel: number): number {
        return getLevelBasedDC(characterLevel);
    }
}

// Export singleton instance
export const actionExecutionService = new ActionExecutionService();
