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
  console.log('[KingdomHandlers] Registering kingdom operation handlers...');

  // Register updateKingdom handler
  actionDispatcher.register('updateKingdom', async (data: {
    actorId: string;
    updatedKingdom: KingdomData;
  }) => {
    console.log('[KingdomHandlers] Updating kingdom for actor:', data.actorId);
    
    const actor = await getKingdomActor();
    if (!actor || actor.id !== data.actorId) {
      throw new Error(`Kingdom actor ${data.actorId} not found or not active`);
    }
    
    // GM has permission to update directly
    await actor.setKingdom(data.updatedKingdom);
    
    console.log('[KingdomHandlers] Kingdom updated successfully');
  });

  console.log('✅ [KingdomHandlers] Kingdom operation handlers registered');
}
