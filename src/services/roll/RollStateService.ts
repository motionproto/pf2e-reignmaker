/**
 * RollStateService - Manages roll modifier state for rerolls
 * 
 * Single Responsibility: Store and retrieve roll modifiers for reroll support.
 * Includes turn-aware validation to prevent stale data from previous turns.
 * 
 * Data Flow:
 * - Initial Roll: wrappedCallback → storeRollModifiers(instanceId, turn, modifiers)
 * - Reroll: PF2eSkillService → getRollModifiers(instanceId, currentTurn) → apply modifiers
 * 
 * Storage Location: kingdom.turnState.actionsPhase.actionInstances[instanceId]
 */

import { get } from 'svelte/store';
import { kingdomData, getKingdomActor } from '../../stores/KingdomStore';
import type { RollModifier } from '../../types/RollModifier';

/**
 * Stored roll state for a specific pipeline execution
 */
export interface StoredRollState {
  instanceId: string;
  actionId: string;
  turnNumber: number;
  rollModifiers: RollModifier[];
  timestamp: number;
}

/**
 * Service for managing roll state for rerolls
 * Extracts reroll state management from PF2eSkillService for clear separation of concerns
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
    const actor = getKingdomActor();
    if (!actor) {
      console.error('❌ [RollStateService] No kingdom actor found - cannot store modifiers!');
      return;
    }

    console.log(`💾 [RollStateService] Storing ${modifiers.length} modifiers for instance ${instanceId} (turn ${turnNumber})`);

    await actor.updateKingdomData((kingdom: any) => {
      // Initialize actionInstances if needed
      if (!kingdom.turnState) kingdom.turnState = {};
      if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { activeAids: [] };
      if (!kingdom.turnState.actionsPhase.actionInstances) {
        kingdom.turnState.actionsPhase.actionInstances = {};
      }

      // Store by instanceId (unique per execution) for complete isolation
      kingdom.turnState.actionsPhase.actionInstances[instanceId] = {
        instanceId,
        actionId,
        turnNumber,
        rollModifiers: modifiers,
        timestamp: Date.now()
      } as StoredRollState;
    });

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
    const currentKingdomState = get(kingdomData);
    
    console.log(`🔍 [RollStateService] Retrieving modifiers for instance ${instanceId} (current turn: ${currentTurn})`);
    console.log(`🔍 [RollStateService] Available instances:`, 
      Object.keys(currentKingdomState.turnState?.actionsPhase?.actionInstances || {})
    );

    const storedState = currentKingdomState.turnState?.actionsPhase?.actionInstances?.[instanceId] as StoredRollState | undefined;

    if (!storedState) {
      console.error(`❌ [RollStateService] No stored state found for instance ${instanceId}`);
      return null;
    }

    // Validate turn number (optional - allows cross-turn rerolls if turnNumber not stored)
    if (storedState.turnNumber !== undefined && storedState.turnNumber !== currentTurn) {
      console.warn(`⚠️ [RollStateService] Stored modifiers are from turn ${storedState.turnNumber}, current turn is ${currentTurn} - data may be stale`);
      // Still return the modifiers - let the caller decide what to do
      // This allows for edge cases where turn boundary hasn't been processed yet
    }

    if (!storedState.rollModifiers || storedState.rollModifiers.length === 0) {
      console.warn(`⚠️ [RollStateService] Instance ${instanceId} exists but has no modifiers`);
      return null;
    }

    console.log(`✅ [RollStateService] Found ${storedState.rollModifiers.length} modifiers for instance ${instanceId}`);
    console.log(`🔍 [RollStateService] Modifier details:`,
      storedState.rollModifiers.map(m => ({
        label: m.label,
        value: m.value,
        type: m.type,
        enabled: m.enabled,
        ignored: m.ignored
      }))
    );

    return storedState.rollModifiers;
  }

  /**
   * Clear stale roll state from previous turns
   * Called at turn boundaries (e.g., by StatusPhaseController)
   * 
   * @param currentTurn - Current turn number
   */
  async clearStaleTurnData(currentTurn: number): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    console.log(`🧹 [RollStateService] Clearing stale roll data (keeping only turn ${currentTurn})`);

    await actor.updateKingdomData((kingdom: any) => {
      const actionInstances = kingdom.turnState?.actionsPhase?.actionInstances;
      if (!actionInstances) return;

      const instanceIds = Object.keys(actionInstances);
      let clearedCount = 0;

      for (const instanceId of instanceIds) {
        const instance = actionInstances[instanceId] as StoredRollState;
        // Clear if from a previous turn (or if turnNumber not set, assume stale)
        if (instance.turnNumber === undefined || instance.turnNumber < currentTurn) {
          delete actionInstances[instanceId];
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        console.log(`🧹 [RollStateService] Cleared ${clearedCount} stale roll state entries`);
      }
    });
  }

  /**
   * Clear all roll state for the current turn
   * Called when turn is completed or reset
   */
  async clearAllRollState(): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    console.log(`🧹 [RollStateService] Clearing all roll state`);

    await actor.updateKingdomData((kingdom: any) => {
      if (kingdom.turnState?.actionsPhase?.actionInstances) {
        kingdom.turnState.actionsPhase.actionInstances = {};
      }
    });
  }

  /**
   * Check if modifiers exist for a given instance
   * Useful for UI to show reroll availability
   */
  hasStoredModifiers(instanceId: string): boolean {
    const currentKingdomState = get(kingdomData);
    const storedState = currentKingdomState.turnState?.actionsPhase?.actionInstances?.[instanceId];
    return !!(storedState?.rollModifiers && storedState.rollModifiers.length > 0);
  }
}

// Singleton export
export const rollStateService = RollStateService.getInstance();













