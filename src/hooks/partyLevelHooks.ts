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
 * Get the highest level among all player characters
 * Exported for use during kingdom initialization
 */
export function getHighestPartyLevel(): number {
  const game = (globalThis as any).game;
  if (!game?.actors) return 1;
  
  const playerCharacters = Array.from(game.actors).filter((a: any) => 
    a.type === 'character' && a.hasPlayerOwner
  );
  
  if (playerCharacters.length === 0) return 1;
  
  const maxLevel = Math.max(...playerCharacters.map((a: any) => a.level || 1));
  return maxLevel;
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
    
    // Check if level changed
    if (changes.system?.details?.level?.value !== undefined) {
      const oldLevel = actor.system.details.level.value - (changes.system.details.level.value - actor.level);
      const newLevel = changes.system.details.level.value;
      
      console.log(`📊 [PartyLevelHooks] Character "${actor.name}" leveled: ${oldLevel} → ${newLevel}`);
      
      // Sync party level to kingdom
      await syncPartyLevel();
    }
  });
  
  console.log('✅ [PartyLevelHooks] Hooks initialized (initial sync happens during kingdom setup)');
}
