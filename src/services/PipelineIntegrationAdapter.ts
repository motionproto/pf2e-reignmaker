/**
 * Pipeline Integration Adapter
 *
 * Bridges between the old JSON-based action system and the new unified pipeline system.
 * Allows gradual migration by supporting both systems simultaneously.
 */

import { unifiedCheckHandler } from './UnifiedCheckHandler';
import { pipelineRegistry } from '../pipelines/PipelineRegistry';
import type { CheckContext, ResolutionData, CheckMetadata } from '../types/CheckContext';
import type { PlayerAction } from '../controllers/actions/pipeline-types';
import type { KingdomData } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';

/**
 * Configuration for gradual rollout
 */
export const PIPELINE_FEATURE_FLAGS = {
  // Enable pipeline system (master switch)
  ENABLED: true,

  // Actions to use pipeline system (empty = use for all)
  ALLOWLIST: [] as string[],

  // Actions to exclude from pipeline system
  DENYLIST: [] as string[],

  // Log all pipeline executions
  DEBUG: true
};

/**
 * Check if an action should use the pipeline system
 */
export function shouldUsePipeline(actionId: string): boolean {
  if (!PIPELINE_FEATURE_FLAGS.ENABLED) {
    return false;
  }

  // Check denylist first
  if (PIPELINE_FEATURE_FLAGS.DENYLIST.includes(actionId)) {
    return false;
  }

  // CRITICAL: Only use pipeline if it actually exists
  const hasPipeline = unifiedCheckHandler.getCheck(actionId) !== undefined;
  if (!hasPipeline) {
    return false;  // No pipeline implementation = use legacy system
  }

  // If allowlist is empty, use for all actions that have pipelines (except denylisted)
  if (PIPELINE_FEATURE_FLAGS.ALLOWLIST.length === 0) {
    return true;
  }

  // Otherwise, only use if allowlisted AND has pipeline
  return PIPELINE_FEATURE_FLAGS.ALLOWLIST.includes(actionId);
}

/**
 * Pipeline Integration Adapter
 */
export class PipelineIntegrationAdapter {
  /**
   * Initialize the pipeline system
   */
  static initialize(): void {
    console.log('🔧 [PipelineAdapter] Initializing pipeline system');
    logger.info('🔧 [PipelineAdapter] Initializing pipeline system');

    // Initialize pipeline registry
    console.log('🔧 [PipelineAdapter] About to call pipelineRegistry.initialize()');
    pipelineRegistry.initialize();
    console.log('🔧 [PipelineAdapter] pipelineRegistry.initialize() completed');

    console.log('✅ [PipelineAdapter] Pipeline system ready');
    logger.info('✅ [PipelineAdapter] Pipeline system ready');
  }

  /**
   * Check if a pipeline exists for an action
   */
  static hasPipeline(actionId: string): boolean {
    return unifiedCheckHandler.getCheck(actionId) !== undefined;
  }

  /**
   * Convert old-style action to pipeline context
   */
  static createContextFromLegacy(
    action: PlayerAction,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    kingdom: KingdomData,
    metadata?: any,
    resolutionData?: any
  ): CheckContext {
    const context: CheckContext = {
      check: action,
      outcome,
      kingdom,
      metadata: metadata || {},
      resolutionData: resolutionData || this.createEmptyResolutionData()
    };

    return context;
  }

  /**
   * Create empty resolution data
   */
  static createEmptyResolutionData(): ResolutionData {
    return {
      diceRolls: {},
      choices: {},
      allocations: {},
      textInputs: {},
      compoundData: {},
      numericModifiers: [],
      manualEffects: [],
      customComponentData: null
    };
  }

