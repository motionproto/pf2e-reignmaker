import { writable, get } from 'svelte/store';
import { TurnPhase } from '../models/KingdomState';
import { EventManager } from '../models/Events';
import { kingdomState, updateKingdom } from '../stores/kingdom';
import { IncidentManager } from '../models/Incidents';
import type { Writable } from 'svelte/store';

/**
 * Game state store for managing game flow, turn progression, and UI state
 * This is separate from kingdom state which holds pure kingdom data
 */

interface PlayerAction {
  playerId: string;
  playerName: string;
  playerColor: string;
  actionSpent: boolean;
  spentInPhase?: TurnPhase;
}

// Action resolution tracking
interface ActionResolution {
  playerId: string;      // User ID who performed the action
  playerName: string;    // User display name
  playerColor: string;   // User color for visual differentiation
  actionId: string;      // The action that was performed
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  actorName: string;
  skillName?: string;
  stateChanges: Map<string, any>;
  timestamp: number;     // When action was performed
}

interface GameState {
  // Action resolution tracking (local to each client for UI purposes)
  resolvedActions: Map<string, ActionResolution>;  // Map of actionId to resolution details
  
  // UI State
  viewingPhase: TurnPhase | null;  // Which phase the user is currently viewing
  selectedSettlement: string | null;  // Currently selected settlement for UI
  expandedSections: Set<string>;  // Which UI sections are expanded
}


// Initialize game state
const initialGameState: GameState = {
  resolvedActions: new Map(),
  viewingPhase: TurnPhase.PHASE_I,  // Initialize to first phase instead of null
  selectedSettlement: null,
  expandedSections: new Set()
};

// Main game state store
export const gameState = writable<GameState>(initialGameState);

// Separate writable store for viewingPhase for backward compatibility
export const viewingPhase = writable<TurnPhase | null>(TurnPhase.PHASE_I);  // Initialize to first phase

// Track last known values to prevent circular updates
let lastKnownViewingPhase: TurnPhase | null = TurnPhase.PHASE_I;
let lastKnownGameStateViewingPhase: TurnPhase | null = TurnPhase.PHASE_I;

// Sync gameState -> viewingPhase (when gameState.viewingPhase changes)
gameState.subscribe($state => {
  if ($state.viewingPhase !== lastKnownGameStateViewingPhase) {
    lastKnownGameStateViewingPhase = $state.viewingPhase;
    lastKnownViewingPhase = $state.viewingPhase;
    viewingPhase.set($state.viewingPhase);
  }
});

// Sync viewingPhase -> gameState (when viewingPhase changes from UI)
viewingPhase.subscribe($phase => {
  if ($phase !== lastKnownViewingPhase) {
    lastKnownViewingPhase = $phase;
    lastKnownGameStateViewingPhase = $phase;
    gameState.update(state => ({
      ...state,
      viewingPhase: $phase
    }));
  }
});

// Phase management functions - DEPRECATED: Phase advancement moved to kingdom.ts
// These functions remain for backward compatibility but should not be used for new code

export function setViewingPhase(phase: TurnPhase) {
  gameState.update(state => ({
    ...state,
    viewingPhase: phase
  }));
}


export function markActionUsed(actionId: string) {
  updateKingdom(k => {
    const newActions = new Set(k.oncePerTurnActions);
    newActions.add(actionId);
    k.oncePerTurnActions = newActions;
  });
}

export function isActionUsed(actionId: string): boolean {
  const kingdom = get(kingdomState);
  return kingdom.oncePerTurnActions.has(actionId);
}

export function incrementTurn() {
  updateKingdom(k => {
    k.currentTurn = k.currentTurn + 1;
    k.phaseStepsCompleted = new Map();
    k.phasesCompleted = new Set();
    k.oncePerTurnActions = new Set();
  });
}

// UI state management
export function selectSettlement(settlementName: string | null) {
  gameState.update(state => ({
    ...state,
    selectedSettlement: settlementName
  }));
}

