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
  
  // Hook for when a kingdom actor is created
  Hooks.on('createActor', (actor: any, options: any, userId: string) => {
    if (actor.type === 'kingdom' || actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      console.log(`[Kingdom Sync] Kingdom actor created: ${actor.name} by user ${userId}`);
    }
  });
  
  // Hook for when a kingdom actor is deleted
  Hooks.on('deleteActor', (actor: any, options: any, userId: string) => {
    if (actor.type === 'kingdom' || actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      console.log(`[Kingdom Sync] Kingdom actor deleted: ${actor.name} by user ${userId}`);
    }
  });
  
  // Hook for ready state - find or create kingdom actor
  Hooks.on('ready', () => {
    initializeKingdomActor();
  });
}

/**
 * Find or create the kingdom actor
 */
async function initializeKingdomActor(): Promise<void> {
  // Look for existing kingdom actor
  let kingdomActor = findKingdomActor();
  
  if (!kingdomActor) {
    // Create new kingdom actor if none exists and user is GM
    if (game.user?.isGM) {
      kingdomActor = await createKingdomActor();
    } else {
      console.warn('[Kingdom Sync] No kingdom actor found and user is not GM');
      return;
    }
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
  // Look for actor with kingdom flag
  const actors = game.actors?.contents || [];
  
  for (const actor of actors) {
    if (actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      return actor;
    }
  }
  
  // Look for actor named 'Kingdom' as fallback
  return actors.find((actor: any) => actor.name === 'Kingdom') || null;
}

/**
 * Create new kingdom actor
 */
async function createKingdomActor(): Promise<any> {
  console.log('[Kingdom Sync] Creating new kingdom actor...');
  
  const actorData = {
    name: 'Kingdom',
    type: 'character', // Use character type for compatibility
    flags: {
      'pf2e-reignmaker': {
        isKingdom: true
      }
    }
  };
  
  const actor = await Actor.create(actorData);
  
  if (actor) {
    // Initialize with default kingdom data
    const { KingdomActor } = await import('../actors/KingdomActor');
    const kingdomActor = actor as unknown as KingdomActor;
    await kingdomActor.initializeKingdom('New Kingdom');
    
    console.log('[Kingdom Sync] Kingdom actor created successfully');
  }
  
  return actor;
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
 * Utility function to ensure kingdom actor exists
 */
export async function ensureKingdomActor(): Promise<any> {
  let actor = findKingdomActor();
  
  if (!actor && game.user?.isGM) {
    actor = await createKingdomActor();
  }
  
  return actor;
}
