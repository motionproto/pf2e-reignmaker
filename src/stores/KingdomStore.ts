/**
 * Simplified Kingdom Store using Foundry-first architecture
 * Replaces the complex kingdomState and gameState stores
 */

import { writable, derived, get } from 'svelte/store';
import type { KingdomActor, KingdomData } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';
import { TurnPhase } from '../models/KingdomState';

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
  
  // Initialize TurnManager and trigger current phase controller
  initializeTurnManagerAndTriggerPhase();
}

/**
 * Initialize TurnManager and trigger controller for current phase
 */
async function initializeTurnManagerAndTriggerPhase(): Promise<void> {
  try {
    // Initialize TurnManager
    const { initializeTurnManager } = await import('./turn');
    initializeTurnManager();
    
    // Trigger current phase controller - architecture ensures proper reactive flow
    try {
      const { triggerCurrentPhaseController } = await import('./turn');
      triggerCurrentPhaseController();
      console.log('✅ [KingdomActor Store] TurnManager initialized and current phase controller triggered');
    } catch (error) {
      console.error('[KingdomActor Store] Error triggering current phase controller:', error);
    }
  } catch (error) {
    console.error('[KingdomActor Store] Error initializing TurnManager:', error);
  }
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
  // Use TurnManager for phase advancement instead of direct actor call
  // This ensures phase controllers are properly triggered
  try {
    const { turnManager } = await import('./turn');
    const manager = get(turnManager);
    
    if (manager) {
      await manager.nextPhase();
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
  if (!actor) return;
  
  await actor.modifyResource(resource, amount);
}

export async function setResource(resource: string, amount: number): Promise<void> {
  const actor = get(kingdomActor);
  if (!actor) return;
  
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

export function getPlayerAction(playerId: string) {
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
