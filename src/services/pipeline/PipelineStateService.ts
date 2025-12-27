/**
 * PipelineStateService - Unified state management for all pipeline executions
 *
 * Single source of truth for:
 * - Roll modifiers (previously in actionsPhase.actionInstances)
 * - Pipeline context (previously in activePipelineContexts)
 * - Pipeline status tracking
 *
 * Data stored in turnState.activePipelines[instanceId]
 */

import { get } from 'svelte/store';
import { kingdomData, getKingdomActor } from '../../stores/KingdomStore';
import type { PipelineState, PipelineStatus } from '../../models/TurnState';
import type { SerializablePipelineContext } from '../../types/PipelineContext';
import type { TurnPhase } from '../../actors/KingdomActor';

/**
 * Roll modifier structure for storage
 */
export interface RollModifier {
  label: string;
  modifier: number;
  type?: string;
  enabled?: boolean;
  ignored?: boolean;
}

/**
 * Service for managing unified pipeline state
 */
export class PipelineStateService {
  private static instance: PipelineStateService;

  static getInstance(): PipelineStateService {
    if (!PipelineStateService.instance) {
      PipelineStateService.instance = new PipelineStateService();
    }
    return PipelineStateService.instance;
  }

  /**
   * Create or update pipeline state
   */
  async upsertPipelineState(state: Partial<PipelineState> & { instanceId: string }): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) {
      console.error('❌ [PipelineStateService] No kingdom actor found');
      return;
    }

    await actor.updateKingdomData((kingdom: any) => {
      if (!kingdom.turnState) return;
      if (!kingdom.turnState.activePipelines) {
        kingdom.turnState.activePipelines = {};
      }

      const existing = kingdom.turnState.activePipelines[state.instanceId];
      kingdom.turnState.activePipelines[state.instanceId] = {
        ...existing,
        ...state,
        timestamp: Date.now()
      };
    });

    console.log(`💾 [PipelineStateService] Upserted pipeline state for ${state.instanceId}`);
  }

  /**
   * Get pipeline state by instanceId
   */
  getPipelineState(instanceId: string): PipelineState | null {
    const currentKingdom = get(kingdomData);
    return currentKingdom.turnState?.activePipelines?.[instanceId] || null;
  }

  /**
   * Store roll modifiers for a pipeline
   */
  async storeRollModifiers(
    instanceId: string,
    modifiers: RollModifier[]
  ): Promise<void> {
    console.log(`💾 [PipelineStateService] Storing ${modifiers.length} modifiers for ${instanceId}`);

    await this.upsertPipelineState({
      instanceId,
      rollModifiers: modifiers
    });
  }

  /**
   * Get roll modifiers for a pipeline
   */
  getRollModifiers(instanceId: string): RollModifier[] | null {
    const state = this.getPipelineState(instanceId);

    if (!state) {
      console.error(`❌ [PipelineStateService] No pipeline state found for ${instanceId}`);
      return null;
    }

    if (!state.rollModifiers || state.rollModifiers.length === 0) {
      console.warn(`⚠️ [PipelineStateService] Pipeline ${instanceId} exists but has no modifiers`);
      return null;
    }

    console.log(`✅ [PipelineStateService] Found ${state.rollModifiers.length} modifiers for ${instanceId}`);
    return state.rollModifiers;
  }

  /**
   * Store context for recovery
   */
  async storeContext(
    instanceId: string,
    context: SerializablePipelineContext
  ): Promise<void> {
    await this.upsertPipelineState({
      instanceId,
      context
    });
  }

  /**
   * Get context for recovery
   */
  getContext(instanceId: string): SerializablePipelineContext | null {
    const state = this.getPipelineState(instanceId);
    return state?.context || null;
  }

  /**
   * Update pipeline status
   */
  async updateStatus(
    instanceId: string,
    status: PipelineStatus
  ): Promise<void> {
    await this.upsertPipelineState({
      instanceId,
      status
    });
  }

  /**
   * Initialize a new pipeline with full state
   */
  async initializePipeline(
    instanceId: string,
    actionId: string,
    checkType: 'action' | 'event' | 'incident',
    turnNumber: number,
    phase: TurnPhase
  ): Promise<void> {
    await this.upsertPipelineState({
      instanceId,
      actionId,
      checkType,
      turnNumber,
      phase,
      status: 'pending'
    });
  }

  /**
   * Clear a single pipeline state
   */
  async clearPipelineState(instanceId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    await actor.updateKingdomData((kingdom: any) => {
      if (kingdom.turnState?.activePipelines?.[instanceId]) {
        delete kingdom.turnState.activePipelines[instanceId];
      }
    });

    console.log(`🗑️ [PipelineStateService] Cleared pipeline state for ${instanceId}`);
  }

  /**
   * Clear all pipelines (called at turn boundary)
   */
  async clearAllPipelines(): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    await actor.updateKingdomData((kingdom: any) => {
      if (kingdom.turnState) {
        kingdom.turnState.activePipelines = {};
      }
    });

    console.log(`🧹 [PipelineStateService] Cleared all pipeline state`);
  }

  /**
   * Check if modifiers exist for a given instance
   */
  hasStoredModifiers(instanceId: string): boolean {
    const state = this.getPipelineState(instanceId);
    return !!(state?.rollModifiers && state.rollModifiers.length > 0);
  }

  /**
   * Get all active pipeline IDs
   */
  getActivePipelineIds(): string[] {
    const currentKingdom = get(kingdomData);
    return Object.keys(currentKingdom.turnState?.activePipelines || {});
  }

  /**
   * Debug: Log all active pipelines
   */
  debugLogActivePipelines(): void {
    const currentKingdom = get(kingdomData);
    const pipelines = currentKingdom.turnState?.activePipelines || {};
    console.log(`🔍 [PipelineStateService] Active pipelines:`, Object.keys(pipelines));
    for (const [id, state] of Object.entries(pipelines)) {
      console.log(`  - ${id}: status=${(state as PipelineState).status}, modifiers=${(state as PipelineState).rollModifiers?.length || 0}`);
    }
  }
}

// Singleton export
export const pipelineStateService = PipelineStateService.getInstance();
