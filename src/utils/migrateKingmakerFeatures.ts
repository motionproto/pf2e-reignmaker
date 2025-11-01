/**
 * Migration utility to remove kingmakerFeatures from hex data
 * 
 * This is a one-time migration to clean up legacy Kingmaker-specific data
 * that should not persist in our game saves.
 * 
 * Usage: Call from console or hook during initialization
 */

import { getKingdomActor } from '../main.kingdom';
import { logger } from './Logger';

/**
 * Remove kingmakerFeatures from all hexes in kingdom data
 * This is safe to run multiple times (idempotent)
 */
export async function migrateKingmakerFeatures(): Promise<{ 
  success: boolean; 
  hexesCleaned: number; 
  error?: string 
}> {
  try {
    logger.info('[Migration] Starting kingmakerFeatures cleanup...');
    
    const kingdomActor = await getKingdomActor();
    if (!kingdomActor) {
      return { 
        success: false, 
        hexesCleaned: 0, 
        error: 'No kingdom actor found' 
      };
    }
    
    const kingdom = kingdomActor.getKingdomData();
    if (!kingdom) {
      return { 
        success: false, 
        hexesCleaned: 0, 
        error: 'No kingdom data found' 
      };
    }
    
    let hexesCleaned = 0;
    
    // Clean up kingmakerFeatures from all hexes
    await kingdomActor.updateKingdomData(k => {
      for (const hex of k.hexes) {
        const hexAny = hex as any;
        if ('kingmakerFeatures' in hexAny) {
          delete hexAny.kingmakerFeatures;
          hexesCleaned++;
        }
      }
    });
    
    if (hexesCleaned > 0) {
      logger.info(`[Migration] Cleaned up kingmakerFeatures from ${hexesCleaned} hexes`);
      
      const ui = (globalThis as any).ui;
      ui?.notifications?.info(`Migration complete: Cleaned ${hexesCleaned} hexes`);
    } else {
      logger.info('[Migration] No kingmakerFeatures found - kingdom data already clean');
    }
    
    return { 
      success: true, 
      hexesCleaned 
    };
    
  } catch (error) {
    logger.error('[Migration] Failed to migrate kingmakerFeatures:', error);
    return { 
      success: false, 
      hexesCleaned: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if migration is needed (does kingdom data have kingmakerFeatures?)
 */
export async function needsKingmakerFeaturesMigration(): Promise<boolean> {
  try {
    const kingdomActor = await getKingdomActor();
    if (!kingdomActor) return false;
    
    const kingdom = kingdomActor.getKingdomData();
    if (!kingdom) return false;
    
    // Check if any hex has kingmakerFeatures
    return kingdom.hexes.some(hex => 'kingmakerFeatures' in hex);
  } catch (error) {
    logger.error('[Migration] Error checking migration status:', error);
    return false;
  }
}
