/**
 * Domain Services - Generic utilities and complex operations
 * 
 * This index file exports truly generic services that are NOT tied to specific
 * controllers or phases. Controller-specific logic should live in the controller
 * folders.
 * 
 * REMOVED SERVICES (now in controllers):
 * - UnrestService → deleted (unused)
 * - ResourceManagementService → deleted (unused)
 * - BuildQueueService → deleted (violated architecture)
 * - EventService → moved to controllers/events/event-loader.ts
 * - IncidentService → moved to controllers/incidents/incident-loader.ts
 * - ActionExecutionService → moved to controllers/actions/action-helpers.ts
 */

export { diceService } from './DiceService'
