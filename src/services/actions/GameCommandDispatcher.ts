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
            
            // NOTE: 'reduceImprisoned' and 'deployArmy' cases REMOVED
            // These are now handled directly by pipeline execute functions:
            // - executeOrPardonPrisoners.ts uses reduceImprisonedExecution()
            // - deployArmy.ts uses deployArmyExecution()
            // The global state pattern (__pendingExecuteOrPardonSettlement, __pendingDeployArmy)
            // is no longer used - pipelines read from ctx.metadata instead.
            
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
