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

// ===== CLAIMED TERRITORY DERIVED STORES =====
// Single source of truth for territory filtering logic
// These automatically update when kingdom data changes

/**
 * Hexes claimed by the player kingdom (claimedBy === PLAYER_KINGDOM)
 * Filtered by World Explorer visibility (GMs see all, players see revealed only)
 */
export const claimedHexes = derived(kingdomData, $data => {
  const claimed = $data.hexes.filter(h => h.claimedBy === PLAYER_KINGDOM);
  return filterVisibleHexes(claimed);
});

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
 * Owned settlements - settlements belonging to the player's kingdom
 * Uses the explicit `owned` property (simpler than checking hex claiming)
 * Filters for player-owned settlements only (owned === PLAYER_KINGDOM)
 * Excludes faction-owned settlements and unowned settlements
 */
export const ownedSettlements = derived(kingdomData, $data => {
  return $data.settlements.filter(s => s.owned === PLAYER_KINGDOM);
});

/**
 * Legacy alias for backward compatibility
 * @deprecated Use ownedSettlements instead
 */
export const claimedSettlements = ownedSettlements;

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
  // Roads are stored as an array of hex IDs in kingdom data
  const roads = $data.roadsBuilt || [];
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
  
  console.log('[KingdomActor Store] Initialized with actor:', actor.name);
  
  // Initialize TurnManager for phase progression
  initializeTurnManager();
}

/**
 * Initialize TurnManager - simplified for new phase architecture
 */
function initializeTurnManager(): void {
  // Get singleton instance - will create if doesn't exist
  const turnManager = TurnManager.getInstance();
  
  console.log('✅ [KingdomActor Store] TurnManager singleton ready - phases are self-executing');
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
    console.warn('[KingdomActor Store] No actor available for update - likely during initialization, queuing update');
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
                console.error('[KingdomActor Store] Failed to update kingdom:', error);
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
      console.warn('[KingdomActor Store] Actor not wrapped - using fallback');
      // Fallback to direct flag manipulation
      const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData;
      if (!kingdom) {
        console.warn('[KingdomActor Store] No kingdom data found on actor');
        return;
      }
      updater(kingdom);
      await actor.setFlag('pf2e-reignmaker', 'kingdom-data', kingdom);
    }
  } catch (error) {
    console.error('[KingdomActor Store] Failed to update kingdom:', error);
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
    console.log('✅ [KingdomActor Store] Phase advanced via TurnManager');
    
    // Update viewing phase to match new current phase
    const actor = get(kingdomActor);
    if (actor) {
      const updatedKingdom = actor.getKingdomData?.() || actor.getFlag?.('pf2e-reignmaker', 'kingdom-data') as KingdomData;
      if (updatedKingdom) {
        viewingPhase.set(updatedKingdom.currentPhase);
      }
    }
  } catch (error) {
    console.error('[KingdomActor Store] Error advancing phase:', error);
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
    console.warn('[KingdomStore] Game users not available');
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
  console.log(`[KingdomStore] Updated online players: ${players.length} online`);
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
  console.log('[KingdomStore] Player tracking uses turnState.actionLog');
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
        console.log(`[KingdomStore] Lock engaged, syncing view to current phase: ${data.currentPhase}`);
        viewingPhase.set(data.currentPhase);
      }
    } else {
      console.log(`[KingdomStore] Lock disengaged, viewing phase will stay at: ${get(viewingPhase)}`);
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
    console.warn('[KingdomStore] No TurnManager available for setCurrentPhase');
  }
}

export async function resetPhaseSteps(): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.resetPhaseSteps();
  } else {
    console.warn('[KingdomStore] No TurnManager available for resetPhaseSteps');
  }
}

export async function incrementTurn(): Promise<void> {
  const manager = getTurnManager();
  if (manager) {
    await manager.incrementTurn();
  } else {
    console.warn('[KingdomStore] No TurnManager available for incrementTurn');
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
    console.error('[KingdomStore] Only GM can start the kingdom');
    (ui as any).notifications?.error('Only the GM can start Turn 1');
    return;
  }
  
  const actor = get(kingdomActor);
  if (!actor) {
    console.error('[KingdomStore] No kingdom actor available for startKingdom');
    return;
  }
  
  console.log('🏰 [KingdomStore] Starting Turn 1 - data already initialized');
  
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
  
  console.log('✅ [KingdomStore] Turn 1 started - Status phase will initialize on mount');
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
    console.warn('[KingdomActor Store] Foundry hooks not available');
    return;
  }
  
  // Listen for actor updates to trigger store updates
  Hooks.on('updateActor', (actor: any, changes: any, options: any, userId: string) => {
    const currentActor = get(kingdomActor);
    
    // Check if this is our kingdom actor
    if (currentActor && actor.id === currentActor.id) {
      // Check if kingdom data was updated
      if (changes.flags?.['pf2e-reignmaker']?.['kingdom-data']) {
        console.log(`[KingdomActor Store] Kingdom updated by user ${userId}`);
        
        // Refresh the actor reference in the store
        kingdomActor.set(actor as KingdomActor);
        
        // Get the new kingdom data from the updated actor
        const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
        const newPhase = kingdom?.currentPhase;
        
        if (kingdom && newPhase) {
          const isLocked = get(phaseViewLocked);
          const currentViewingPhase = get(viewingPhase);
          
          console.log(`[KingdomActor Store] Phase sync check - Current: ${newPhase}, Viewing: ${currentViewingPhase}, Lock: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
          
          // If locked and viewing phase doesn't match current phase, sync them
          if (isLocked && currentViewingPhase !== newPhase) {
            console.log(`[KingdomActor Store] Lock engaged, syncing view from ${currentViewingPhase} to ${newPhase}`);
            viewingPhase.set(newPhase);
          }
        }
      }
    }
  });
  
  console.log('[KingdomActor Store] Foundry synchronization hooks setup complete');
}
