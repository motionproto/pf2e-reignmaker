/**
 * Pipeline Integration Adapter
 *
 * Bridges between the old JSON-based action system and the new unified pipeline system.
 * Allows gradual migration by supporting both systems simultaneously.
 */

import { unifiedCheckHandler } from './UnifiedCheckHandler';
import { pipelineRegistry } from '../pipelines/PipelineRegistry';
import type { CheckContext, ResolutionData, CheckMetadata } from '../types/CheckContext';
import type { PlayerAction } from '../controllers/actions/action-types';
import type { KingdomData } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';

/**
 * Configuration for gradual rollout
 */
export const PIPELINE_FEATURE_FLAGS = {
  // Enable pipeline system (master switch)
  ENABLED: true,

  // Actions to use pipeline system (empty = use for all)
  WHITELIST: [] as string[],

  // Actions to exclude from pipeline system
  BLACKLIST: [] as string[],

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

  // Check blacklist first
  if (PIPELINE_FEATURE_FLAGS.BLACKLIST.includes(actionId)) {
    return false;
  }

  // If whitelist is empty, use for all (except blacklisted)
  if (PIPELINE_FEATURE_FLAGS.WHITELIST.length === 0) {
    return true;
  }

  // Otherwise, only use if whitelisted
  return PIPELINE_FEATURE_FLAGS.WHITELIST.includes(actionId);
}

/**
 * Pipeline Integration Adapter
 */
export class PipelineIntegrationAdapter {
  /**
   * Initialize the pipeline system
   */
  static initialize(): void {
    logger.info('🔧 [PipelineAdapter] Initializing pipeline system');

    // Initialize pipeline registry
    pipelineRegistry.initialize();

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
      const { actionLoader } = await import('../controllers/actions/action-loader');
      const action = actionLoader.getAllActions().find(a => a.id === actionId);
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
      logger.error(`❌ [PipelineAdapter] Failed to execute ${actionId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
    kingdom: KingdomData
  ): Promise<CheckMetadata> {
    if (PIPELINE_FEATURE_FLAGS.DEBUG) {
      logger.info(`🎯 [PipelineAdapter] Executing pre-roll interactions for ${actionId}`);
    }

    return await unifiedCheckHandler.executePreRollInteractions(actionId, kingdom);
  }

  /**
   * Execute post-roll interactions
   */
  static async executePostRollInteractions(
    instanceId: string,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
  ): Promise<ResolutionData> {
    if (PIPELINE_FEATURE_FLAGS.DEBUG) {
      logger.info(`🎯 [PipelineAdapter] Executing post-roll interactions for instance ${instanceId}`);
    }

    return await unifiedCheckHandler.executePostRollInteractions(instanceId, outcome);
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

    const { actionLoader } = await import('../controllers/actions/action-loader');
    const action = actionLoader.getAllActions().find(a => a.id === actionId);
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
