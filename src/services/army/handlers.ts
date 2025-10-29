/**
 * Army operation handlers for ActionDispatcher
 * Registers handlers for player-initiated army operations that need GM permissions
 */

import { actionDispatcher } from '../ActionDispatcher';
import { armyService } from './index';
import { updateActor, addItemToActor, removeItemFromActor } from '../actors/folderManager';
import type { ActorUpdateData, ItemData } from '../actors/folderManager';

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

  // Register updateArmyActor handler
  actionDispatcher.register('updateArmyActor', async (data: {
    actorId: string;
    updateData: ActorUpdateData;
  }) => {

    const actor = await updateActor(data.actorId, data.updateData);

    return actor;
  });

  // Register addItemToArmy handler
  actionDispatcher.register('addItemToArmy', async (data: {
    actorId: string;
    itemData: ItemData;
  }) => {

    const item = await addItemToActor(data.actorId, data.itemData);

    return item;
  });

  // Register removeItemFromArmy handler
  actionDispatcher.register('removeItemFromArmy', async (data: {
    actorId: string;
    itemId: string;
  }) => {

    await removeItemFromActor(data.actorId, data.itemId);

  });

}
