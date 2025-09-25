import { writable, get } from 'svelte/store';
import { TurnPhase } from '../models/KingdomState';
import { EventManager } from '../models/Events';
import { kingdomState } from '../stores/kingdom';
import { IncidentManager } from '../models/Incidents';
import type { Writable } from 'svelte/store';

/**
 * Game state store for managing game flow, turn progression, and UI state
 * This is separate from kingdom state which holds pure kingdom data
 */

interface GameState {
  // Turn and phase management
  currentTurn: number;
  currentPhase: TurnPhase;
  phaseStepsCompleted: Map<string, boolean>;
  phasesCompleted: Set<TurnPhase>;  // Track which phases are fully complete
  oncePerTurnActions: Set<string>;
  
  // Event management
  eventDC: number;
  eventManager: EventManager;
  
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
  [TurnPhase.PHASE_VI, ['upkeep-complete']],  // Resolution/Upkeep phase
]);

// Initialize game state
const initialGameState: GameState = {
  currentTurn: 1,
  currentPhase: TurnPhase.PHASE_I,
  phaseStepsCompleted: new Map(),
  phasesCompleted: new Set(),
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
    const oldPhase = state.currentPhase;
    const nextPhase = getNextPhase(state.currentPhase);
    
    if (nextPhase) {
      console.log('[gameState] Phase advancing from', oldPhase, 'to', nextPhase);
      return {
        ...state,
        currentPhase: nextPhase,
        viewingPhase: nextPhase
      };
    } else {
      // End of turn - advance to next turn
      console.log('[gameState] End of turn - advancing from turn', state.currentTurn, 'to turn', state.currentTurn + 1);
      return {
        ...state,
        currentTurn: state.currentTurn + 1,
        currentPhase: TurnPhase.PHASE_I,
        viewingPhase: TurnPhase.PHASE_I,
        phaseStepsCompleted: new Map(),
        phasesCompleted: new Set(),
        oncePerTurnActions: new Set()
      };
    }
  });
}

// Check if a phase is complete (all required steps done)
export function isPhaseComplete(phase: TurnPhase): boolean {
  const state = get(gameState);
  const requiredSteps = PHASE_REQUIRED_STEPS.get(phase) || [];
  
  // If no required steps, phase is always "complete" (e.g., Actions phase)
  if (requiredSteps.length === 0) {
    return true;
  }
  
  // Check if all required steps are completed
  return requiredSteps.every(step => state.phaseStepsCompleted.get(step) === true);
}

// Mark a phase as complete
export function markPhaseComplete(phase: TurnPhase) {
  gameState.update(state => {
    const newPhasesCompleted = new Set(state.phasesCompleted);
    newPhasesCompleted.add(phase);
    return {
      ...state,
      phasesCompleted: newPhasesCompleted
    };
  });
}

// Check if current phase is complete
export function isCurrentPhaseComplete(): boolean {
  const state = get(gameState);
  return isPhaseComplete(state.currentPhase);
}

// Check if a phase can be operated (all previous phases must be complete)
export function canOperatePhase(phase: TurnPhase): boolean {
  const state = get(gameState);
  const phases = Object.values(TurnPhase);
  const targetIndex = phases.indexOf(phase);
  const currentIndex = phases.indexOf(state.currentPhase);
  
  // Can always operate the current phase or earlier phases
  if (targetIndex <= currentIndex) {
    return true;
  }
  
  // For future phases, check if all phases up to (but not including) the target are complete
  for (let i = 0; i < targetIndex; i++) {
    if (!state.phasesCompleted.has(phases[i]) && !isPhaseComplete(phases[i])) {
      return false;
    }
  }
  
  return true;
}

export function markPhaseStepCompleted(stepId: string) {
  // Get kingdom state (imported at module level)
  const kingdom = get(kingdomState);
  
  gameState.update(state => {
    const newSteps = new Map(state.phaseStepsCompleted);
    newSteps.set(stepId, true);
    
    // Check if this completes the current phase
    const updatedState = {
      ...state,
      phaseStepsCompleted: newSteps
    };
    
    // Auto-complete related steps based on game rules (synchronous)
    // Status Phase: If gain-fame is done and no modifiers exist, auto-complete apply-modifiers
    if (stepId === 'gain-fame' && state.currentPhase === TurnPhase.PHASE_I) {
      const hasModifiers = kingdom.ongoingModifiers && kingdom.ongoingModifiers.length > 0;
      if (!hasModifiers && !updatedState.phaseStepsCompleted.get('apply-modifiers')) {
        updatedState.phaseStepsCompleted.set('apply-modifiers', true);
        console.log('[gameState] Auto-completed apply-modifiers (no modifiers exist)');
      }
    }
    
    // After updating steps, check if current phase is now complete
    const requiredSteps = PHASE_REQUIRED_STEPS.get(state.currentPhase) || [];
    const phaseNowComplete = requiredSteps.length > 0 && 
      requiredSteps.every(step => updatedState.phaseStepsCompleted.get(step) === true);
    
    if (phaseNowComplete && !state.phasesCompleted.has(state.currentPhase)) {
      const newPhasesCompleted = new Set(state.phasesCompleted);
      newPhasesCompleted.add(state.currentPhase);
      updatedState.phasesCompleted = newPhasesCompleted;
      console.log(`[gameState] Phase ${state.currentPhase} marked as complete`);
    }
    
    return updatedState;
  });
}

// Check phase-specific conditions for auto-completion
export function checkPhaseAutoCompletions(phase: TurnPhase) {
  const kingdom = get(kingdomState);
  const state = get(gameState);
  
  // Unrest Phase: Auto-complete if kingdom is stable
  if (phase === TurnPhase.PHASE_III) {
    const currentUnrest = kingdom.unrest || 0;
    const tier = IncidentManager.getUnrestTier(currentUnrest);
    
    if (tier === 0 && !state.phaseStepsCompleted.get('calculate-unrest')) {
      markPhaseStepCompleted('calculate-unrest');
      console.log('[gameState] Auto-completed calculate-unrest (kingdom is stable)');
    }
  }
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
    phasesCompleted: new Set(),
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
    phasesCompleted: Array.from(state.phasesCompleted),
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
    phasesCompleted: new Set(savedState.phasesCompleted || []),
    oncePerTurnActions: new Set(savedState.oncePerTurnActions || []),
    eventDC: savedState.eventDC || 16,
    viewingPhase: savedState.currentPhase || TurnPhase.PHASE_I  // Set viewing to match loaded phase
  }));
}
