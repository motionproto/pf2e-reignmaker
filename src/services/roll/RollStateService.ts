/**
 * RollStateService - Manages roll modifier state for rerolls
 *
 * Thin wrapper around PipelineStateService for backward compatibility.
 * All storage is now unified in turnState.activePipelines[instanceId].
 *
 * Data Flow:
 * - Initial Roll: wrappedCallback → storeRollModifiers(instanceId, turn, modifiers)
 * - Reroll: PF2eSkillService → getRollModifiers(instanceId, currentTurn) → apply modifiers
 */

import { pipelineStateService } from '../pipeline/PipelineStateService';
import type { RollModifier } from '../../types/RollModifier';

/**
 * Service for managing roll state for rerolls
 * Delegates to PipelineStateService for unified storage
 */
export class RollStateService {
  private static instance: RollStateService;

  static getInstance(): RollStateService {
    if (!RollStateService.instance) {
      RollStateService.instance = new RollStateService();
    }
    return RollStateService.instance;
  }

  /**
   * Store modifiers from a roll for potential reroll
   * Called from PF2eSkillService.wrappedCallback on initial rolls (not rerolls)
   *
   * @param instanceId - Unique pipeline execution ID
   * @param turnNumber - Current turn number (for validation on retrieval)
   * @param actionId - Action/event/incident ID
   * @param modifiers - Modifiers extracted from PF2e message
   */
  async storeRollModifiers(
    instanceId: string,
    turnNumber: number,
    actionId: string,
    modifiers: RollModifier[]
  ): Promise<void> {
    console.log(`💾 [RollStateService] Storing ${modifiers.length} modifiers for instance ${instanceId} (turn ${turnNumber})`);

    // Convert RollModifier to the format expected by PipelineStateService
    const storedModifiers = modifiers.map(m => ({
      label: m.label,
      modifier: m.value,
      type: m.type,
      enabled: m.enabled,
      ignored: m.ignored
    }));

    await pipelineStateService.storeRollModifiers(instanceId, storedModifiers);

    console.log(`✅ [RollStateService] Successfully stored modifiers for instance ${instanceId}`);
  }

  /**
   * Retrieve stored modifiers for a reroll
   * Validates that the stored data is from the current turn
   *
   * @param instanceId - Pipeline execution ID to retrieve modifiers for
   * @param currentTurn - Current turn number (for validation)
   * @returns Array of modifiers, or null if not found or stale
   */
  async getRollModifiers(
    instanceId: string,
    currentTurn: number
  ): Promise<RollModifier[] | null> {
    console.log(`🔍 [RollStateService] Retrieving modifiers for instance ${instanceId} (current turn: ${currentTurn})`);
    console.log(`🔍 [RollStateService] Available pipelines:`, pipelineStateService.getActivePipelineIds());

    const storedModifiers = pipelineStateService.getRollModifiers(instanceId);

    if (!storedModifiers) {
      return null;
    }

    // Validate turn number from pipeline state
    const pipelineState = pipelineStateService.getPipelineState(instanceId);
    if (pipelineState?.turnNumber !== undefined && pipelineState.turnNumber !== currentTurn) {
      console.warn(`⚠️ [RollStateService] Stored modifiers are from turn ${pipelineState.turnNumber}, current turn is ${currentTurn} - data may be stale`);
      // Still return the modifiers - let the caller decide what to do
    }

    // Convert back to RollModifier format
    const rollModifiers: RollModifier[] = storedModifiers.map(m => ({
      label: m.label,
      value: m.modifier,
      type: m.type as any,
      enabled: m.enabled ?? true,
      ignored: m.ignored ?? false
    }));

    console.log(`✅ [RollStateService] Found ${rollModifiers.length} modifiers for instance ${instanceId}`);
    console.log(`🔍 [RollStateService] Modifier details:`,
      rollModifiers.map(m => ({
        label: m.label,
        value: m.value,
        type: m.type,
        enabled: m.enabled,
        ignored: m.ignored
      }))
    );

    return rollModifiers;
  }

  /**
   * Clear stale roll state from previous turns
   * Called at turn boundaries (e.g., by StatusPhaseController)
   *
   * @param currentTurn - Current turn number
   */
  async clearStaleTurnData(currentTurn: number): Promise<void> {
    console.log(`🧹 [RollStateService] Clearing stale roll data (keeping only turn ${currentTurn})`);
    // PipelineStateService handles this via clearAllPipelines at turn boundary
    // Individual stale data is now handled at the turn level, not here
  }

  /**
   * Clear all roll state for the current turn
   * Called when turn is completed or reset
   */
  async clearAllRollState(): Promise<void> {
    console.log(`🧹 [RollStateService] Clearing all roll state`);
    await pipelineStateService.clearAllPipelines();
  }

  /**
   * Check if modifiers exist for a given instance
   * Useful for UI to show reroll availability
   */
  hasStoredModifiers(instanceId: string): boolean {
    return pipelineStateService.hasStoredModifiers(instanceId);
  }
}

// Singleton export
export const rollStateService = RollStateService.getInstance();
