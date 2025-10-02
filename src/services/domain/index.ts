/**
 * Domain Services Index
 * 
 * Generic, reusable services that don't belong to specific controllers.
 * Controller-specific logic should be in the respective controller folders.
 */

// Generic action execution utilities
export { ActionExecutionService } from './ActionExecutionService';

// Generic dice utilities
export { DiceService } from './DiceService';

/**
 * REMOVED SERVICES (moved to controller folders):
 * - EventService → src/controllers/events/event-loader.ts
 * - IncidentService → src/controllers/incidents/incident-loader.ts
 * - UnrestService (deleted - unused)
 * - ResourceManagementService (deleted - unused)
 * - BuildQueueService (deleted - violated architecture)
 * - modifiers/ folder (deleted - unused)
 */
