/**
 * Simplified Kingdom Store using Foundry-first architecture
 * Replaces the complex kingdomState and gameState stores
 */

import { writable, derived, get } from 'svelte/store';
import type { KingdomActor, KingdomData } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';
import { TurnPhase } from '../actors/KingdomActor';
import { TurnManager } from '../models/turn-manager';
import { calculateProduction } from '../services/economics/production';
import { PLAYER_KINGDOM } from '../types/ownership';
import { filterVisibleHexes, filterVisibleHexIds } from '../utils/visibility-filter';
import { logger } from '../utils/Logger';

// Core actor store - this is the single source of truth
export const kingdomActor = writable<KingdomActor | null>(null);

// Derived kingdom data - automatically updates when actor updates
export const kingdomData = derived(kingdomActor, ($actor): KingdomData => {
  if (!$actor) return createDefaultKingdom();
  // Actor is wrapped with getKingdomData() method by wrapKingdomActor()
  const data = $actor.getKingdomData?.() || $actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
  return data || createDefaultKingdom();
});

// Convenience derived stores for common UI needs
export const currentTurn = derived(kingdomData, $data => $data.currentTurn);
export const currentPhase = derived(kingdomData, $data => $data.currentPhase);
export const resources = derived(kingdomData, $data => $data.resources);
export const settlements = derived(kingdomData, $data => $data.settlements);
export const armies = derived(kingdomData, $data => $data.armies);
export const unrest = derived(kingdomData, $data => $data.unrest);
// Imprisoned unrest is derived from settlements (sum of all settlement imprisoned unrest)
export const imprisonedUnrest = derived(settlements, $settlements => {
  return $settlements.reduce((sum, s) => sum + (s.imprisonedUnrest || 0), 0);
});
export const fame = derived(kingdomData, $data => $data.fame);

// Current faction view (GM-only feature)
// Allows GMs to switch between viewing different factions' territories
// Must be declared before derived stores that use it
export const currentFaction = writable<string>(PLAYER_KINGDOM);

// ===== CLAIMED TERRITORY DERIVED STORES =====
// Single source of truth for territory filtering logic
// These automatically update when kingdom data changes

/**
 * Hexes claimed by the current faction (claimedBy === currentFaction)
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 * Reactive to faction changes when GMs switch factions
 */
export const claimedHexes = derived(
  [kingdomData, currentFaction],
  ([$data, $faction]) => {
    const claimed = $data.hexes.filter(h => h.claimedBy === $faction);
    return filterVisibleHexes(claimed);
  }
);

/**
 * All claimed hexes grouped by faction (for multi-faction territory display)
 * Returns a Map where key = faction ID (or 'player'), value = array of hexes
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const allClaimedHexesByFaction = derived(
  kingdomData,
  ($data) => {
    const grouped = new Map<string | null, any[]>();
    
    // Group hexes by claimedBy value
    $data.hexes.forEach(h => {
      if (h.claimedBy !== null && h.claimedBy !== undefined) {
        const existing = grouped.get(h.claimedBy) || [];
        existing.push(h);
        grouped.set(h.claimedBy, existing);
      }
    });
    
    // Apply visibility filter to each group
    const filtered = new Map<string | null, any[]>();
    grouped.forEach((hexes, faction) => {
      filtered.set(faction, filterVisibleHexes(hexes));
    });
    
    return filtered;
  }
);

/**
 * All settlements with valid map locations
 * Filters out only unmapped settlements (location 0,0)
 * Uses location as the source of truth (kingmakerLocation is discarded after import)
 */
export const allSettlements = derived(kingdomData, $data => {
  return $data.settlements.filter(s => {
    // Only exclude unmapped settlements (location is the source of truth)
    return s.location.x > 0 || s.location.y > 0;
  });
});

/**
 * Owned settlements - settlements belonging to the current faction
 * Uses the explicit `ownedBy` property (simpler than checking hex claiming)
 * Filters for settlements owned by the current faction (ownedBy === currentFaction)
 * Reactive to faction changes when GMs switch factions
 */
export const ownedSettlements = derived(
  [kingdomData, currentFaction],
  ([$data, $faction]) => {
    return $data.settlements.filter(s => s.ownedBy === $faction);
  }
);

/**
 * Legacy alias for backward compatibility
 * @deprecated Use ownedSettlements instead
 */
export const claimedSettlements = ownedSettlements;

/**
 * Led armies - armies commanded by the current faction
 * Uses the explicit `ledBy` property
 * Filters for armies led by the current faction (ledBy === currentFaction)
 * Reactive to faction changes when GMs switch factions
 */
export const ledArmies = derived(
  [kingdomData, currentFaction],
  ([$data, $faction]) => {
    return $data.armies.filter(a => a.ledBy === $faction);
  }
);

