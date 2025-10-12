/**
 * Type-safe step constants for phase controllers
 * 
 * Using numeric indices with descriptive constants to prevent typos and runtime errors.
 * Each phase has a clear enumeration of its steps by index.
 */

import { TurnPhase } from '../../actors/KingdomActor';

/**
 * Status Phase Steps
 */
export const StatusPhaseSteps = {
  STATUS: 0
} as const;

/**
 * Resources Phase Steps
 */
export const ResourcesPhaseSteps = {
  COLLECT_RESOURCES: 0
} as const;

/**
 * Events Phase Steps
 */
export const EventsPhaseSteps = {
  EVENT_ROLL: 0,
  RESOLVE_EVENT: 1,
  APPLY_MODIFIERS: 2
} as const;

/**
 * Unrest Phase Steps
 */
export const UnrestPhaseSteps = {
  CALCULATE_UNREST: 0,
  INCIDENT_CHECK: 1,
  RESOLVE_INCIDENT: 2
} as const;

/**
 * Action Phase Steps
 */
export const ActionPhaseSteps = {
  EXECUTE_ACTIONS: 0
} as const;

/**
 * Upkeep Phase Steps
 */
export const UpkeepPhaseSteps = {
  FEED_SETTLEMENTS: 0,
  SUPPORT_MILITARY: 1,
  PROCESS_BUILDS: 2
} as const;

/**
 * Helper type for step indices
 */
export type PhaseStepIndex = number;

/**
 * Get step constant enum for a specific phase
 */
export function getPhaseStepConstants(phase: TurnPhase) {
  switch (phase) {
    case TurnPhase.STATUS: return StatusPhaseSteps;
    case TurnPhase.RESOURCES: return ResourcesPhaseSteps;
    case TurnPhase.EVENTS: return EventsPhaseSteps;
    case TurnPhase.UNREST: return UnrestPhaseSteps;
    case TurnPhase.ACTIONS: return ActionPhaseSteps;
    case TurnPhase.UPKEEP: return UpkeepPhaseSteps;
  }
}
