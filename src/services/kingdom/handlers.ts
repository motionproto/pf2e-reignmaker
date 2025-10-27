/**
 * Kingdom operation handlers for ActionDispatcher
 * Registers handlers for player-initiated kingdom operations that need GM permissions
 */

import { actionDispatcher } from '../ActionDispatcher';
import { getKingdomActor } from '../../main.kingdom';
import type { KingdomData } from '../../actors/KingdomActor';
/**
 * Register all kingdom operation handlers with the ActionDispatcher
 * Should be called during module initialization
 */
export function registerKingdomHandlers(): void {

  // Register updateKingdom handler
  actionDispatcher.register('updateKingdom', async (data: {
    actorId: string;
    updatedKingdom: KingdomData;
  }) => {

    const actor = await getKingdomActor();
    if (!actor || actor.id !== data.actorId) {
      throw new Error(`Kingdom actor ${data.actorId} not found or not active`);
    }
    
    // GM has permission to update directly
    await actor.setKingdomData(data.updatedKingdom);

  });

  // Register ensureUploadDirectory handler
  actionDispatcher.register('ensureUploadDirectory', async (data: {
    path: string;
  }) => {

    // @ts-ignore
    const game = (globalThis as any).game;
    
    // Only GM can create directories
    if (!game?.user?.isGM) {
      throw new Error('Only GM can create directories');
    }
    
    try {
      // Try to browse to check if exists
      // @ts-ignore
      await FilePicker.browse('data', data.path);

    } catch (err) {
      // Directory doesn't exist, create it (and parents if needed)
      // Create parent directories first
      const parts = data.path.split('/');
      let currentPath = '';
      
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        try {
          // @ts-ignore
          await FilePicker.browse('data', currentPath);

        } catch (browseErr) {
          // Directory doesn't exist, create it
          // @ts-ignore
          await FilePicker.createDirectory('data', currentPath);

        }
      }
    }
  });

}
