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

// Define required steps for each phase
const PHASE_REQUIRED_STEPS: Map<TurnPhase, string[]> = new Map([
  [TurnPhase.PHASE_I, ['gain-fame', 'apply-modifiers']],  // Status phase
  [TurnPhase.PHASE_II, ['resources-collect']],  // Resources phase
  [TurnPhase.PHASE_III, ['calculate-unrest']],  // Unrest phase
  [TurnPhase.PHASE_IV, ['resolve-event']],  // Events phase
  [TurnPhase.PHASE_V, []],  // Actions phase - no required steps, optional actions
  [TurnPhase.PHASE_VI, ['upkeep-food', 'upkeep-military', 'upkeep-build']],  // Resolution/Upkeep phase
]);

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

// Phase management functions
export function setCurrentPhase(phase: TurnPhase) {
  updateKingdom(k => {
    k.currentPhase = phase;
  });
  gameState.update(state => ({
    ...state,
    viewingPhase: phase  // Also update viewing phase to match
  }));
}

export function setViewingPhase(phase: TurnPhase) {
  gameState.update(state => ({
    ...state,
    viewingPhase: phase
  }));
}

export function getNextPhase(currentPhase: TurnPhase): TurnPhase | null {
  const phases = Object.values(TurnPhase);
  const currentIndex = phases.indexOf(currentPhase);
  
  if (currentIndex < phases.length - 1) {
    return phases[currentIndex + 1];
  } else {
    return null; // End of turn
  }
}

export function advancePhase() {
  const kingdom = get(kingdomState);
  const oldPhase = kingdom.currentPhase;
  const nextPhase = getNextPhase(kingdom.currentPhase);
  
  if (nextPhase) {
    console.log('[gameState] Phase advancing from', oldPhase, 'to', nextPhase);
    updateKingdom(k => {
      k.currentPhase = nextPhase;
    });
    gameState.update(state => ({
      ...state,
      viewingPhase: nextPhase
    }));
  } else {
    // End of turn - clear resources and advance to next turn
    console.log('[gameState] End of turn - advancing from turn', kingdom.currentTurn, 'to turn', kingdom.currentTurn + 1);
    
    // Clear non-storable resources and event tracking before ending turn
    updateKingdom(k => {
      // Advance turn
      k.currentTurn = k.currentTurn + 1;
      k.currentPhase = TurnPhase.PHASE_I;
      k.phaseStepsCompleted = new Map();
      k.phasesCompleted = new Set();
      k.oncePerTurnActions = new Set();
      
      // Clear non-storable resources
      k.resources.set('lumber', 0);
      k.resources.set('stone', 0);
      k.resources.set('ore', 0);
      
      // Process end turn modifiers if any
      // Filter out modifiers that have a duration of 1 (ends this turn)
      k.modifiers = k.modifiers.filter(modifier => 
        modifier.duration !== 1
      );
      
      // Clear event/incident tracking for new turn
      k.currentEventId = null;
      k.currentIncidentId = null;
      k.incidentRoll = null;
      k.eventStabilityRoll = null;
      k.eventRollDC = null;
      k.eventTriggered = null;
      
      // Reset player actions for the new turn
      k.playerActions = initializePlayerActions();
    });
    
    gameState.update(state => ({
      ...state,
      viewingPhase: TurnPhase.PHASE_I,
      resolvedActions: new Map()  // Clear resolved actions for new turn
    }));
  }
}

// Check if a phase is complete (all required steps done)
export function isPhaseComplete(phase: TurnPhase): boolean {
  const kingdom = get(kingdomState);
  const requiredSteps = PHASE_REQUIRED_STEPS.get(phase) || [];
  
  // If no required steps, phase is always "complete" (e.g., Actions phase)
  if (requiredSteps.length === 0) {
    return true;
  }
  
  // Check if all required steps are completed
  return requiredSteps.every(step => kingdom.phaseStepsCompleted.get(step) === true);
}

