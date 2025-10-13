/**
 * Army operation handlers for ActionDispatcher
 * Registers handlers for player-initiated army operations that need GM permissions
 */

import { actionDispatcher } from '../ActionDispatcher';
import { armyService } from './index';
import { logger } from '../../utils/Logger';

/**
 * Register all army operation handlers with the ActionDispatcher
 * Should be called during module initialization
 */
export function registerArmyHandlers(): void {
  logger.debug('[ArmyHandlers] Registering army operation handlers...');

  // Register createArmy handler
  actionDispatcher.register('createArmy', async (data: {
    name: string;
    level: number;
    actorData?: any;
  }) => {
    logger.debug('[ArmyHandlers] Creating army:', data);
    const army = await armyService._createArmyInternal(data.name, data.level, data.actorData);
    logger.debug('[ArmyHandlers] Army created:', army);
    return army;
  });

  // Register disbandArmy handler
  actionDispatcher.register('disbandArmy', async (data: {
    armyId: string;
  }) => {
    logger.debug('[ArmyHandlers] Disbanding army:', data.armyId);
    const result = await armyService._disbandArmyInternal(data.armyId);
    logger.debug('[ArmyHandlers] Army disbanded:', result);
    return result;
  });

  logger.debug('✅ [ArmyHandlers] Army operation handlers registered');
}
