/**
 * Domain Services - Generic utilities and complex operations
 * 
 * This index file exports truly generic services that are NOT tied to specific
 * controllers or phases. Controller-specific logic should live in the controller
 * folders.
 * 
 * REMOVED SERVICES:
 * - UnrestService → deleted (unused)
 * - ResourceManagementService → deleted (unused)
 * - BuildQueueService → deleted (violated architecture)
 * - EventService → deleted (events now in TypeScript pipelines)
 * - IncidentService → deleted (incidents now in TypeScript pipelines)
 * - ActionExecutionService → deleted (actions now in TypeScript pipelines)
 * 
 * All actions, events, and incidents are now defined in src/pipelines/ and
 * accessed via PipelineRegistry.
 */

export { diceService } from './DiceService'
export { kingdomModifierService } from './KingdomModifierService'
export type { ModifierCheckOptions } from './KingdomModifierService'
