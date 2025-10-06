/**
 * TurnState - Comprehensive turn state tracking system
 * 
 * Single source of truth for all UI state during a turn.
 * Stored in KingdomData for multi-client synchronization.
 * Reset at turn boundaries by StatusPhaseController.
 */

import type { TurnPhase } from '../actors/KingdomActor';

/**
 * Complete state for the Status phase
 */
export interface StatusPhaseState {
  completed: boolean;
  fameInitialized: boolean;
  permanentModifiersApplied: boolean;
  resourceDecayProcessed: boolean;
  previousIncidentCleared: boolean;
  previousOutcomesCleared: boolean;
}

/**
 * Complete state for the Resources phase
 */
export interface ResourcesPhaseState {
  completed: boolean;
  resourcesCollected: boolean;
}

/**
 * Complete state for the Unrest phase
 */
export interface UnrestPhaseState {
  completed: boolean;
  incidentRolled: boolean;
  incidentRoll?: number;
  incidentTriggered: boolean;
  incidentId: string | null;
  incidentResolved: boolean;
  incidentOutcome?: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  incidentSkillUsed?: string;
  appliedOutcome?: {
    incidentId: string;
    incidentName: string;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    skillUsed: string;
    effect: string;
    stateChanges: Record<string, any>;
    modifiers: any[];
    manualEffects: string[];
  };
}

/**
 * Complete state for the Events phase
 */
export interface EventsPhaseState {
  completed: boolean;
  eventRolled: boolean;
  eventRoll?: number;
  eventTriggered: boolean;
  eventId: string | null;
  eventResolved: boolean;
  appliedOutcomes: Array<{
    eventId: string;
    eventName: string;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    skillUsed: string;
    effect: string;
    stateChanges: Record<string, any>;
    modifiers: any[];
    manualEffects: string[];
  }>;
}

/**
 * Complete state for the Actions phase
 */
export interface ActionsPhaseState {
  completed: boolean;
  playerActions: Record<string, {
    playerId: string;
    playerName: string;
    playerColor: string;
    actionSpent: boolean;
    spentInPhase?: TurnPhase;
  }>;
}

/**
 * Complete state for the Upkeep phase
 */
export interface UpkeepPhaseState {
  completed: boolean;
  consumptionPaid: boolean;
  militarySupportPaid: boolean;
  buildProjectsAdvanced: boolean;
}

/**
 * Complete turn state - all phases in one object
 * This is the single source of truth for UI behavior
 */
export interface TurnState {
  // Turn metadata
  turnNumber: number;
  
  // Phase-specific state objects
  statusPhase: StatusPhaseState;
  resourcesPhase: ResourcesPhaseState;
  unrestPhase: UnrestPhaseState;
  eventsPhase: EventsPhaseState;
  actionsPhase: ActionsPhaseState;
  upkeepPhase: UpkeepPhaseState;
}

/**
 * Create a fresh turn state for a new turn
 */
export function createDefaultTurnState(turnNumber: number): TurnState {
  return {
    turnNumber,
    
    statusPhase: {
      completed: false,
      fameInitialized: false,
      permanentModifiersApplied: false,
      resourceDecayProcessed: false,
      previousIncidentCleared: false,
      previousOutcomesCleared: false
    },
    
    resourcesPhase: {
      completed: false,
      resourcesCollected: false
    },
    
    unrestPhase: {
      completed: false,
      incidentRolled: false,
      incidentTriggered: false,
      incidentId: null,
      incidentResolved: false
    },
    
    eventsPhase: {
      completed: false,
      eventRolled: false,
      eventTriggered: false,
      eventId: null,
      eventResolved: false,
      appliedOutcomes: []
    },
    
    actionsPhase: {
      completed: false,
      playerActions: {}
    },
    
    upkeepPhase: {
      completed: false,
      consumptionPaid: false,
      militarySupportPaid: false,
      buildProjectsAdvanced: false
    }
  };
}