export function toggleSection(sectionId: string) {
  gameState.update(state => {
    const newSections = new Set(state.expandedSections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
    } else {
      newSections.add(sectionId);
    }
    return {
      ...state,
      expandedSections: newSections
    };
  });
}

export function isSectionExpanded(sectionId: string): boolean {
  const state = get(gameState);
  return state.expandedSections.has(sectionId);
}

// Player action management functions
export function initializePlayerActions(): Map<string, PlayerAction> {
  const playerActions = new Map<string, PlayerAction>();
  
  // Get Foundry game data if available
  if (typeof (window as any).game !== 'undefined') {
    const game = (window as any).game;
    
    // Get all users that have characters assigned
    game.users?.contents?.forEach((user: any) => {
      if (user.character) {
        const playerColor = user.color || '#ffffff';
        playerActions.set(user.id, {
          playerId: user.id,
          playerName: user.name,
          playerColor: playerColor,
          actionSpent: false
        });
      }
    });
    
    // If no players with characters, at least add the current user
    if (playerActions.size === 0 && game.user) {
      playerActions.set(game.user.id, {
        playerId: game.user.id,
        playerName: game.user.name,
        playerColor: game.user.color || '#ffffff',
        actionSpent: false
      });
    }
  }
  
  return playerActions;
}

export function spendPlayerAction(playerId: string, phase: TurnPhase): boolean {
  const kingdom = get(kingdomState);
  const playerAction = kingdom.playerActions.get(playerId);
  
  if (!playerAction || playerAction.actionSpent) {
    return false; // Action already spent or player not found
  }
  
  // Update kingdomState instead of gameState for multiplayer sync
  updateKingdom((state) => {
    const newPlayerActions = new Map(state.playerActions);
    const updatedAction = newPlayerActions.get(playerId);
    if (updatedAction) {
      updatedAction.actionSpent = true;
      updatedAction.spentInPhase = phase;
      newPlayerActions.set(playerId, updatedAction);
    }
    state.playerActions = newPlayerActions;
  });
  
  return true;
}

export function getPlayerAction(playerId: string): PlayerAction | undefined {
  const kingdom = get(kingdomState);
  return kingdom.playerActions.get(playerId);
}

export function getAllPlayerActions(): PlayerAction[] {
  const kingdom = get(kingdomState);
  return Array.from(kingdom.playerActions.values());
}

export function resetPlayerAction(playerId: string) {
  updateKingdom((state) => {
    const newPlayerActions = new Map(state.playerActions);
    const playerAction = newPlayerActions.get(playerId);
    if (playerAction) {
      playerAction.actionSpent = false;
      playerAction.spentInPhase = undefined;
      newPlayerActions.set(playerId, playerAction);
    }
    state.playerActions = newPlayerActions;
  });
}

// Get current game state for saving (exclude pure UI state)
// Note: Most game state is now in kingdomState and saved via persistence service
export function getGameStateForSave() {
  const state = get(gameState);
  return {
    // Only save UI state that should persist
    viewingPhase: state.viewingPhase
  };
}

// Load game state from saved data
// Note: Most game state is now in kingdomState and loaded via persistence service
export function loadGameState(savedState: any) {
  const kingdom = get(kingdomState);
  
  // Only override viewingPhase if there's a valid saved value
  // Otherwise, let it sync with the current phase
  if (savedState?.viewingPhase) {
    gameState.update(state => ({
      ...state,
      viewingPhase: savedState.viewingPhase
    }));
  } else {
    // No saved viewing phase, sync with current phase
    gameState.update(state => ({
      ...state,
      viewingPhase: kingdom.currentPhase || TurnPhase.PHASE_I
    }));
  }
}

