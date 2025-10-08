/**
 * Army operation handlers for ActionDispatcher
 * Registers handlers for player-initiated army operations that need GM permissions
 */

import { actionDispatcher } from '../ActionDispatcher';
import { armyService } from './index';

/**
 * Register all army operation handlers with the ActionDispatcher
 * Should be called during module initialization
 */
export function registerArmyHandlers(): void {
  console.log('[ArmyHandlers] Registering army operation handlers...');

  // Register createArmy handler
  actionDispatcher.register('createArmy', async (data: {
    name: string;
    level: number;
    actorData?: any;
  }) => {
    console.log('[ArmyHandlers] Creating army:', data);
    const army = await armyService._createArmyInternal(data.name, data.level, data.actorData);
    console.log('[ArmyHandlers] Army created:', army);
    return army;
  });

  // Register disbandArmy handler
  actionDispatcher.register('disbandArmy', async (data: {
    armyId: string;
  }) => {
    console.log('[ArmyHandlers] Disbanding army:', data.armyId);
    const result = await armyService._disbandArmyInternal(data.armyId);
    console.log('[ArmyHandlers] Army disbanded:', result);
    return result;
  });

  console.log('✅ [ArmyHandlers] Army operation handlers registered');
}
