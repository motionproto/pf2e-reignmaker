/**
 * Kingdom Synchronization Hooks
 * Replaces the complex persistence service with simple Foundry hooks
 */

import { setupFoundrySync, updateOnlinePlayers } from '../stores/KingdomStore';
import { wrapKingdomActor } from '../utils/kingdom-actor-wrapper';
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
    initializeKingdomArmiesFolder();
    // NOTE: Territory data loading is now handled by KingdomAppShell.svelte
    // after the actor is properly initialized. Do NOT call loadTerritoryData() here.
  });
  
  // Hook for user connection changes to update online players list
  Hooks.on('userConnected', (user: any, connected: boolean) => {
    console.log(`[Kingdom Sync] User ${user.name} ${connected ? 'connected' : 'disconnected'}`);
    updateOnlinePlayers();
  });
  
  // Hook for updateUser - fires on ALL clients when any user changes (including active status)
  // This ensures all clients see when players connect/disconnect
  Hooks.on('updateUser', (user: any, changes: any, options: any, userId: string) => {
    // Check if the active status changed (connect/disconnect)
    if ('active' in changes) {
      console.log(`[Kingdom Sync] User ${user.name} active status changed to: ${changes.active}`);
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
        console.log(`[Kingdom Sync] Updating "${folderName}" folder permissions...`);
        await folder.update({
          ownership: {
            ...currentOwnership,
            default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
          }
        });
        console.log(`✅ [Kingdom Sync] "${folderName}" folder permissions updated to OWNER`);
      } else {
        console.log(`[Kingdom Sync] "${folderName}" folder already has correct permissions`);
      }
    } else {
      // Folder doesn't exist - create it
      console.log(`[Kingdom Sync] Creating "${folderName}" folder...`);
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
        console.log(`✅ [Kingdom Sync] "${folderName}" folder created with OWNER permissions`);
      } else {
        console.error(`❌ [Kingdom Sync] Failed to create "${folderName}" folder`);
      }
    }
  } catch (error) {
    console.error('[Kingdom Sync] Error initializing Reignmaker Armies folder:', error);
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
      console.log('[Kingdom Sync] Found party actor with kingdom data:', actor.name);
      return wrapKingdomActor(actor);
    }
  }
  
  // Second, look for party actor WITHOUT kingdom data (we'll initialize it)
  for (const actor of actors) {
    if (actor.type === 'party') {
      console.log('[Kingdom Sync] Found party actor without kingdom data:', actor.name, '- will initialize');
      return wrapKingdomActor(actor);
    }
  }
  
  // Fallback: Look for actor with kingdom flag (old system)
  for (const actor of actors) {
    if (actor.getFlag('pf2e-reignmaker', 'isKingdom')) {
      console.log('[Kingdom Sync] Found legacy kingdom actor:', actor.name);
      return wrapKingdomActor(actor);
    }
  }
  
  // No kingdom actor found
  console.warn('[Kingdom Sync] No party actor found. Please create a party actor.');
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
        const result = await territoryService.syncFromKingmaker();
        
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
      const result = await territoryService.syncFromKingmaker();
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
