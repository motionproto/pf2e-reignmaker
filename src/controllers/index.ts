/**
 * Controllers - Orchestration layer for coordinating services and commands
 * 
 * Controllers manage the interaction between domain services, commands,
 * and UI components, providing a clean interface for complex operations.
 */

export { EventPhaseController, createEventPhaseController } from './EventPhaseController';
export type { EventPhaseState } from './EventPhaseController';

export { ActionPhaseController, createActionPhaseController } from './ActionPhaseController';
export type { ActionPhaseState, ActionResolution } from './ActionPhaseController';

export { UnrestPhaseController, createUnrestPhaseController } from './UnrestPhaseController';
export type { UnrestPhaseState, IncidentResolution } from './UnrestPhaseController';

export { StatusPhaseController, createStatusPhaseController } from './StatusPhaseController';
export type { StatusPhaseState, MilestoneCheck } from './StatusPhaseController';

export { UpkeepPhaseController, createUpkeepPhaseController } from './UpkeepPhaseController';
export type { UpkeepPhaseState, ProjectProgress, UpkeepPhaseSummary } from './UpkeepPhaseController';

// Future controllers can be added here:
export { ResourcePhaseController, createResourcePhaseController } from './ResourcePhaseController';
// export { TurnController } from './TurnController';
