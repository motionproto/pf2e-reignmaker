/**
 * Pipeline Types System
 * 
 * Unified exports and auto-resolve helpers for simulation.
 * This system provides typed data requirements for all 94 pipelines:
 * - 27 actions
 * - 37 events  
 * - 30 incidents
 */

// Export all types and resolvers from category files
export * from './actions';
export * from './events';
export * from './incidents';

// Import for unified resolver
import type { KingdomData } from '../../actors/KingdomActor';
import type { OutcomeType, CheckType } from '../../types/CheckPipeline';
import { resolveActionData, type SimulationContext, type ActionResolvedData } from './actions';
import { resolveEventData, type EventSimulationContext, type EventResolvedData } from './events';
import { resolveIncidentData, type IncidentSimulationContext, type IncidentResolvedData } from './incidents';

// =============================================================================
// UNIFIED TYPES
// =============================================================================

export interface UnifiedSimulationContext {
  kingdom: KingdomData;
  exploredHexIds: Set<string>;
  outcome: OutcomeType;
  turn: number;
  proficiencyRank?: number;
}

export interface UnifiedResolvedData {
  metadata?: Record<string, any>;
  compoundData?: Record<string, any>;
  customComponentData?: Record<string, any>;
}

// =============================================================================
// UNIFIED RESOLVER
// =============================================================================

/**
 * Auto-resolve data requirements for any pipeline
 * 
 * @param pipelineId - The pipeline ID
 * @param checkType - 'action', 'event', or 'incident'
 * @param ctx - Simulation context with kingdom state
 * @returns Resolved data ready to inject into pipeline context, or null if cannot be resolved
 */
export function autoResolve(
  pipelineId: string,
  checkType: CheckType,
  ctx: UnifiedSimulationContext
): UnifiedResolvedData | null {
  switch (checkType) {
    case 'action':
      return resolveActionData(pipelineId, ctx as SimulationContext);
      
    case 'event':
      return resolveEventData(pipelineId, ctx as EventSimulationContext);
      
    case 'incident':
      return resolveIncidentData(pipelineId, ctx as IncidentSimulationContext);
      
    default:
      console.warn(`[PipelineTypes] Unknown check type: ${checkType}`);
      return {};
  }
}

/**
 * Prepare pipeline context with auto-resolved data
 * 
 * This merges the resolved data into a context object that can be passed
 * to the pipeline execution system.
 * 
 * @param pipelineId - The pipeline ID
 * @param checkType - 'action', 'event', or 'incident'
 * @param ctx - Simulation context with kingdom state
 * @returns Context object with metadata and resolutionData populated
 */
export function prepareContextWithResolvedData(
  pipelineId: string,
  checkType: CheckType,
  ctx: UnifiedSimulationContext
): {
  metadata: Record<string, any>;
  resolutionData: {
    compoundData: Record<string, any>;
    customComponentData: Record<string, any>;
  };
} | null {
  const resolved = autoResolve(pipelineId, checkType, ctx);
  
  if (resolved === null) {
    return null; // Cannot perform this action
  }
  
  return {
    metadata: resolved.metadata || {},
    resolutionData: {
      compoundData: resolved.compoundData || {},
      customComponentData: resolved.customComponentData || {}
    }
  };
}

/**
 * Check if a pipeline has special data requirements
 * 
 * @param pipelineId - The pipeline ID
 * @param checkType - 'action', 'event', or 'incident'
 * @returns True if the pipeline needs auto-resolved data
 */
export function hasDataRequirements(pipelineId: string, checkType: CheckType): boolean {
  const resolved = autoResolve(pipelineId, checkType, {
    kingdom: {} as KingdomData,
    exploredHexIds: new Set(),
    outcome: 'success',
    turn: 1
  });
  
  if (!resolved) return false;
  
  return !!(
    (resolved.metadata && Object.keys(resolved.metadata).length > 0) ||
    (resolved.compoundData && Object.keys(resolved.compoundData).length > 0) ||
    (resolved.customComponentData && Object.keys(resolved.customComponentData).length > 0)
  );
}

// =============================================================================
// DIAGNOSTICS
// =============================================================================

/**
 * Get a summary of all pipeline data requirements for debugging
 */
export function getAllDataRequirementsSummary(): {
  actions: number;
  events: number;
  incidents: number;
  total: number;
  breakdown: {
    none: number;
    metadata: number;
    compoundData: number;
    customComponentData: number;
    callback: number;
    gameCommand: number;
  };
} {
  const { getActionDataSummary } = require('./actions');
  const { getEventDataSummary } = require('./events');
  const { getIncidentDataSummary } = require('./incidents');
  
  const actions = getActionDataSummary();
  const events = getEventDataSummary();
  const incidents = getIncidentDataSummary();
  
  const breakdown = {
    none: 0,
    metadata: 0,
    compoundData: 0,
    customComponentData: 0,
    callback: 0,
    gameCommand: 0
  };
  
  for (const a of actions) {
    const loc = a.location as keyof typeof breakdown;
    if (loc in breakdown) breakdown[loc]++;
  }
  
  for (const e of events) {
    const loc = e.location as keyof typeof breakdown;
    if (loc in breakdown) breakdown[loc]++;
  }
  
  for (const i of incidents) {
    const loc = i.location as keyof typeof breakdown;
    if (loc in breakdown) breakdown[loc]++;
  }
  
  return {
    actions: actions.length,
    events: events.length,
    incidents: incidents.length,
    total: actions.length + events.length + incidents.length,
    breakdown
  };
}











