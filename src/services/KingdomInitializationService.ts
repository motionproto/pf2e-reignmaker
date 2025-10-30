/**
 * Kingdom Initialization Service
 * 
 * Handles complete kingdom data initialization after import.
 * This runs during Stage 1 (WelcomeDialog) to ensure all derived properties
 * are calculated before Turn 1 begins.
 */

import { logger } from '../utils/Logger';
import type { KingdomActor } from '../actors/KingdomActor';

/**
 * Initialize all kingdom derived data after import
 * Should be called immediately after territory import completes
 * 
 * @param actor - The kingdom actor (wrapped with kingdom methods)
 */
export async function initializeKingdomData(actor: any): Promise<void> {

  try {
    // 1. Build production cache
    const { calculateProduction } = await import('./economics/production');
    await actor.updateKingdomData((kingdom: any) => {
      const result = calculateProduction(kingdom.hexes || [], []);
      kingdom.worksiteProduction = Object.fromEntries(result.totalProduction);
      kingdom.worksiteProductionByHex = result.byHex.map((e: any) => [e.hex, e.production]);
    });

    // 3. Initialize all resource types (ensure they exist even if 0)
    await actor.updateKingdomData((kingdom: any) => {
      const requiredResources = [
        'gold', 'food', 'lumber', 'stone', 'ore', 'luxuries',
        'foodCapacity', 'armyCapacity', 'diplomaticCapacity', 'imprisonedUnrestCapacity'
      ];
      
      for (const resource of requiredResources) {
        if (kingdom.resources[resource] === undefined) {
          kingdom.resources[resource] = 0;
        }
      }
    });

    // 4. Wait for Foundry flag synchronization to propagate
    // Give the Foundry actor update system time to sync across clients
    await new Promise(resolve => setTimeout(resolve, 150));

  } catch (error) {
    logger.error('❌ [KingdomInit] Initialization failed:', error);
    throw error;
  }
}

/**
 * Check if kingdom data is fully initialized and ready for Turn 1
 * 
 * @param kingdom - Kingdom data to check
 * @returns true if all required data exists
 */
export function isKingdomDataReady(kingdom: any): boolean {
  if (!kingdom) return false;
  
  // Check that production cache exists
  if (!kingdom.worksiteProduction) return false;
  
  // Check that all required resources exist
  const requiredResources = [
    'gold', 'food', 'lumber', 'stone', 'ore', 'luxuries',
    'foodCapacity', 'armyCapacity', 'diplomaticCapacity', 'imprisonedUnrestCapacity'
  ];
  
  for (const resource of requiredResources) {
    if (kingdom.resources[resource] === undefined) {
      return false;
    }
  }
  
  return true;
}
