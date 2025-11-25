/**
 * Party Level Sync Hooks
 * 
 * Automatically syncs the highest party character level to kingdom data
 * Triggers when:
 * - Character actors are updated (level changes)
 * - Module initializes (initial sync)
 */

import { getKingdomActor } from '../stores/KingdomStore';
import type { KingdomData } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';

/**
 * Get party level from PF2e party actor
 * Exported for use during kingdom initialization
 * 
 * ✅ FIX: Uses PF2e's built-in party actor system.details.level property
 * This is the official way to get party level in PF2e
 */
export function getHighestPartyLevel(): number {
  const game = (globalThis as any).game;
  if (!game?.actors) return 1;
  
  // ✅ FIX: Get party level directly from PF2e party actor
  // The party actor has system.details.level which tracks the party's level
  const partyActors = Array.from(game.actors).filter((a: any) => a.type === 'party');
  
  if (partyActors.length === 0) return 1;
  
  // Use the first party actor (there should only be one)
  const partyActor = partyActors[0];
  
  // Get level from PF2e party actor structure
  if (partyActor.system?.details?.level !== undefined) {
    // Could be a number or an object with a value property
    const level = typeof partyActor.system.details.level === 'number' 
      ? partyActor.system.details.level 
      : partyActor.system.details.level.value || 1;
    return level;
  }
  
  return 1;
}

/**
 * Sync party level to kingdom data
 */
async function syncPartyLevel() {
  const actor = getKingdomActor();
  if (!actor) return;
  
  const newLevel = getHighestPartyLevel();
  const kingdom = actor.getKingdomData();
  
  if (kingdom && kingdom.partyLevel !== newLevel) {
    console.log(`🎯 [PartyLevelHooks] Party level changed: ${kingdom.partyLevel} → ${newLevel}`);
    await actor.updateKingdomData((k: KingdomData) => {
      k.partyLevel = newLevel;
    });
  }
}

/**
 * Initialize party level hooks
 */
export function initializePartyLevelHooks() {
  const game = (globalThis as any).game;
  
  // Sync on character actor updates (level changes)
  Hooks.on('updateActor', async (actor: any, changes: any, options: any, userId: string) => {
    // Only track player character level changes
    if (actor.type !== 'character' || !actor.hasPlayerOwner) return;
    
    // Check if level changed - PF2e stores level in system.details.level.value
    const levelChanged = changes.system?.details?.level?.value !== undefined;
    
    // Also check if the update data contains level changes (sometimes it's in the update object)
    const updateData = changes.system?.details?.level || changes.system?.details;
    const hasLevelUpdate = updateData?.value !== undefined || updateData?.level !== undefined;
    
    if (levelChanged || hasLevelUpdate) {
      // Get the new level from the updated actor (it's already updated at this point)
      const newLevel = actor.system?.details?.level?.value || actor.level || 1;
      
      console.log(`📊 [PartyLevelHooks] Character "${actor.name}" level changed to ${newLevel}`);
      
      // Sync party level to kingdom
      await syncPartyLevel();
    }
  });
  
  console.log('✅ [PartyLevelHooks] Hooks initialized (initial sync happens during kingdom setup)');
}
