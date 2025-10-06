/**
 * Kingdom Synchronization Hooks
 * Replaces the complex persistence service with simple Foundry hooks
 */

import { setupFoundrySync } from '../stores/KingdomStore';
import type { KingdomActor } from '../actors/KingdomActor';

declare const Hooks: any;
declare const game: any;

/**
 * Initialize kingdom synchronization system
 * Called once during module initialization
 */
export function initializeKingdomSync(): void {
  console.log('[Kingdom Sync] Initializing Foundry-based synchronization...');
  
  // Setup store synchronization hooks
  setupFoundrySync();
  
  // Setup additional game hooks
  setupGameHooks();
  
  console.log('[Kingdom Sync] Initialization complete');
}

/**
 * Setup game-specific hooks
 */
function setupGameHooks(): void {
  if (typeof Hooks === 'undefined') {
    console.warn('[Kingdom Sync] Foundry hooks not available');
    return;
  }
  
  // Hook for when a party actor with kingdom data is created
  Hooks.on('createActor', (actor: any, options: any, userId: string) => {
    if ((actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) || 
        actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      console.log(`[Kingdom Sync] Kingdom-enabled actor created: ${actor.name} by user ${userId}`);
    }
  });
  
  // Hook for when a party actor with kingdom data is deleted
  Hooks.on('deleteActor', (actor: any, options: any, userId: string) => {
    if ((actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) || 
        actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      console.log(`[Kingdom Sync] Kingdom-enabled actor deleted: ${actor.name} by user ${userId}`);
    }
  });
  
  // Hook for ready state - find or create kingdom actor
  Hooks.on('ready', () => {
    initializeKingdomActor();
  });
}

/**
 * Find and initialize the kingdom actor (party actor with kingdom data)
 */
async function initializeKingdomActor(): Promise<void> {
  const kingdomActor = findKingdomActor();
  
  if (!kingdomActor) {
    console.warn('[Kingdom Sync] No kingdom actor found. Please ensure the party actor has kingdom data initialized.');
    console.warn('[Kingdom Sync] Kingdom data should be stored in: flags["pf2e-reignmaker"]["kingdom-data"]');
    return;
  }
  
  // Initialize the actor in our store system
  const { initializeKingdomActor } = await import('../stores/KingdomStore');
  initializeKingdomActor(kingdomActor);
  
  // Load territory data from Kingmaker module if available
  await loadTerritoryData();
  
  console.log(`[Kingdom Sync] Kingdom actor initialized: ${kingdomActor.name}`);
}

/**
 * Find existing kingdom actor
 */
function findKingdomActor(): any | null {
  const actors = game.actors?.contents || [];
  
  // First, look for party actor with kingdom data
  for (const actor of actors) {
    if (actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) {
      console.log('[Kingdom Sync] Found party actor with kingdom data:', actor.name);
      return actor;
    }
  }
  
  // Fallback: Look for actor with kingdom flag (old system)
  for (const actor of actors) {
    if (actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      console.log('[Kingdom Sync] Found legacy kingdom actor:', actor.name);
      return actor;
    }
  }
  
  // No kingdom actor found
  console.warn('[Kingdom Sync] No kingdom actor found. Please initialize kingdom data on the party actor.');
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
      console.log('[Kingdom Sync] Loading territory data from Kingmaker module...');
      
      // Add a delay to ensure the kingdom actor is fully initialized
      setTimeout(async () => {
        const result = territoryService.syncFromKingmaker();
        
        if (result.success) {
          console.log(`[Kingdom Sync] Successfully loaded ${result.hexesSynced} hexes and ${result.settlementsSynced} settlements`);
        } else {
          console.warn('[Kingdom Sync] Failed to load territory data:', result.error);
        }
      }, 500); // Longer delay to ensure actor is ready
    } else {
      console.log('[Kingdom Sync] Kingmaker module not available, skipping territory load');
    }
  } catch (error) {
    console.error('[Kingdom Sync] Error loading territory data:', error);
  }
}

/**
 * Manual sync function that can be called from console for debugging
 */
export async function manualTerritorySync(): Promise<void> {
  try {
    const { territoryService } = await import('../services/territory');
    console.log('[Manual Sync] Starting manual territory sync...');
    
    if (territoryService.isKingmakerAvailable()) {
      const result = territoryService.syncFromKingmaker();
      console.log('[Manual Sync] Result:', result);
    } else {
      console.log('[Manual Sync] Kingmaker module not available');
    }
  } catch (error) {
    console.error('[Manual Sync] Error:', error);
  }
}

/**
 * Utility function to get kingdom actor (does not create)
 */
export async function ensureKingdomActor(): Promise<any> {
  const actor = findKingdomActor();
  
  if (!actor) {
    console.warn('[Kingdom Sync] No kingdom actor found. Kingdom data must be initialized on the party actor.');
  }
  
  return actor;
}
