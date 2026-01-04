/**
 * TurnState - Comprehensive turn state tracking system
 * 
 * Single source of truth for all UI state during a turn.
 * Stored in KingdomData for multi-client synchronization.
 * Reset at turn boundaries by StatusPhaseController.
 * 
 * Data architecture:
 * - pendingOutcomes[] stores active check instances (actions, events, incidents)
 * - turnState stores phase-specific UI state (roll results, step progress)
 * - Resolution state is stored within each instance.resolutionState
 */

import type { TurnPhase } from '../actors/KingdomActor';
import type { SerializablePipelineContext } from '../types/PipelineContext';
import type { ResolutionState } from './Modifiers';

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

  // Cohesion check state (triggers when kingdom > 20 claimed hexes)
  cohesionCheckRequired?: boolean;
  cohesionPenalty?: number;  // -1 per 20 hexes beyond 20
  cohesionCheckCompleted?: boolean;
  cohesionActiveLeaderIndex?: number;  // Which leader is active for this turn's check
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
  eventInstanceId: string | null;  // Specific instance ID (ties marker to unique instance)
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
  selectedApproach?: string | null;  // Stores winning vote choice (for strategic events)
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
 * Pipeline status - lifecycle stages for a pipeline execution
 */
export type PipelineStatus = 'pending' | 'rolling' | 'awaiting-confirmation' | 'resolved' | 'applied';

/**
 * Unified pipeline state - single source of truth for all pipeline execution state
 * Replaces fragmented storage in activePipelineContexts and actionsPhase.actionInstances
 *
 * Stored in turnState.activePipelines[instanceId] for:
 * - Roll modifier preservation (rerolls)
 * - Context recovery (page reload)
 * - Status tracking (UI visibility)
 */
export interface PipelineState {
  instanceId: string;
  actionId: string;
  checkType: 'action' | 'event' | 'incident';
  turnNumber: number;
  phase: TurnPhase;
  status: PipelineStatus;
  rollModifiers?: Array<{ label: string; modifier: number; type?: string; enabled?: boolean; ignored?: boolean }>;
  context?: SerializablePipelineContext;
  timestamp: number;
}

/**
 * Complete state for the Actions phase
 */
export interface ActionsPhaseState {
  completed: boolean;
  activeAids: AidEntry[];  // Aid bonuses available for actions this turn
  deployedArmyIds: string[];  // Army IDs that have been deployed this turn
  factionsAidedThisTurn: string[];  // Faction IDs that have provided aid (economic or military) this turn
  // NOTE: actionInstances moved to turnState.activePipelines (unified pipeline state)
}

/**
 * Complete state for the Upkeep phase
 */
export interface UpkeepPhaseState {
  completed: boolean;
  consumptionPaid: boolean;
  militarySupportPaid: boolean;
  buildProjectsAdvanced: boolean;
  fameConversion?: {
    fameUsed: number;
    unrestReduced: number;
  };
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

  // Unified pipeline state (survives page reload, syncs across clients)
  // Keyed by instanceId - stores context, modifiers, and status for all pipelines
  // Cleared at end of turn by StatusPhaseController
  activePipelines: Record<string, PipelineState>;

  // NOTE: Resolution state is now stored in pendingOutcomes[].resolutionState (instance-level)
  // See ResolutionStateHelpers.ts for the unified API

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
    activePipelines: {},

    statusPhase: {
      completed: false,
      fameInitialized: false,
      permanentModifiersApplied: false,
      resourceDecayProcessed: false,
      previousIncidentCleared: false,
      previousOutcomesCleared: false,
      cohesionCheckRequired: false,
      cohesionPenalty: 0,
      cohesionCheckCompleted: false,
      cohesionActiveLeaderIndex: 0
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
      eventInstanceId: null,
      eventResolved: false,
      appliedOutcomes: [],
      activeAids: [],
      selectedApproach: null,  // Reset approach selection between turns
      resolvedOngoingEvents: []  // Reset resolved tracking
    },

    actionsPhase: {
      completed: false,
      activeAids: [],
      deployedArmyIds: [],
      factionsAidedThisTurn: []
    },

    upkeepPhase: {
      completed: false,
      consumptionPaid: false,
      militarySupportPaid: false,
      buildProjectsAdvanced: false
    }
  };
}
