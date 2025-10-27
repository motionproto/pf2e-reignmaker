/**
 * Kingdom Synchronization Hooks
 * Replaces the complex persistence service with simple Foundry hooks
 */

import { setupFoundrySync, updateOnlinePlayers } from '../stores/KingdomStore';
import { wrapKingdomActor } from '../utils/kingdom-actor-wrapper';
import type { KingdomActor } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';

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
    if ((actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) || 
        actor.getFlag('pf2e-reignmaker', 'isKingdom')) {

    }
  });
  
  // Hook for when a party actor with kingdom data is deleted
  Hooks.on('deleteActor', (actor: any, options: any, userId: string) => {
    if ((actor.type === 'party' && actor.getFlag('pf2e-reignmaker', 'kingdom-data')) || 
        actor.getFlag('pf2e-reignmaker', 'isKingdom')) {

    }
  });
  
  // Hook for ready state - find or create kingdom actor
  Hooks.on('ready', () => {
    initializeKingdomActor();
    initializeKingdomArmiesFolder();
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
  
  // Initialize the actor in our store system
  const { initializeKingdomActor } = await import('../stores/KingdomStore');
  initializeKingdomActor(kingdomActor);
  
  // Load territory data from Kingmaker module if available
  await loadTerritoryData();

}

/**
 * Initialize Reignmaker Armies folder with proper permissions
 * Called during module startup to ensure folder exists before armies are created
 */
async function initializeKingdomArmiesFolder(): Promise<void> {
  try {
    // Only GMs can create folders
    if (!game.user?.isGM) {
      return;
    }

    const folderName = "Reignmaker Armies";
    
    // Check if folder already exists
    let folder = game.folders?.find((f: any) => 
      f.type === "Actor" && f.name === folderName
    );
    
    if (folder) {
      // Folder exists - verify and fix permissions if needed
      const currentOwnership = folder.ownership || {};
      const needsUpdate = currentOwnership.default !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      
      if (needsUpdate) {

        await folder.update({
          ownership: {
            ...currentOwnership,
            default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
          }
        });

      } else {

      }
    } else {
      // Folder doesn't exist - create it

      folder = await game.folders.documentClass.create({
        name: folderName,
        type: "Actor",
        color: "#5e0000",
        img: "icons/svg/castle.svg",
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        }
      });
      
      if (folder) {

      } else {
        logger.error(`❌ [Kingdom Sync] Failed to create "${folderName}" folder`);
      }
    }
  } catch (error) {
    logger.error('[Kingdom Sync] Error initializing Reignmaker Armies folder:', error);
  }
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
  
  // Fallback: Look for actor with kingdom flag (old system)
  for (const actor of actors) {
    if (actor.getFlag('pf2e-reignmaker', 'isKingdom')) {

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
