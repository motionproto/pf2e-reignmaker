/**
 * sendScouts execution function
 *
 * Reveals hexes on the map using World Explorer integration.
 * Extracted from send-scouts custom implementation - pure execution logic only.
 */

import { logger } from '../../utils/Logger';
import { worldExplorerService } from '../../services/WorldExplorerService';

/**
 * Execute hex scouting (reveal hexes on map)
 *
 * @param hexIds - Array of hex IDs to reveal
 */
export async function sendScoutsExecution(hexIds: string[]): Promise<void> {
  logger.info(`🔍 [sendScoutsExecution] Scouting ${hexIds.length} hex(es): ${hexIds.join(', ')}`);

  if (!hexIds || hexIds.length === 0) {
    logger.warn('[sendScoutsExecution] No hexes provided');
    return;
  }

  // Reveal hexes using World Explorer integration
  if (worldExplorerService.isAvailable()) {
    worldExplorerService.revealHexes(hexIds);
    logger.info(`✅ [sendScoutsExecution] Successfully revealed ${hexIds.length} hex(es) on map`);
  } else {
    logger.warn('[sendScoutsExecution] World Explorer not available - hexes not revealed on map');
  }

  // Note: No Kingdom Store updates needed - scouting only reveals map fog
  // The hex data itself doesn't change, only the visual fog-of-war state
}
