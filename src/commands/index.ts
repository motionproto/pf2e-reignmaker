/**
 * Command Pattern Implementation
 * 
 * This module exports all command pattern classes for state mutations,
 * providing validation, execution, rollback, and undo/redo capabilities.
 */

// Base command infrastructure
export { Command, CompositeCommand, MacroCommand } from './base/Command';
export type { CommandContext, CommandResult } from './base/Command';

export { CommandExecutor, commandExecutor } from './base/CommandExecutor';
export type { ExecutionOptions, ExecutionEvent, ExecutionListener } from './base/CommandExecutor';

export { CommandHistory } from './base/CommandHistory';

// Command implementations
export { ApplyEventOutcomeCommand } from './impl/ApplyEventOutcomeCommand';
export type { EventOutcomeData } from './impl/ApplyEventOutcomeCommand';

export { ExecuteActionCommand } from './impl/ExecuteActionCommand';
export type { ActionExecutionData } from './impl/ExecuteActionCommand';

export { UpdateResourcesCommand } from './impl/UpdateResourcesCommand';
export type { UpdateResourcesData, ResourceUpdate } from './impl/UpdateResourcesCommand';

export { ResetKingdomCommand } from './impl/ResetKingdomCommand';
export type { ResetKingdomData } from './impl/ResetKingdomCommand';

export { ProcessUnrestCommand } from './impl/ProcessUnrestCommand';
export type { ProcessUnrestData, UnrestChange } from './impl/ProcessUnrestCommand';

// Future command implementations can be added here:
// export { UpdateFameCommand } from './impl/UpdateFameCommand';
// export { ProcessUpkeepCommand } from './impl/ProcessUpkeepCommand';
// export { ApplyModifierCommand } from './impl/ApplyModifierCommand';
// export { ProcessIncidentCommand } from './impl/ProcessIncidentCommand';
// export { TransitionPhaseCommand } from './impl/TransitionPhaseCommand';
