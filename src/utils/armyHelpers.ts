/**
 * Shared Army Utilities
 * Helper functions for army operations used across the codebase
 */

import { logger } from './Logger';

// Import army token images
import cavalryImg from '../img/army_tokens/army-calvary.webp';
import engineersImg from '../img/army_tokens/army-engineers.webp';
import infantryImg from '../img/army_tokens/army-infantry.webp';
import koboldImg from '../img/army_tokens/army-kobold.webp';
import wolvesImg from '../img/army_tokens/army-wolves.webp';

/**
 * Army type definitions with images
 */
export const ARMY_TYPES = {
  cavalry: { name: 'Cavalry', image: cavalryImg },
  engineers: { name: 'Engineers', image: engineersImg },
  infantry: { name: 'Infantry', image: infantryImg },
  kobold: { name: 'Kobold', image: koboldImg },
  wolves: { name: 'Wolves', image: wolvesImg }
} as const;

export type ArmyType = keyof typeof ARMY_TYPES;

/**
 * Place an army token at a settlement location
 * Handles coordinate conversion (row/col to x/y) and centering
 * 
 * @param armyService - Army service instance
 * @param actorId - Actor ID of the army
 * @param settlement - Settlement to place token at
 * @param armyName - Army name (for logging)
 * @returns Promise that resolves when token is placed
 */
export async function placeArmyTokenAtSettlement(
  armyService: any,
  actorId: string,
  settlement: { location: { x: number; y: number }; name: string },
  armyName: string
): Promise<void> {
  const game = (globalThis as any).game;
  const scene = game?.scenes?.current;
  
  if (!scene) {
    logger.warn(`⚠️ [ArmyHelpers] No active scene found, cannot place token for ${armyName}`);
    return;
  }
  
  const hasLocation = settlement.location.x !== 0 || settlement.location.y !== 0;
  if (!hasLocation) {
    logger.warn(`⚠️ [ArmyHelpers] Settlement ${settlement.name} has invalid location (0,0)`);
    return;
  }
  
  // Get canvas grid for coordinate conversion
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    logger.warn(`⚠️ [ArmyHelpers] Canvas grid not available`);
    return;
  }
  
  // Settlement location stores row,col (i,j format)
  const i = settlement.location.x; // row
  const j = settlement.location.y; // column

  // Get precise hex center using GridHex (same method as tokenAnimation.ts)
  // Note: canvas.grid.getCenterPoint() returns incorrect Y values for hex grids
  const GridHex = (globalThis as any).foundry.grid.GridHex;
  const hex = new GridHex({ i, j }, canvas.grid);
  const center = hex.center;

  // Foundry tokens are positioned by top-left corner, so armyService.placeArmyToken
  // will adjust the center coordinates to get the correct top-left position
  const x = center.x;
  const y = center.y;
  
  logger.info(`🗺️ [ArmyHelpers] Placing ${armyName} token at hex (${i},${j}) = pixel (${x}, ${y})`);
  
  // Place token via GM-safe service method
  await armyService.placeArmyToken(actorId, scene.id, x, y);
  logger.info(`✅ [ArmyHelpers] Successfully placed ${armyName} token at ${settlement.name}`);
}
