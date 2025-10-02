/**
 * Turn Manager Module - Central turn and phase coordination
 * 
 * This module provides centralized turn/phase management with clean separation:
 * - TurnManager: Main coordinator for turns, phases, and player actions
 * - PhaseHandler: Business logic for phase step management
 */

export { TurnManager } from './TurnManager';
export { PhaseHandler } from './phase-handler';
export type { StepCompletionResult } from './phase-handler';
