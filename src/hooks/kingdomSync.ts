/**
 * Kingdom Synchronization Hooks
 * Replaces the complex persistence service with simple Foundry hooks
 */

import { setupFoundrySync, updateOnlinePlayers } from '../stores/KingdomStore';
import { wrapKingdomActor } from '../utils/kingdom-actor-wrapper';
import type { KingdomActor } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';
import { checkAndFixPermissions } from '../utils/kingdom-permissions';

declare const Hooks: any;
declare const game: any;

/**
 * Initialize kingdom synchronization system
 * Called once during module initialization
 */
export function initializeKingdomSync(): void {

  // Setup store synchronization hooks
  setupFoundrySync();
  
  // Setup additional game hooks
  setupGameHooks();

}

/**
 * Setup game-specific hooks
 */
function setupGameHooks(): void {
  if (typeof Hooks === 'undefined') {
    logger.warn('[Kingdom Sync] Foundry hooks not available');
    return;
  }
  
  // Hook for when a party actor with kingdom data is created
  Hooks.on('createActor', (actor: any, options: any, userId: string) => {
    if (actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) {

    }
  });
  
  // Hook for when a party actor with kingdom data is deleted
  Hooks.on('deleteActor', (actor: any, options: any, userId: string) => {
    if (actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) {

    }
  });
  
  // Hook for ready state - find or create kingdom actor
  Hooks.on('ready', () => {
    initializeKingdomActor();
    // NOTE: Territory data loading is now handled by KingdomAppShell.svelte
    // after the actor is properly initialized. Do NOT call loadTerritoryData() here.
  });
  
  // Hook for user connection changes to update online players list
  Hooks.on('userConnected', (user: any, connected: boolean) => {

    updateOnlinePlayers();
  });
  
  // Hook for updateUser - fires on ALL clients when any user changes (including active status)
  // This ensures all clients see when players connect/disconnect
  Hooks.on('updateUser', (user: any, changes: any, options: any, userId: string) => {
    // Check if the active status changed (connect/disconnect)
    if ('active' in changes) {

      updateOnlinePlayers();
    }
  });
}

/**
 * Find and initialize the kingdom actor (party actor with kingdom data)
 */
async function initializeKingdomActor(): Promise<void> {
  const kingdomActor = findKingdomActor();
  
  if (!kingdomActor) {
    logger.warn('[Kingdom Sync] No kingdom actor found. Please ensure the party actor has kingdom data initialized.');
    logger.warn('[Kingdom Sync] Kingdom data should be stored in: flags["pf2e-reignmaker"]["kingdom-data"]');
    return;
  }
  
  // Check and fix permissions on load (GM only, players get warning)
  // This ensures all players have ownership access to the kingdom actor
  if (kingdomActor.getKingdomData()) {
    await checkAndFixPermissions(kingdomActor);
  }
  
  // Initialize the actor in our store system
  const { initializeKingdomActor } = await import('../stores/KingdomStore');
  initializeKingdomActor(kingdomActor);
  
  // Load territory data from Kingmaker module if available
  await loadTerritoryData();

}

/**
 * Find existing kingdom actor and wrap it with kingdom methods
 */
function findKingdomActor(): any | null {
  const actors = game.actors?.contents || [];
  
  // First, look for party actor with kingdom data
  for (const actor of actors) {
    if (actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) {

      return wrapKingdomActor(actor);
    }
  }
  
  // Second, look for party actor WITHOUT kingdom data (we'll initialize it)
  for (const actor of actors) {
    if (actor.type === 'party') {

      return wrapKingdomActor(actor);
    }
  }
  
  // No kingdom actor found
  logger.warn('[Kingdom Sync] No party actor found. Please create a party actor.');
  return null;
}


/**
 * Get the current kingdom actor
 */
export function getCurrentKingdomActor(): any | null {
  return findKingdomActor();
}

/**
 * Load territory data from Kingmaker module
 * Exported for use in reset operations and manual syncing
 */
export async function loadTerritoryData(): Promise<void> {
  try {
    const { territoryService } = await import('../services/territory');
    
    if (territoryService.isKingmakerAvailable()) {

      // Add a delay to ensure the kingdom actor is fully initialized
      setTimeout(async () => {
        const result = await territoryService.syncFromKingmaker();
        
        if (result.success) {
          // Auto-populate swamp features after territory sync
          try {
            const { waterFeatureService } = await import('../services/map/core/WaterFeatureService');
            await waterFeatureService.ensureSwampFeatures();
            logger.info('[Kingdom Sync] ✅ Auto-populated swamp features');
          } catch (error) {
            logger.error('[Kingdom Sync] Failed to auto-populate swamps:', error);
          }
        } else {
          logger.warn('[Kingdom Sync] Failed to load territory data:', result.error);
        }
      }, 500); // Longer delay to ensure actor is ready
    } else {

    }
  } catch (error) {
    logger.error('[Kingdom Sync] Error loading territory data:', error);
  }
}

/**
 * Manual sync function that can be called from console for debugging
 */
export async function manualTerritorySync(): Promise<void> {
  try {
    const { territoryService } = await import('../services/territory');

    if (territoryService.isKingmakerAvailable()) {
      const result = await territoryService.syncFromKingmaker();

    } else {

    }
  } catch (error) {
    logger.error('[Manual Sync] Error:', error);
  }
}

/**
 * Utility function to get kingdom actor (does not create)
 */
export async function ensureKingdomActor(): Promise<any> {
  const actor = findKingdomActor();
  
  if (!actor) {
    logger.warn('[Kingdom Sync] No kingdom actor found. Kingdom data must be initialized on the party actor.');
  }
  
  return actor;
}