/**
 * Worksite counts from claimed hexes only
 * Calculates by checking hex.worksite.type in claimed hexes
 */
export const claimedWorksites = derived(claimedHexes, $hexes => {
  return $hexes.reduce((counts, hex) => {
    if (hex.worksite?.type) {
      const type = hex.worksite.type;
      // Map worksite types to our count keys
      if (type === 'Farmstead' || type === 'Hunting/Fishing Camp' || type === 'Oasis Farm') {
        counts.farmlands = (counts.farmlands || 0) + 1;
      } else if (type === 'Logging Camp') {
        counts.lumberCamps = (counts.lumberCamps || 0) + 1;
      } else if (type === 'Quarry') {
        counts.quarries = (counts.quarries || 0) + 1;
      } else if (type === 'Mine' || type === 'Bog Mine') {
        counts.mines = (counts.mines || 0) + 1;
      }
    }
    return counts;
  }, {} as Record<string, number>);
});

/**
 * Hexes with worksites (for worksite overlay)
 * Returns full hex objects that have worksite data
 */
export const claimedHexesWithWorksites = derived(claimedHexes, $hexes => 
  $hexes.filter(h => h.worksite?.type)
);

/**
 * Hexes with bounties/commodities (for resources overlay)
 * Returns full hex objects that have commodity data
 * Includes the commodities record for rendering
 */
export const hexesWithBounties = derived(claimedHexes, $hexes => 
  $hexes.filter(h => h.commodities && Object.keys(h.commodities).length > 0)
);

/**
 * Hexes with terrain data (for terrain overlay)
 * Returns all hexes that have terrain information
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const hexesWithTerrain = derived(kingdomData, $data => {
  const withTerrain = $data.hexes.filter(h => h.terrain);
  return filterVisibleHexes(withTerrain);
});

/**
 * Roads from kingdom data (for roads overlay)
 * Returns array of road hex IDs
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const kingdomRoads = derived(kingdomData, $data => {
  // Derive from hexes with hasRoad flag (source of truth)
  const roads = ($data.hexes || [])
    .filter((h: any) => h.hasRoad === true)
    .map((h: any) => h.id);
  return filterVisibleHexIds(roads);
});

/**
 * Hexes with settlement features (for settlement overlay)
 * Returns all hexes that have settlement features
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const hexesWithSettlementFeatures = derived(kingdomData, $data => {
  const withSettlements = $data.hexes
    .filter((h: any) => {
      const features = h.features || [];
      return features.some((f: any) => f.type === 'settlement');
    })
    .map((h: any) => {
      const settlementFeature = (h.features || []).find((f: any) => f.type === 'settlement');
      return {
        id: h.id,
        feature: settlementFeature
      };
    });
  
  return filterVisibleHexes(withSettlements);
});

/**
 * Current production from all hexes
 * Uses worksiteProduction which is kept up-to-date by the economics service
 * This is derived from hexes but stored in the model for efficiency
 * Falls back to empty object if no production data available
 */
export const currentProduction = derived(kingdomData, $data => {
  // Use worksite production if available
  if ($data.worksiteProduction && typeof $data.worksiteProduction === 'object') {
    return $data.worksiteProduction;
  }
  
  // Fallback to empty production
  return { food: 0, lumber: 0, stone: 0, ore: 0 };
});

// UI-only state (no persistence needed)
export const viewingPhase = writable<TurnPhase>(TurnPhase.STATUS);
export const phaseViewLocked = writable<boolean>(true); // Lock viewing phase to current phase
export const selectedSettlement = writable<string | null>(null);
export const expandedSections = writable<Set<string>>(new Set());

// Available factions (derived from kingdom.factions array + hexes + settlements)
// Grouped by whether they have claimed territories
export const availableFactions = derived(kingdomData, $data => {
  const allFactions = new Set<string>();
  const factionsWithTerritories = new Set<string>();
  
  // Always include player kingdom
  allFactions.add(PLAYER_KINGDOM);
  
  // Extract from diplomatic factions list (primary source)
  ($data.factions || []).forEach(f => {
    if (f.name && f.name.trim()) {
      allFactions.add(f.name);
    }
  });
  
  // Track which factions have territories (hexes)
  $data.hexes.forEach(h => {
    if (h.claimedBy && typeof h.claimedBy === 'string') {
      allFactions.add(h.claimedBy);
      factionsWithTerritories.add(h.claimedBy);
    }
  });
  
  // Track which factions have settlements
  $data.settlements.forEach(s => {
    if (s.ownedBy && s.ownedBy !== null) {
      allFactions.add(s.ownedBy);
      factionsWithTerritories.add(s.ownedBy);
    }
  });
  
  // Split into two groups with Player Kingdom always first
  const withTerritories = Array.from(allFactions)
    .filter(f => factionsWithTerritories.has(f))
    .sort((a, b) => {
      // Player Kingdom always first
      if (a === PLAYER_KINGDOM) return -1;
      if (b === PLAYER_KINGDOM) return 1;
      // Then alphabetical
      return a.localeCompare(b);
    });
  
  const withoutTerritories = Array.from(allFactions)
    .filter(f => !factionsWithTerritories.has(f))
    .sort((a, b) => {
      // Player Kingdom always first (in case it has no territories)
      if (a === PLAYER_KINGDOM) return -1;
      if (b === PLAYER_KINGDOM) return 1;
      // Then alphabetical
      return a.localeCompare(b);
    });
  
  return {
    withTerritories,
    withoutTerritories,
    all: Array.from(allFactions).sort() // For backwards compatibility
  };
});

