/**
 * Simplified Kingdom Store using Foundry-first architecture
 * Replaces the complex kingdomState and gameState stores
 */

import { writable, derived, get } from 'svelte/store';
import type { KingdomActor, KingdomData } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';
import { TurnPhase } from '../actors/KingdomActor';
import { TurnManager } from '../models/turn-manager';

// Core actor store - this is the single source of truth
export const kingdomActor = writable<KingdomActor | null>(null);

// Derived kingdom data - automatically updates when actor updates
export const kingdomData = derived(kingdomActor, ($actor): KingdomData => {
  if (!$actor) return createDefaultKingdom();
  return $actor.getKingdom() || createDefaultKingdom();
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
export function initializeKingdomActor(actor: KingdomActor): void {
  kingdomActor.set(actor);
  
  // Initialize viewing phase to match current phase
  const kingdom = actor.getKingdom();
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
export function getKingdomActor(): KingdomActor | null {
  return get(kingdomActor);
}

/**
 * Get the current kingdom data
 */
export function getKingdomData(): KingdomData {
  return get(kingdomData);
}

/**
 * Update kingdom data - simple wrapper around actor.updateKingdom
 */
export async function updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) {
    console.warn('[KingdomActor Store] No actor available for update - likely during initialization, queuing update');
    // Don't fail silently - instead, wait for actor to be available
    return new Promise((resolve) => {
      const unsubscribe = kingdomActor.subscribe((newActor) => {
        if (newActor) {
          unsubscribe();
          newActor.updateKingdom(updater).then(resolve).catch(error => {
            console.error('[KingdomActor Store] Failed to update kingdom:', error);
            resolve();
          });
        }
      });
    });
  }
  
  try {
    await actor.updateKingdom(updater);
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
    const updatedKingdom = actor?.getKingdom();
    if (updatedKingdom) {
      viewingPhase.set(updatedKingdom.currentPhase);
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

// Convenience methods removed - use getKingdomActor() and actor.updateKingdom() directly
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
