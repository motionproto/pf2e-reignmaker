/**
 * Faction operation handlers for ActionDispatcher
 * Registers handlers for player-initiated faction operations that need GM permissions
 */

import { actionDispatcher } from '../ActionDispatcher';
import { logger } from '../../utils/Logger';

/**
 * Register all faction operation handlers with the ActionDispatcher
 * Should be called during module initialization
 */
export function registerFactionHandlers(): void {

  // Register createFactionActor handler
  actionDispatcher.register('createFactionActor', async (data: {
    name: string;
    folderId?: string;
  }) => {

    const actor = await createFactionActorInternal(data.name, data.folderId);

    return actor;
  });

}

/**
 * Internal method - Create faction actor with direct GM permissions
 * This is called by the socket handler on the GM's client
 * DO NOT call this directly from UI - use dispatcher instead
 * 
 * @internal
 */
async function createFactionActorInternal(name: string, folderId?: string): Promise<any> {
  // Use shared folder manager to create actor
  const { createNPCInFolder } = await import('../actors/folderManager');
  
  // Create the actor in the NPCs subfolder (for notable people)
  const actor = await createNPCInFolder(name, 'NPCs');
  
  return actor;
}
