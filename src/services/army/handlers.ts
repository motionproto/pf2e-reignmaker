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

  // Register createArmy handler
  actionDispatcher.register('createArmy', async (data: {
    name: string;
    level: number;
    type?: string;
    image?: string;
    actorData?: any;
  }) => {

    const army = await armyService._createArmyInternal(data.name, data.level, data.type, data.image, data.actorData);

    return army;
  });

  // Register disbandArmy handler
  actionDispatcher.register('disbandArmy', async (data: {
    armyId: string;
    deleteActor?: boolean;
  }) => {

    const result = await armyService._disbandArmyInternal(data.armyId, data.deleteActor ?? true);

    return result;
  });

  // Register placeArmyToken handler
  actionDispatcher.register('placeArmyToken', async (data: {
    actorId: string;
    sceneId: string;
    x: number;
    y: number;
  }) => {

    await armyService._placeArmyTokenInternal(data.actorId, data.sceneId, data.x, data.y);

  });

}