// Mark a phase as complete
export function markPhaseComplete(phase: TurnPhase) {
  updateKingdom(k => {
    const newPhasesCompleted = new Set(k.phasesCompleted);
    newPhasesCompleted.add(phase);
    k.phasesCompleted = newPhasesCompleted;
  });
}

// Check if current phase is complete
export function isCurrentPhaseComplete(): boolean {
  const kingdom = get(kingdomState);
  return isPhaseComplete(kingdom.currentPhase);
}

// Check if a phase can be operated (all previous phases must be complete)
export function canOperatePhase(phase: TurnPhase): boolean {
  const kingdom = get(kingdomState);
  const phases = Object.values(TurnPhase);
  const targetIndex = phases.indexOf(phase);
  const currentIndex = phases.indexOf(kingdom.currentPhase);
  
  // Can always operate the current phase or earlier phases
  if (targetIndex <= currentIndex) {
    return true;
  }
  
  // For future phases, check if all phases up to (but not including) the target are complete
  for (let i = 0; i < targetIndex; i++) {
    if (!kingdom.phasesCompleted.has(phases[i]) && !isPhaseComplete(phases[i])) {
      return false;
    }
  }
  
  return true;
}

export function markPhaseStepCompleted(stepId: string) {
  // Get kingdom state (imported at module level)
  const kingdom = get(kingdomState);
  
  updateKingdom(k => {
    const newSteps = new Map(k.phaseStepsCompleted);
    newSteps.set(stepId, true);
    k.phaseStepsCompleted = newSteps;
    
    // Auto-complete related steps based on game rules (synchronous)
    // Status Phase: If gain-fame is done and no modifiers exist, auto-complete apply-modifiers
    if (stepId === 'gain-fame' && k.currentPhase === TurnPhase.PHASE_I) {
      const hasModifiers = k.modifiers && k.modifiers.length > 0;
      if (!hasModifiers && !k.phaseStepsCompleted.get('apply-modifiers')) {
        k.phaseStepsCompleted.set('apply-modifiers', true);
        console.log('[gameState] Auto-completed apply-modifiers (no modifiers exist)');
      }
    }
    
    // After updating steps, check if current phase is now complete
    const requiredSteps = PHASE_REQUIRED_STEPS.get(k.currentPhase) || [];
    const phaseNowComplete = requiredSteps.length > 0 && 
      requiredSteps.every(step => k.phaseStepsCompleted.get(step) === true);
    
    if (phaseNowComplete && !k.phasesCompleted.has(k.currentPhase)) {
      const newPhasesCompleted = new Set(k.phasesCompleted);
      newPhasesCompleted.add(k.currentPhase);
      k.phasesCompleted = newPhasesCompleted;
      console.log(`[gameState] Phase ${k.currentPhase} marked as complete`);
    }
  });
}

// Check phase-specific conditions for auto-completion
export function checkPhaseAutoCompletions(phase: TurnPhase) {
  const kingdom = get(kingdomState);
  
  // Unrest Phase: Auto-complete if kingdom is stable
  if (phase === TurnPhase.PHASE_III) {
    const currentUnrest = kingdom.unrest || 0;
    const tier = IncidentManager.getUnrestTier(currentUnrest);
    
    if (tier === 0 && !kingdom.phaseStepsCompleted.get('calculate-unrest')) {
      markPhaseStepCompleted('calculate-unrest');
      console.log('[gameState] Auto-completed calculate-unrest (kingdom is stable)');
    }
  }
}

export function isPhaseStepCompleted(stepId: string): boolean {
  const kingdom = get(kingdomState);
  return kingdom.phaseStepsCompleted.get(stepId) === true;
}

export function resetPhaseSteps() {
  updateKingdom(k => {
    k.phaseStepsCompleted = new Map();
  });
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
  gameState.update(state => ({
    ...state,
    viewingPhase: savedState.viewingPhase || kingdom.currentPhase || TurnPhase.PHASE_I
  }));
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
