/**
 * Shared Army Utilities
 * Helper functions for army operations used across the codebase
 */

import { logger } from './Logger';
import { armyTypesService } from '../services/armyTypes';
import type { ArmyTypesConfig } from '../types/armyTypes';

/**
 * Get army types asynchronously (preferred method)
 * This will initialize defaults if not set
 */
export async function getArmyTypes(): Promise<ArmyTypesConfig> {
  return armyTypesService.getArmyTypes();
}

/**
 * Get army types synchronously (uses cache, may be stale)
 * Falls back to defaults if cache not populated
 */
export function getArmyTypesSync(): ArmyTypesConfig {
  return armyTypesService.getArmyTypesSync();
}

/**
 * Invalidate cache when types are updated externally
 */
export function invalidateArmyTypesCache(): void {
  armyTypesService.invalidateCache();
}

/**
 * Legacy ARMY_TYPES export for backwards compatibility
 * Uses a Proxy to dynamically fetch from the service cache
 *
 * @deprecated Use getArmyTypes() or getArmyTypesSync() instead
 */
export const ARMY_TYPES: ArmyTypesConfig = new Proxy({} as ArmyTypesConfig, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') return undefined;
    const types = armyTypesService.getArmyTypesSync();
    if (prop in types) {
      const config = types[prop];
      return {
        name: config.name,
        portraitImage: config.portraitImage,
        tokenImage: config.tokenImage,
        // Legacy: provide 'image' as alias for tokenImage for backwards compatibility
        image: config.tokenImage
      };
    }
    return undefined;
  },
  ownKeys(_target) {
    return Object.keys(armyTypesService.getArmyTypesSync());
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') return undefined;
    const types = armyTypesService.getArmyTypesSync();
    if (prop in types) {
      const config = types[prop];
      return {
        enumerable: true,
        configurable: true,
        value: {
          name: config.name,
          portraitImage: config.portraitImage,
          tokenImage: config.tokenImage,
          image: config.tokenImage
        }
      };
    }
    return undefined;
  },
  has(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') return false;
    const types = armyTypesService.getArmyTypesSync();
    return prop in types;
  }
});

/** Army type is now dynamic (string) rather than a fixed union */
export type ArmyType = string;

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