  /**
   * Execute action using pipeline system
   */
  static async executePipelineAction(
    actionId: string,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    kingdom: KingdomData,
    metadata?: CheckMetadata,
    resolutionData?: ResolutionData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pipeline = unifiedCheckHandler.getCheck(actionId);
      if (!pipeline) {
        return { success: false, error: `No pipeline found for ${actionId}` };
      }

      if (PIPELINE_FEATURE_FLAGS.DEBUG) {
        logger.info(`🎯 [PipelineAdapter] Executing ${actionId} via pipeline (${outcome})`);
      }

      // Get the action (for check property in context)
      const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
      const action = pipelineRegistry.getPipeline(actionId);
      if (!action) {
        return { success: false, error: `Action ${actionId} not found` };
      }

      // Create context
      const context = this.createContextFromLegacy(
        action,
        outcome,
        kingdom,
        metadata,
        resolutionData
      );

      // Calculate preview
      const preview = await unifiedCheckHandler.calculatePreview(actionId, context);

      // Execute (apply state changes)
      await unifiedCheckHandler.executeCheck(actionId, context, preview);

      if (PIPELINE_FEATURE_FLAGS.DEBUG) {
        logger.info(`✅ [PipelineAdapter] Successfully executed ${actionId}`);
      }

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Suppress common "selection incomplete" errors during simulation - these are expected
      const isSelectionError = errorMsg.includes('selection incomplete') || 
                              errorMsg.includes('Settlement ID not found') ||
                              errorMsg.includes('No valid selection available');
      
      if (!isSelectionError) {
        logger.error(`❌ [PipelineAdapter] Failed to execute ${actionId}:`, error);
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Check if action needs pre-roll interactions
   */
  static needsPreRollInteraction(actionId: string): boolean {
    return unifiedCheckHandler.needsPreRollInteraction(actionId);
  }

  /**
   * Execute pre-roll interactions
   */
  static async executePreRollInteractions(
    actionId: string,
    kingdom: KingdomData,
    initialMetadata?: CheckMetadata
  ): Promise<CheckMetadata> {
    if (PIPELINE_FEATURE_FLAGS.DEBUG) {
      logger.info(`🎯 [PipelineAdapter] Executing pre-roll interactions for ${actionId}`);
    }

    return await unifiedCheckHandler.executePreRollInteractions(actionId, kingdom, initialMetadata);
  }

  /**
   * Execute post-apply interactions
   */
  static async executePostApplyInteractions(
    instanceId: string,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
  ): Promise<ResolutionData> {
    if (PIPELINE_FEATURE_FLAGS.DEBUG) {
      logger.info(`🎯 [PipelineAdapter] Executing post-apply interactions for instance ${instanceId}`);
    }

    return await unifiedCheckHandler.executePostApplyInteractions(instanceId, outcome);
  }

  /**
   * Get preview for an action
   */
  static async getPreview(
    actionId: string,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    kingdom: KingdomData,
    metadata?: CheckMetadata,
    resolutionData?: ResolutionData
  ) {
    const pipeline = unifiedCheckHandler.getCheck(actionId);
    if (!pipeline) {
      return null;
    }

    const { pipelineRegistry } = await import('../pipelines/PipelineRegistry');
    const action = pipelineRegistry.getPipeline(actionId);
    if (!action) {
      return null;
    }

    const context = this.createContextFromLegacy(
      action,
      outcome,
      kingdom,
      metadata,
      resolutionData
    );

    const preview = await unifiedCheckHandler.calculatePreview(actionId, context);
    const formatted = unifiedCheckHandler.formatPreview(actionId, preview);

    return { preview, formatted };
  }
}

/**
 * Singleton initialization helper
 */
let initialized = false;

export function initializePipelineSystem(): void {
  if (initialized) {
    logger.warn('[PipelineAdapter] Already initialized');
    return;
  }

  PipelineIntegrationAdapter.initialize();
  initialized = true;
}

/**
 * Force re-initialization (for HMR)
 * Called when modules hot-reload during development
 */
export function reinitializePipelineSystem(): void {
  logger.info('🔄 [PipelineAdapter] Hot reload detected, re-initializing pipeline system');
  initialized = false;  // Reset guard
  initializePipelineSystem();
}

// Hot Module Replacement support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    logger.info('🔥 [PipelineAdapter] Module hot reloaded');
    reinitializePipelineSystem();
  });
}
