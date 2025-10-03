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
export const fame = derived(kingdomData, $data => $data.fame);

// UI-only state (no persistence needed)
export const viewingPhase = writable<TurnPhase>(TurnPhase.STATUS);
export const selectedSettlement = writable<string | null>(null);
export const expandedSections = writable<Set<string>>(new Set());

// Initialization state - components can wait for this to be true
export const isInitialized = writable<boolean>(false);

// Turn management - simple instance, no store wrapper needed
let turnManagerInstance: TurnManager | null = null;

/**
 * Get the TurnManager instance
 */
export function getTurnManager(): TurnManager | null {
  return turnManagerInstance;
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
  // Create TurnManager directly - no store needed, just a simple instance
  turnManagerInstance = new TurnManager();
  
  console.log('✅ [KingdomActor Store] TurnManager initialized - phases are self-executing');
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
  // Use TurnManager for phase advancement
  try {
    if (turnManagerInstance) {
      await turnManagerInstance.nextPhase();
      console.log('✅ [KingdomActor Store] Phase advanced via TurnManager');
    } else {
      console.warn('[KingdomActor Store] No TurnManager available - cannot advance phase');
      return;
    }
    
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
 * Player action management - delegated to TurnManager
 */

export function spendPlayerAction(playerId: string, phase: TurnPhase): boolean {
  const manager = getTurnManager();
  if (manager) {
    return manager.spendPlayerAction(playerId, phase);
  }
  console.warn('[KingdomStore] No TurnManager available for spendPlayerAction');
  return false;
}

export function resetPlayerAction(playerId: string): void {
  const manager = getTurnManager();
  if (manager) {
    manager.resetPlayerAction(playerId);
  } else {
    console.warn('[KingdomStore] No TurnManager available for resetPlayerAction');
  }
}

export function getPlayerAction(playerId: string): any {
  const manager = getTurnManager();
  if (manager) {
    return manager.getPlayerAction(playerId);
  }
  console.warn('[KingdomStore] No TurnManager available for getPlayerAction');
  return undefined;
}

/**
 * Initialize all current players - delegated to TurnManager
 */
export function initializeAllPlayers(): void {
  // TurnManager handles this automatically in constructor
  // Mark as fully initialized
  isInitialized.set(true);
  console.log('[KingdomStore] Player initialization delegated to TurnManager');
}

/**
 * UI state management functions
 */

export function setViewingPhase(phase: TurnPhase): void {
  viewingPhase.set(phase);
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
        
        // Get the old phase before updating
        const oldKingdom = currentActor.getKingdom();
        const oldPhase = oldKingdom?.currentPhase;
        
        // Force store update by triggering reactivity
        kingdomActor.update(a => a);
        
        // Only update viewing phase if the actual current phase changed
        // AND the user is currently viewing the old active phase (not manually browsing)
        const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
        const newPhase = kingdom?.currentPhase;
        const currentViewingPhase = get(viewingPhase);
        
        if (kingdom && newPhase && newPhase !== oldPhase) {
          // Phase actually changed - only update viewing if user was on the old phase
          if (currentViewingPhase === oldPhase) {
            console.log(`[KingdomActor Store] Phase changed from ${oldPhase} to ${newPhase}, updating viewing phase`);
            viewingPhase.set(newPhase);
          } else {
            console.log(`[KingdomActor Store] Phase changed but user is browsing ${currentViewingPhase}, keeping viewing phase`);
          }
        }
      }
    }
  });
  
  console.log('[KingdomActor Store] Foundry synchronization hooks setup complete');
}
