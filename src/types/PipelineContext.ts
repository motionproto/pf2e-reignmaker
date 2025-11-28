/**
 * PipelineContext.ts
 *
 * Unified context object that persists through all 9 pipeline steps.
 * Replaces the fragmented approach where data was scattered across
 * instance.metadata, resolutionData, and global state.
 */

import type { CheckPipeline, OutcomeType, KingdomSkill } from './CheckPipeline';
import type { ActorContext, ResolutionData, CheckMetadata } from './CheckContext';
import type { PreviewData } from './PreviewData';
import type { KingdomData } from '../actors/KingdomActor';

/**
 * Step execution result
 */
export interface StepResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Step log entry for debugging
 */
export interface StepLog {
  step: number;
  stepName: string;
  timestamp: number;
  message: string;
  data?: any;
}

/**
 * Roll data from Step 3
 */
export interface RollData {
  skill: KingdomSkill;
  dc: number;
  roll: any;  // PF2e ChatMessage
  outcome: OutcomeType;
  rollBreakdown?: {
    d20Result: number;
    total: number;
    dc: number;  // Include DC for OutcomeDisplay
    modifiers: any[];
  };
}

/**
 * Execution result from Step 8
 */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  message?: string;
  resourceChanges?: Array<{
    resource: string;
    oldValue: number;
    newValue: number;
    delta: number;
  }>;
  entitiesCreated?: string[];
  entitiesModified?: string[];
  entitiesDeleted?: string[];
}

/**
 * Complete context for pipeline execution
 * 
 * Persists through all 9 steps, accumulating data at each step.
 * Single source of truth for all pipeline state.
 */
export interface PipelineContext {
  // ========================================
  // Immutable Identifiers (set once, never changed)
  // ========================================
  
  /** Check ID (action/event/incident ID) */
  readonly actionId: string;
  
  /** Check type */
  readonly checkType: 'action' | 'event' | 'incident';
  
  /** User ID who initiated the check */
  readonly userId: string;
  
  // ========================================
  // Step-Specific Data (accumulated through pipeline)
  // ========================================
  
  /** Step 1: Actor context (character who performed check) */
  actor?: ActorContext;
  
  /** Step 2: Metadata from pre-roll interactions */
  metadata: CheckMetadata;
  
  /** Step 3: Roll data */
  rollData?: RollData;
  
  /** Step 4: Check instance ID (created by CheckInstanceService) */
  instanceId?: string;
  
  /** Step 5: Preview calculation results */
  preview?: PreviewData;
  
  /** Step 6: User confirmed the outcome */
  userConfirmed: boolean;
  
  /** Step 7: Resolution data from post-apply interactions */
  resolutionData: ResolutionData;
  
  /** Step 8: Execution result */
  executionResult?: ExecutionResult;
  
  // ========================================
  // Reroll Flag
  // ========================================
  
  /** Explicit flag: Is this a reroll of a previous roll? */
  isReroll?: boolean;
  
  // ========================================
  // Live Data Access
  // ========================================
  
  /** Kingdom data snapshot (updated before each step) */
  kingdom?: KingdomData;
  
  // ========================================
  // Helpers & Utilities
  // ========================================
  
  /** Centralized logging for debugging */
  logs: StepLog[];
  
  /** Internal: Resume callback for Step 6 pause/resume */
  _resumeCallback?: () => void;
  
  /** Internal: Temporary storage for modifiers (Step 3 → Step 4) */
  _pendingModifiers?: Array<{ label: string; modifier: number; enabled: boolean; ignored: boolean }>;
}

/**
 * Helper: Get kingdom data from context
 * 
 * @throws Error if kingdom data not available
 */
export function getKingdom(ctx: PipelineContext): KingdomData {
  if (!ctx.kingdom) {
    throw new Error('[PipelineContext] Kingdom data not available');
  }
  return ctx.kingdom;
}

/**
 * Helper: Get pipeline configuration from context
 * 
 * Retrieves the pipeline config from PipelineRegistry using actionId.
 * 
 * @throws Error if pipeline not found
 */
export async function getPipeline(ctx: PipelineContext): Promise<CheckPipeline> {
  // Import registry (circular dependency safe - done at runtime)
  console.log(`🔍 [PipelineContext.getPipeline] Looking up pipeline: ${ctx.actionId}`);
  const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
  console.log(`🔍 [PipelineContext.getPipeline] Registry imported, calling getPipeline()`);
  
  const pipeline = pipelineRegistry.getPipeline(ctx.actionId);
  console.log(`🔍 [PipelineContext.getPipeline] Result:`, pipeline ? 'FOUND ✅' : 'NOT FOUND ❌');
  
  if (!pipeline) {
    throw new Error(`[PipelineContext] Pipeline not found: ${ctx.actionId}`);
  }
  
  return pipeline;
}

/**
 * Helper: Get actor from context
 * 
 * @throws Error if actor data not available
 */
export function getActor(ctx: PipelineContext): ActorContext {
  if (!ctx.actor) {
    throw new Error('[PipelineContext] Actor data not available');
  }
  return ctx.actor;
}

/**
 * Helper: Get roll outcome from context
 * 
 * @throws Error if roll data not available
 */
export function getOutcome(ctx: PipelineContext): OutcomeType {
  if (!ctx.rollData) {
    throw new Error('[PipelineContext] Roll data not available');
  }
  return ctx.rollData.outcome;
}

/**
 * Helper: Add log entry to context
 */
export function log(ctx: PipelineContext, step: number, stepName: string, message: string, data?: any): void {
  ctx.logs.push({
    step,
    stepName,
    timestamp: Date.now(),
    message,
    data
  });
  
  // Also log to console with emoji indicator
  const emoji = step === 0 ? '🏁' : step === 9 ? '✅' : '🔹';
  console.log(`${emoji} [PipelineCoordinator] Step ${step} (${stepName}): ${message}`, data || '');
}

/**
 * Create initial pipeline context
 */
export function createPipelineContext(
  actionId: string,
  checkType: 'action' | 'event' | 'incident',
  userId: string,
  initialData: Partial<PipelineContext> = {}
): PipelineContext {
  return {
    // Immutable
    actionId,
    checkType,
    userId,
    
    // Step data (initialized empty)
    actor: initialData.actor,
    metadata: initialData.metadata || {},
    rollData: initialData.rollData,
    instanceId: initialData.instanceId,
    preview: initialData.preview,
    userConfirmed: false,
    resolutionData: initialData.resolutionData || {
      diceRolls: {},
      choices: {},
      allocations: {},
      textInputs: {},
      compoundData: {},
      numericModifiers: [],
      manualEffects: [],
      customComponentData: null
    },
    executionResult: initialData.executionResult,
    
    // Live data
    kingdom: initialData.kingdom,
    
    // Logging
    logs: []
  };
}
