/**
 * Simplified Kingdom Store using Foundry-first architecture
 * Replaces the complex kingdomState and gameState stores
 */

import { writable, derived, get } from 'svelte/store';
import type { KingdomActor, KingdomData } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';
import { TurnPhase } from '../models/KingdomState';
import { TurnManager } from '../models/TurnManager';

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
      console.warn('[KingdomActor Store] No TurnManager available, falling back to direct actor call');
      const actor = get(kingdomActor);
      if (actor) {
        await actor.advancePhase();
      }
    }
    
    // Update viewing phase to match new current phase
    const actor = get(kingdomActor);
    const updatedKingdom = actor?.getKingdom();
    if (updatedKingdom) {
      viewingPhase.set(updatedKingdom.currentPhase);
    }
  } catch (error) {
    console.error('[KingdomActor Store] Error advancing phase:', error);
    
    // Fallback to direct actor call if TurnManager fails
    const actor = get(kingdomActor);
    if (actor) {
      await actor.advancePhase();
      const updatedKingdom = actor.getKingdom();
      if (updatedKingdom) {
        viewingPhase.set(updatedKingdom.currentPhase);
      }
    }
  }
}

export async function markPhaseStepCompleted(stepId: string): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) {
    console.warn(`[KingdomActor Store] Cannot mark step '${stepId}' complete - no actor available yet`);
    return;
  }
  
  await actor.markPhaseStepCompleted(stepId);
}

export function isPhaseStepCompleted(stepId: string): boolean {
  const data = get(kingdomData);
  return data.phaseStepsCompleted[stepId] === true;
}

export function isCurrentPhaseComplete(): boolean {
  const actor = get(kingdomActor);
  if (!actor) return false;
  
  return actor.isCurrentPhaseComplete();
}

export async function modifyResource(resource: string, amount: number): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) {
    console.warn(`[KingdomActor Store] Cannot modify resource '${resource}' - no actor available yet`);
    return;
  }
  
  // Check if the actor has the modifyResource method (is a proper KingdomActor)
  if (typeof actor.modifyResource !== 'function') {
    console.error(`[KingdomActor Store] Actor does not have modifyResource method. Actor type:`, actor.constructor.name);
    console.error(`[KingdomActor Store] Available methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(actor)));
    return;
  }
  
  await actor.modifyResource(resource, amount);
}

export async function setResource(resource: string, amount: number): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) {
    console.warn(`[KingdomActor Store] Cannot set resource '${resource}' - no actor available yet`);
    return;
  }
  
  // Check if the actor has the setResource method (is a proper KingdomActor)
  if (typeof actor.setResource !== 'function') {
    console.error(`[KingdomActor Store] Actor does not have setResource method. Actor type:`, actor.constructor.name);
    console.error(`[KingdomActor Store] Available methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(actor)));
    return;
  }
  
  await actor.setResource(resource, amount);
}

export async function addSettlement(settlement: any): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.addSettlement(settlement);
}

export async function updateSettlement(settlementId: string, updates: any): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.updateSettlement(settlementId, updates);
}

export async function addArmy(army: any): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.addArmy(army);
}

export async function removeArmy(armyId: string): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.removeArmy(armyId);
}

/**
 * Player action management functions
 */

// Simple in-memory player actions tracking (UI-only, doesn't need persistence)
const playerActions = writable<Map<string, { playerId: string; playerName: string; actionSpent: boolean; spentInPhase?: TurnPhase }>>(new Map());

export function spendPlayerAction(playerId: string, phase: TurnPhase): boolean {
  playerActions.update(actions => {
    const playerAction = actions.get(playerId) || {
      playerId,
      playerName: (window as any).game?.users?.get(playerId)?.name || 'Unknown',
      actionSpent: false,
      spentInPhase: undefined
    };
    
    if (!playerAction.actionSpent) {
      playerAction.actionSpent = true;
      playerAction.spentInPhase = phase;
      actions.set(playerId, playerAction);
      console.log(`[KingdomActor] Player ${playerAction.playerName} spent action in ${phase}`);
      return actions;
    }
    
    return actions;
  });
  
  return true;
}

export function resetPlayerAction(playerId: string): void {
  playerActions.update(actions => {
    const playerAction = actions.get(playerId);
    if (playerAction) {
      playerAction.actionSpent = false;
      playerAction.spentInPhase = undefined;
      actions.set(playerId, playerAction);
    }
    return actions;
  });
}

/**
 * Initialize all current players in the game
 */
export function initializeAllPlayers(): void {
  const game = (window as any).game;
  if (!game?.users) {
    console.warn('[KingdomStore] Game not available, cannot initialize players');
    return;
  }

  const initializedPlayers: string[] = [];
  
  playerActions.update(actions => {
    // Clear existing actions for fresh start
    actions.clear();
    
    // Initialize all users
    for (const user of game.users) {
      const playerAction = {
        playerId: user.id,
        playerName: user.name || 'Unknown Player',
        actionSpent: false,
        spentInPhase: undefined
      };
      
      actions.set(user.id, playerAction);
      initializedPlayers.push(user.name);
    }
    
    return actions;
  });
  
  console.log(`[KingdomStore] Initialized player actions for: ${initializedPlayers.join(', ')}`);
  
  // Mark as fully initialized
  isInitialized.set(true);
}

export function getPlayerAction(playerId: string): { playerId: string; playerName: string; actionSpent: boolean; spentInPhase?: TurnPhase } | undefined {
  const actions = get(playerActions);
  return actions.get(playerId);
}

/**
 * UI state management functions
 */

export function setViewingPhase(phase: TurnPhase): void {
  viewingPhase.set(phase);
}

export async function setCurrentPhase(phase: TurnPhase): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.updateKingdom(kingdom => {
    kingdom.currentPhase = phase;
  });
  
  // Also update viewing phase to match
  viewingPhase.set(phase);
}

export async function resetPhaseSteps(): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.updateKingdom(kingdom => {
    kingdom.phaseStepsCompleted = {};
  });
}

export async function incrementTurn(): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
  await actor.updateKingdom(kingdom => {
    kingdom.currentTurn = (kingdom.currentTurn || 1) + 1;
  });
}

export function selectSettlement(settlementId: string | null): void {
  selectedSettlement.set(settlementId);
}

export function toggleSection(sectionId: string): void {
  expandedSections.update(sections => {
    const newSections = new Set(sections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
    } else {
      newSections.add(sectionId);
    }
    return newSections;
  });
}

export function isSectionExpanded(sectionId: string): boolean {
  const sections = get(expandedSections);
  return sections.has(sectionId);
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
        
        // Force store update by triggering reactivity
        kingdomActor.update(a => a);
        
        // Update viewing phase if current phase changed
        const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
        if (kingdom && kingdom.currentPhase) {
          viewingPhase.set(kingdom.currentPhase);
        }
      }
    }
  });
  
  console.log('[KingdomActor Store] Foundry synchronization hooks setup complete');
}
