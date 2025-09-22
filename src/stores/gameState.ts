import { writable, get } from 'svelte/store';
import { TurnPhase } from '../models/KingdomState';
import { EventManager } from '../models/Events';

/**
 * Game state store for managing game flow, turn progression, and UI state
 * This is separate from kingdom state which holds pure kingdom data
 */

interface GameState {
  // Turn and phase management
  currentTurn: number;
  currentPhase: TurnPhase;
  phaseStepsCompleted: Map<string, boolean>;
  oncePerTurnActions: Set<string>;
  
  // Event management
  eventDC: number;
  eventManager: EventManager;
  
  // UI State
  viewingPhase: TurnPhase | null;  // Which phase the user is currently viewing
  selectedSettlement: string | null;  // Currently selected settlement for UI
  expandedSections: Set<string>;  // Which UI sections are expanded
}

// Initialize game state
const initialGameState: GameState = {
  currentTurn: 1,
  currentPhase: TurnPhase.PHASE_I,
  phaseStepsCompleted: new Map(),
  oncePerTurnActions: new Set(),
  eventDC: 16,
  eventManager: new EventManager(),
  viewingPhase: null,
  selectedSettlement: null,
  expandedSections: new Set()
};

// Main game state store
export const gameState = writable<GameState>(initialGameState);

// Separate store for viewingPhase for backward compatibility (will deprecate later)
export const viewingPhase = writable<TurnPhase | null>(null);

// Subscribe to keep viewingPhase in sync with gameState
gameState.subscribe($state => {
  viewingPhase.set($state.viewingPhase);
});

// Also update gameState when viewingPhase changes
viewingPhase.subscribe($phase => {
  gameState.update(state => ({
    ...state,
    viewingPhase: $phase
  }));
});

// Phase management functions
export function setCurrentPhase(phase: TurnPhase) {
  gameState.update(state => ({
    ...state,
    currentPhase: phase,
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
  gameState.update(state => {
    const nextPhase = getNextPhase(state.currentPhase);
    
    if (nextPhase) {
      return {
        ...state,
        currentPhase: nextPhase,
        viewingPhase: nextPhase
      };
    } else {
      // End of turn - advance to next turn
      return {
        ...state,
        currentTurn: state.currentTurn + 1,
        currentPhase: TurnPhase.PHASE_I,
        viewingPhase: TurnPhase.PHASE_I,
        phaseStepsCompleted: new Map(),
        oncePerTurnActions: new Set()
      };
    }
  });
}

export function markPhaseStepCompleted(stepId: string) {
  gameState.update(state => {
    const newSteps = new Map(state.phaseStepsCompleted);
    newSteps.set(stepId, true);
    return {
      ...state,
      phaseStepsCompleted: newSteps
    };
  });
}

export function isPhaseStepCompleted(stepId: string): boolean {
  const state = get(gameState);
  return state.phaseStepsCompleted.get(stepId) === true;
}

export function resetPhaseSteps() {
  gameState.update(state => ({
    ...state,
    phaseStepsCompleted: new Map()
  }));
}

export function markActionUsed(actionId: string) {
  gameState.update(state => {
    const newActions = new Set(state.oncePerTurnActions);
    newActions.add(actionId);
    return {
      ...state,
      oncePerTurnActions: newActions
    };
  });
}

export function isActionUsed(actionId: string): boolean {
  const state = get(gameState);
  return state.oncePerTurnActions.has(actionId);
}

export function incrementTurn() {
  gameState.update(state => ({
    ...state,
    currentTurn: state.currentTurn + 1,
    phaseStepsCompleted: new Map(),
    oncePerTurnActions: new Set()
  }));
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

// Get current game state for saving (exclude pure UI state)
export function getGameStateForSave() {
  const state = get(gameState);
  return {
    currentTurn: state.currentTurn,
    currentPhase: state.currentPhase,
    phaseStepsCompleted: Array.from(state.phaseStepsCompleted.entries()),
    oncePerTurnActions: Array.from(state.oncePerTurnActions),
    eventDC: state.eventDC
  };
}

// Load game state from saved data
export function loadGameState(savedState: any) {
  gameState.update(state => ({
    ...state,
    currentTurn: savedState.currentTurn || 1,
    currentPhase: savedState.currentPhase || TurnPhase.PHASE_I,
    phaseStepsCompleted: new Map(savedState.phaseStepsCompleted || []),
    oncePerTurnActions: new Set(savedState.oncePerTurnActions || []),
    eventDC: savedState.eventDC || 16,
    viewingPhase: savedState.currentPhase || TurnPhase.PHASE_I  // Set viewing to match loaded phase
  }));
}