// Online players store - reactive to Foundry user connections
export interface OnlinePlayer {
  playerId: string;
  playerName: string;
  displayName: string;
  playerColor: string;
  characterName: string;
}

export const onlinePlayers = writable<OnlinePlayer[]>([]);

// Initialization state - components can wait for this to be true
export const isInitialized = writable<boolean>(false);

/**
 * Get the TurnManager singleton instance
 */
export function getTurnManager(): TurnManager {
  return TurnManager.getInstance();
}

/**
 * Initialize the kingdom actor store
 */
export function initializeKingdomActor(actor: any): void {
  kingdomActor.set(actor);
  
  // Initialize viewing phase to match current phase
  // Actor is wrapped with getKingdomData() method by wrapKingdomActor()
  const kingdom = actor.getKingdomData?.() || actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
  if (kingdom) {
    viewingPhase.set(kingdom.currentPhase);
  }

  // Initialize TurnManager for phase progression
  initializeTurnManager();
}

/**
 * Initialize TurnManager - simplified for new phase architecture
 */
function initializeTurnManager(): void {
  // Get singleton instance - will create if doesn't exist
  const turnManager = TurnManager.getInstance();

}

/**
 * Get the current kingdom actor
 */
export function getKingdomActor(): any | null {
  return get(kingdomActor);
}

/**
 * Get the current kingdom data
 */
export function getKingdomData(): KingdomData {
  return get(kingdomData);
}

/**
 * Update kingdom data - uses wrapped actor's updateKingdomData method
 */
export async function updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) {
    logger.warn('[KingdomActor Store] No actor available for update - likely during initialization, queuing update');
    // Don't fail silently - instead, wait for actor to be available
    return new Promise<void>((resolve) => {
      const unsubscribe = kingdomActor.subscribe((newActor) => {
        if (newActor) {
          unsubscribe();
          // Use wrapped actor's updateKingdomData method
          if (newActor.updateKingdomData) {
            newActor.updateKingdomData(updater)
              .then(() => resolve())
              .catch(error => {
                logger.error('[KingdomActor Store] Failed to update kingdom:', error);
                resolve();
              });
          } else {
            resolve();
          }
        }
      });
    });
  }
  
  try {
    // Use wrapped actor's updateKingdomData method if available
    if (actor.updateKingdomData) {
      await actor.updateKingdomData(updater);
    } else {
      logger.warn('[KingdomActor Store] Actor not wrapped - using fallback');
      // Fallback to direct flag manipulation
      const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData;
      if (!kingdom) {
        logger.warn('[KingdomActor Store] No kingdom data found on actor');
        return;
      }
      updater(kingdom);
      await actor.setFlag('pf2e-reignmaker', 'kingdom-data', kingdom);
    }
  } catch (error) {
    logger.error('[KingdomActor Store] Failed to update kingdom:', error);
  }
}

/**
 * Convenience functions for common operations
 */

export async function advancePhase(): Promise<void> {
  // Use TurnManager singleton for phase advancement
  try {
    const turnManager = getTurnManager();
    await turnManager.nextPhase();

    // Update viewing phase to match new current phase
    const actor = get(kingdomActor);
    if (actor) {
      const updatedKingdom = actor.getKingdomData?.() || actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
      if (updatedKingdom) {
        viewingPhase.set(updatedKingdom.currentPhase);
      }
    }
  } catch (error) {
    logger.error('[KingdomActor Store] Error advancing phase:', error);
  }
}


export function isPhaseStepCompleted(stepIndex: number): boolean {
  const data = get(kingdomData);
  // Check in currentPhaseSteps array by index
  const step = data.currentPhaseSteps?.[stepIndex];
  return step?.completed === 1;
}

export function isCurrentPhaseComplete(): boolean {
  const data = get(kingdomData);
  if (!data.currentPhaseSteps) return false;
  
  // Check if all steps are completed
  return data.currentPhaseSteps.every(step => step.completed === 1);
}

// Convenience methods removed - use getKingdomActor() and actor.updateKingdomData() directly
// This enforces the Single Source of Truth architecture pattern

