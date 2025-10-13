/**
 * TurnState - Comprehensive turn state tracking system
 * 
 * Single source of truth for all UI state during a turn.
 * Stored in KingdomData for multi-client synchronization.
 * Reset at turn boundaries by StatusPhaseController.
 * 
 * MIGRATION PLAN (Active Check Instance Unification):
 * - Phase 1: Create activeCheckInstances alongside existing state (COMPLETE)
 * - Phase 2: Migrate incidents to use activeCheckInstances (IN PROGRESS)
 * - Phase 3: Migrate events to use activeCheckInstances
 * - Phase 4: Remove legacy fields (incidentResolution, eventId, activeEventInstances)
 */

import type { TurnPhase } from '../actors/KingdomActor';

/**
 * Action log entry - tracks individual actions performed by players during a turn
 */
export interface ActionLogEntry {
  playerId: string;
  playerName: string;
  characterName: string;  // Character who made the roll
  actionName: string;     // Format: "event_id-outcome" or "action_id-outcome"
  phase: TurnPhase;
  timestamp: number;
}

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
  displayModifiers?: any[];  // Display-only modifiers for Status phase UI (size, metropolises, etc.)
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
  initialized?: boolean;  // Track if phase has been initialized (for cleanup guard)
  incidentRolled: boolean;
  incidentRoll?: number;
  incidentChance?: number;  // Chance threshold for incident
  incidentTriggered: boolean;
  incidentId: string | null;
  incidentResolved: boolean;
  incidentOutcome?: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  incidentSkillUsed?: string;
  incidentResolution?: {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName: string;
    effect: string;
    modifiers?: any[];
    manualEffects?: string[];
    rollBreakdown?: any;
    shortfallResources?: string[];
    effectsApplied?: boolean;  // Track if "Apply Result" was clicked (syncs across clients)
  };
  resolutionState?: import('../models/Modifiers').ResolutionState;  // Intermediate state (choices, dice rolls) - syncs across clients
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
  activeAids: AidEntry[];  // Aid bonuses available for the current event
  resolvedOngoingEvents?: string[];  // Event IDs resolved this turn (for phase gate)
}

/**
 * Aid Another entry - tracks aids provided by players
 */
export interface AidEntry {
  playerId: string;
  playerName: string;
  characterName: string;
  targetActionId: string;
  skillUsed: string;
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  bonus: number;  // Calculated bonus based on outcome and proficiency
  grantKeepHigher: boolean;  // Critical success grants keep higher roll (fortune effect)
  timestamp: number;
}

/**
 * Complete state for the Actions phase
 */
export interface ActionsPhaseState {
  completed: boolean;
  activeAids: AidEntry[];  // Aid bonuses available for actions this turn
  // Removed: playerActions - now using actionLog at top level instead
  // Removed: completionsByAction - now using actionLog instead
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
  
  // Action tracking across all phases
  actionLog: ActionLogEntry[];
  
  // NEW: Unified intermediate resolution state for all CheckCards
  // Keyed by checkId (instanceId for events, "incident-{id}" for incidents, etc.)
  // Contains in-progress choice selections and dice rolls
  activeResolutions: Record<string, import('../models/Modifiers').ResolutionState>;
  
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
    actionLog: [],
    activeResolutions: {},
    
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
      incidentRoll: undefined,
      incidentTriggered: false,
      incidentId: null,
      incidentResolved: false,
      incidentOutcome: undefined,
      incidentSkillUsed: undefined,
      incidentResolution: undefined,
      resolutionState: undefined,
      appliedOutcome: undefined
    },
    
    eventsPhase: {
      completed: false,
      eventRolled: false,
      eventTriggered: false,
      eventId: null,
      eventResolved: false,
      appliedOutcomes: [],
      activeAids: []
    },
    
    actionsPhase: {
      completed: false,
      activeAids: []
    },
    
    upkeepPhase: {
      completed: false,
      consumptionPaid: false,
      militarySupportPaid: false,
      buildProjectsAdvanced: false
    }
  };
}
