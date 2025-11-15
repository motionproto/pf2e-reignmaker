/**
 * sendScouts execution function
 *
 * Extracted from send-scouts custom implementation - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { worldExplorerService } from '../../services/WorldExplorerService';

/**
 * Execute hex scouting
 *
 * @param hexIds - Array of hex IDs to reveal
 */
export async function sendScoutsExecution(hexIds: string[]): Promise<void> {
  logger.info(`🔍 [sendScoutsExecution] Scouting ${hexIds.length} hex(es): ${hexIds.join(', ')}`);

  if (!hexIds || hexIds.length === 0) {
    logger.warn('[sendScoutsExecution] No hexes provided - nothing to scout');
    return;
  }

  // Deduct gold cost (1 gold)
  await updateKingdom(kingdom => {
    if (!kingdom.resources) kingdom.resources = {};
    if (!kingdom.resources.gold) kingdom.resources.gold = 0;
    kingdom.resources.gold -= 1;
    logger.info('[sendScoutsExecution] Deducted 1 gold for scouting');
  });

  // Reveal hexes via World Explorer (if available)
  if (worldExplorerService.isAvailable()) {
    // Filter out already-revealed hexes
    const hexesToReveal = hexIds.filter(hexId => !worldExplorerService.isRevealed(hexId));
    
    if (hexesToReveal.length > 0) {
      worldExplorerService.revealHexes(hexesToReveal);
      logger.info(`[sendScoutsExecution] Revealed ${hexesToReveal.length} hex(es): ${hexesToReveal.join(', ')}`);
    }
    
    const alreadyRevealed = hexIds.filter(hexId => worldExplorerService.isRevealed(hexId));
    if (alreadyRevealed.length > 0) {
      logger.warn(`[sendScoutsExecution] ${alreadyRevealed.length} hex(es) already revealed: ${alreadyRevealed.join(', ')}`);
    }
  } else {
    logger.warn('[sendScoutsExecution] World Explorer service not available - hexes not revealed');
  }

  logger.info(`✅ [sendScoutsExecution] Successfully scouted ${hexIds.length} hex(es)`);
}
