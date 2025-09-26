/**
 * Domain Services
 * 
 * This module exports all domain services that contain business logic
 * extracted from UI components. These services handle the core game
 * mechanics and rules, independent of the UI layer.
 */

export { DiceService, diceService } from './DiceService';
export type { DiceRoll, D20Result } from './DiceService';

export { EventResolutionService } from './EventResolutionService';
export type { 
    StabilityCheckResult, 
    EventOutcomeApplication, 
    EventResolutionResult 
} from './EventResolutionService';

export { UnrestService, unrestService } from './UnrestService';
export type {
    UnrestStatus,
    IncidentCheckResult,
    IncidentResolutionResult
} from './UnrestService';

export { ActionExecutionService, actionExecutionService } from './ActionExecutionService';
export type {
    ActionRequirement,
    ParsedActionEffect,
    ActionOutcome
} from './ActionExecutionService';

export { ResourceManagementService, resourceManagementService } from './ResourceManagementService';
export type {
    ResourceConsumption,
    ResourceDecay
} from './ResourceManagementService';
