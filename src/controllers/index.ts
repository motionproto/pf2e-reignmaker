/**
 * Controller exports - Simple factory function exports
 * 
 * All controllers now use the factory function pattern with standardized
 * error handling and shared helper functions.
 */

export { createActionPhaseController } from './ActionPhaseController';
export { createEventPhaseController } from './EventPhaseController';
export { createResourcePhaseController } from './ResourcePhaseController';
export { createStatusPhaseController } from './StatusPhaseController';
export { createUnrestPhaseController } from './UnrestPhaseController';
export { createUpkeepPhaseController } from './UpkeepPhaseController';

// Re-export types that may be used by consumers
// (ActionResolution removed - not needed in new simplified controller)