// Action resolution management functions
export function resolveAction(
  actionId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  actorName: string,
  skillName?: string,
  stateChanges?: Map<string, any>,
  playerId?: string
): void {
  const game = (window as any).game;
  const userId = playerId || game?.user?.id;
  if (!userId) {
    console.warn('[gameState] Cannot resolve action without user ID');
    return;
  }
  
  const user = game?.users?.get(userId);
  const playerName = user?.name || 'Unknown Player';
  const playerColor = user?.color || '#ffffff';
  
  // Generate composite key for player-specific resolution
  const resolutionKey = `${userId}:${actionId}`;
  
  console.log('[gameState] Resolving action:', {
    actionId,
    userId,
    playerName,
    resolutionKey,
    outcome
  });
  
  gameState.update(state => {
    const newResolvedActions = new Map(state.resolvedActions);
    newResolvedActions.set(resolutionKey, {
      playerId: userId,
      playerName,
      playerColor,
      actionId,
      outcome,
      actorName,
      skillName,
      stateChanges: stateChanges || new Map(),
      timestamp: Date.now()
    });
    
    console.log('[gameState] Resolution stored. Total resolutions:', newResolvedActions.size);
    
    return {
      ...state,
      resolvedActions: newResolvedActions
    };
  });
}

export function unresolveAction(actionId: string, playerId?: string): void {
  const game = (window as any).game;
  const userId = playerId || game?.user?.id;
  if (!userId) {
    console.warn('[gameState] Cannot unresolve action without user ID');
    return;
  }
  
  const resolutionKey = `${userId}:${actionId}`;
  
  gameState.update(state => {
    const newResolvedActions = new Map(state.resolvedActions);
    newResolvedActions.delete(resolutionKey);
    
    return {
      ...state,
      resolvedActions: newResolvedActions
    };
  });
}

export function isActionResolved(actionId: string, playerId?: string): boolean {
  const game = (window as any).game;
  const userId = playerId || game?.user?.id;
  if (!userId) return false;
  
  const resolutionKey = `${userId}:${actionId}`;
  const state = get(gameState);
  const isResolved = state.resolvedActions.has(resolutionKey);
  
  console.log('[gameState] Checking if action resolved:', {
    actionId,
    userId,
    resolutionKey,
    isResolved,
    totalResolutions: state.resolvedActions.size
  });
  
  return isResolved;
}

// Check if any player has resolved this action
export function isActionResolvedByAny(actionId: string): boolean {
  const state = get(gameState);
  for (const [key, resolution] of state.resolvedActions.entries()) {
    if (resolution.actionId === actionId) {
      return true;
    }
  }
  return false;
}

export function getActionResolution(actionId: string, playerId?: string): ActionResolution | undefined {
  const game = (window as any).game;
  const userId = playerId || game?.user?.id;
  if (!userId) return undefined;
  
  const resolutionKey = `${userId}:${actionId}`;
  const state = get(gameState);
  return state.resolvedActions.get(resolutionKey);
}

// Get resolutions for an action from all players
export function getAllPlayersActionResolutions(actionId: string): ActionResolution[] {
  const state = get(gameState);
  const resolutions: ActionResolution[] = [];
  
  for (const [key, resolution] of state.resolvedActions.entries()) {
    if (resolution.actionId === actionId) {
      resolutions.push(resolution);
    }
  }
  
  return resolutions;
}

export function getAllResolvedActions(): Map<string, ActionResolution> {
  const state = get(gameState);
  return new Map(state.resolvedActions);
}

// Get resolved actions for current player only
export function getCurrentPlayerResolvedActions(): Map<string, ActionResolution> {
  const game = (window as any).game;
  const userId = game?.user?.id;
  if (!userId) return new Map();
  
  const state = get(gameState);
  const playerActions = new Map<string, ActionResolution>();
  
  for (const [key, resolution] of state.resolvedActions.entries()) {
    if (resolution.playerId === userId) {
      playerActions.set(key, resolution);
    }
  }
  
  return playerActions;
}

export function clearResolvedActions(): void {
  gameState.update(state => ({
    ...state,
    resolvedActions: new Map()
  }));
}

// Export interface for use in other modules
export type { PlayerAction, ActionResolution };
