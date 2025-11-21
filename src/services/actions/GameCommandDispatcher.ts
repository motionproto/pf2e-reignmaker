/**
 * GameCommandDispatcher
 * 
 * Handles dispatching individual game commands to their resolvers.
 * Separated from ActionResolver for Single Responsibility Principle.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';

export class GameCommandDispatcher {
    /**
     * Execute a single game command by dispatching to the appropriate resolver method
     */
    async dispatch(
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
                console.log('⏭️ [GameCommandDispatcher] Skipping recruitArmy - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'disbandArmy': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping disbandArmy - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'foundSettlement': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping foundSettlement - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'giveActorGold': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping giveActorGold - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'trainArmy': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping trainArmy - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'requestMilitaryAidRecruitment': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping requestMilitaryAidRecruitment - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'requestMilitaryAidEquipment': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping requestMilitaryAidEquipment - handled by prepare/commit pattern');
                return { success: true };
            }
            
            case 'requestMilitaryAidFactionAttitude': {
                // PREPARE/COMMIT PATTERN: Skip execution here
                console.log('⏭️ [GameCommandDispatcher] Skipping requestMilitaryAidFactionAttitude - handled by prepare/commit pattern');
                return { success: true };
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
                    if (!modifiers) {
                        return {
                            success: false,
                            error: 'No modifiers provided for rolled dice lookup'
                        };
                    }
                    
                    const imprisonedModifierIndex = modifiers.findIndex(m => 
                        m.resource === 'imprisonedUnrest' && (m.type === 'dice' || m.formula)
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
                
                // Get outcome and conditions from gameEffect
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
            
            default:
                logger.warn(`⚠️ [GameCommandDispatcher] Unknown game command type: ${gameEffect.type}`);
                return {
                    success: false,
                    error: `Unknown game command type: ${gameEffect.type}`
                };
        }
    }
}

// Export singleton instance
export const gameCommandDispatcher = new GameCommandDispatcher();
