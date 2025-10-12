/**
 * ResolutionStateHelpers - Unified utilities for syncing CheckCard state across clients
 * 
 * Uses a single activeResolutions map in TurnState, keyed by checkId.
 * Works for all check types: events, incidents, actions.
 * 
 * Architecture: Component-level
 * - CheckCard receives checkId prop
 * - Reads state from turnState.activeResolutions[checkId]
 * - Updates via these helpers
 * - Emits final ResolutionData when ready
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import type { ResolutionState } from '../../models/Modifiers';

/**
 * Update resolution state for any check (unified)
 * 
 * @param checkId - Unique identifier for this check
 *   - Events: instanceId (e.g., "demand-structure-1760294412980")
 *   - Incidents: "incident-{id}" (e.g., "incident-monster-attack")
 *   - Actions: "action-{actionId}-{playerId}"
 * @param state - Partial state to merge
 */
export async function updateCheckResolutionState(
  checkId: string,
  state: Partial<ResolutionState>
): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) {
    console.error('❌ [ResolutionStateHelpers] No kingdom actor available');
    return;
  }

  await actor.updateKingdom((kingdom) => {
    if (!kingdom.turnState) return;
    if (!kingdom.turnState.activeResolutions) {
      kingdom.turnState.activeResolutions = {};
    }

    const existing = kingdom.turnState.activeResolutions[checkId] || {
      selectedChoice: null,
      resolvedDice: {},
      selectedResources: {}
    };

    // Merge with existing state
    kingdom.turnState.activeResolutions[checkId] = {
      selectedChoice: state.selectedChoice ?? existing.selectedChoice,
      resolvedDice: {
        ...existing.resolvedDice,
        ...state.resolvedDice
      },
      selectedResources: {
        ...existing.selectedResources,
        ...state.selectedResources
      }
    };

    console.log(`✅ [ResolutionStateHelpers] Updated resolution state for: ${checkId}`, kingdom.turnState.activeResolutions[checkId]);
  });
}

/**
 * Get resolution state for any check (unified)
 */
export function getCheckResolutionState(
  checkId: string,
  turnState: any
): ResolutionState {
  return turnState?.activeResolutions?.[checkId] || {
    selectedChoice: null,
    resolvedDice: {},
    selectedResources: {}
  };
}

/**
 * Clear resolution state for any check (unified)
 */
export async function clearCheckResolutionState(checkId: string): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdom((kingdom) => {
    if (kingdom.turnState?.activeResolutions?.[checkId]) {
      delete kingdom.turnState.activeResolutions[checkId];
      console.log(`🚫 [ResolutionStateHelpers] Cleared resolution state for: ${checkId}`);
    }
  });
}

/**
 * Clear all resolution states (useful at turn boundaries)
 */
export async function clearAllResolutionStates(): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdom((kingdom) => {
    if (kingdom.turnState) {
      kingdom.turnState.activeResolutions = {};
      console.log(`🚫 [ResolutionStateHelpers] Cleared all resolution states`);
    }
  });
}