/**
 * Player action management - REMOVED (now uses turnState.actionLog)
 */

/**
 * Update online players list from Foundry
 */
export function updateOnlinePlayers(): void {
  if (typeof game === 'undefined' || !game.users) {
    logger.warn('[KingdomStore] Game users not available');
    return;
  }

  const players: OnlinePlayer[] = game.users
    .filter((u: any) => u.active)
    .map((user: any) => {
      const characterName = user.character?.name;
      const displayName = characterName || user.name || 'Unknown Player';
      
      return {
        playerId: user.id,
        playerName: user.name || 'Unknown Player',
        displayName: displayName,
        playerColor: user.color || '#cccccc',
        characterName: characterName || user.name || 'Unknown'
      };
    });

  onlinePlayers.set(players);

}

/**
 * Initialize all current players
 */
export function initializeAllPlayers(): void {
  // Player tracking is now handled via actionLog in turnState
  // Initialize online players list
  updateOnlinePlayers();
  
  // Mark as fully initialized
  isInitialized.set(true);

}

/**
 * UI state management functions
 */

export function setViewingPhase(phase: TurnPhase): void {
  viewingPhase.set(phase);
}

export function togglePhaseViewLock(): void {
  phaseViewLocked.update(locked => {
    const newLockState = !locked;
    
    // If we're locking (newLockState = true), sync viewing phase to current phase
    if (newLockState) {
      const data = get(kingdomData);
      if (data.currentPhase) {

        viewingPhase.set(data.currentPhase);
      }
    } else {

    }
    
    return newLockState;
  });
}

/**
 * Turn management functions - delegated to TurnManager
 */

export async function setCurrentPhase(phase: TurnPhase): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.setCurrentPhase(phase);
    // Update viewing phase to match
    viewingPhase.set(phase);
  } else {
    logger.warn('[KingdomStore] No TurnManager available for setCurrentPhase');
  }
}

export async function resetPhaseSteps(): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.resetPhaseSteps();
  } else {
    logger.warn('[KingdomStore] No TurnManager available for resetPhaseSteps');
  }
}

export async function incrementTurn(): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.incrementTurn();
  } else {
    logger.warn('[KingdomStore] No TurnManager available for incrementTurn');
  }
}

/**
 * Start the kingdom - advance from Turn 0 to Turn 1
 * Simplified version: All data initialization happens in Stage 1 (WelcomeDialog)
 * This only advances the turn number and phase
 */
export async function startKingdom(): Promise<void> {
  // GM check - only GM can start the kingdom
  if (!(game as any)?.user?.isGM) {
    logger.error('[KingdomStore] Only GM can start the kingdom');
    (ui as any).notifications?.error('Only the GM can start Turn 1');
    return;
  }
  
  const actor = get(kingdomActor);
  if (!actor) {
    logger.error('[KingdomStore] No kingdom actor available for startKingdom');
    return;
  }

  // Simple turn advancement - all data exists from Stage 1
  await updateKingdom((kingdom) => {
    kingdom.currentTurn = 1;
    kingdom.setupComplete = true;
    kingdom.currentPhase = TurnPhase.STATUS;
    kingdom.currentPhaseStepIndex = 0;
    kingdom.currentPhaseSteps = [];
    kingdom.phaseComplete = false;
    kingdom.oncePerTurnActions = [];
  });
  
  // Initialize turn manager
  const manager = getTurnManager();
  if (manager) {
    await manager.resetPhaseSteps();
  }

}

/**
 * Simple UI state functions
 */

export function selectSettlement(settlementId: string | null): void {
  selectedSettlement.set(settlementId);
}

/**
 * Setup Foundry hooks for automatic synchronization
 */
export function setupFoundrySync(): void {
  // Only setup if Foundry is available
  if (typeof Hooks === 'undefined') {
    logger.warn('[KingdomActor Store] Foundry hooks not available');
    return;
  }
  
  // Listen for actor updates to trigger store updates
  Hooks.on('updateActor', (actor: any, changes: any, options: any, userId: string) => {
    const currentActor = get(kingdomActor);
    
    // Check if this is our kingdom actor
    if (currentActor && actor.id === currentActor.id) {
      // Check if kingdom data was updated
      if (changes.flags?.['pf2e-reignmaker']?.['kingdom-data']) {

        // Refresh the actor reference in the store
        kingdomActor.set(actor as KingdomActor);
        
        // Get the new kingdom data from the updated actor
        const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
        const newPhase = kingdom?.currentPhase;
        
        if (kingdom && newPhase) {
          const isLocked = get(phaseViewLocked);
          const currentViewingPhase = get(viewingPhase);

          // If locked and viewing phase doesn't match current phase, sync them
          if (isLocked && currentViewingPhase !== newPhase) {

            viewingPhase.set(newPhase);
          }
        }
      }
    }
  });

}
