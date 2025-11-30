/**
 * ResolutionStateHelpers - Unified utilities for syncing CheckCard state across clients
 * 
 * NEW ARCHITECTURE: Resolution state stored in OutcomePreview.resolutionState
 * OLD ARCHITECTURE: Resolution state stored in turnState.activeResolutions (deprecated)
 * 
 * Architecture: Instance-level
 * - CheckCard receives instance prop (OutcomePreview)
 * - Reads state from instance.resolutionState
 * - Updates via these helpers
 * - Emits final ResolutionData when ready
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import type { ResolutionState } from '../../models/Modifiers';
import type { OutcomePreview } from '../../models/OutcomePreview';
import { logger } from '../../utils/Logger';

// ============================================================================
// NEW INSTANCE-BASED API (PREFERRED)
// ============================================================================

/**
 * Get resolution state from instance (NEW)
 * Returns a new object each time to ensure Svelte reactivity
 */
export function getInstanceResolutionState(instance: OutcomePreview | null | undefined): ResolutionState {
  if (!instance) {
    return {
      selectedChoice: null,
      resolvedDice: {},
      selectedResources: {}
    };
  }
  
  // Always return a new object to trigger Svelte reactivity
  const state = instance.resolutionState || {
    selectedChoice: null,
    resolvedDice: {},
    selectedResources: {}
  };
  
  return {
    selectedChoice: state.selectedChoice,
    resolvedDice: { ...state.resolvedDice },
    selectedResources: { ...state.selectedResources },
    customComponentData: state.customComponentData
  };
}

/**
 * Update resolution state in instance (NEW)
 * 
 * @param instanceId - Instance identifier
 * @param state - Partial state to merge
 */
export async function updateInstanceResolutionState(
  instanceId: string,
  state: Partial<ResolutionState>
): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) {
    logger.error('❌ [ResolutionStateHelpers] No kingdom actor available');
    return;
  }

  await actor.updateKingdomData((kingdom) => {
    // ✅ Use pendingOutcomes (new) instead of activeCheckInstances (legacy)
    const instance = kingdom.pendingOutcomes?.find(i => i.previewId === instanceId);
    if (!instance) {
      logger.warn(`⚠️ [ResolutionStateHelpers] Instance not found: ${instanceId}`);
      return;
    }

    const existing = instance.resolutionState || {
      selectedChoice: null,
      resolvedDice: {},
      selectedResources: {},
      customComponentData: undefined
    };

    // Merge with existing state
    instance.resolutionState = {
      selectedChoice: state.selectedChoice ?? existing.selectedChoice,
      resolvedDice: {
        ...existing.resolvedDice,
        ...state.resolvedDice
      },
      selectedResources: {
        ...existing.selectedResources,
        ...state.selectedResources
      },
      customComponentData: state.customComponentData ?? existing.customComponentData
    };

    console.log('✅ [ResolutionStateHelpers] Updated instance resolution state:', {
      instanceId,
      resolutionState: instance.resolutionState
    });
  });
}

/**
 * Clear resolution state from instance (NEW)
 */
export async function clearInstanceResolutionState(instanceId: string): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdomData((kingdom) => {
    // ✅ Use pendingOutcomes (new) instead of activeCheckInstances (legacy)
    const instance = kingdom.pendingOutcomes?.find(i => i.previewId === instanceId);
    if (instance) {
      instance.resolutionState = undefined;
    }
  });
}

// ============================================================================
// OLD TURNSTATE-BASED API (DEPRECATED - kept for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use updateInstanceResolutionState instead
 * Update resolution state for any check (unified)
 * 
 * @param checkId - Unique identifier for this check
 * @param state - Partial state to merge
 */
export async function updateCheckResolutionState(
  checkId: string,
  state: Partial<ResolutionState>
): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) {
    logger.error('❌ [ResolutionStateHelpers] No kingdom actor available');
    return;
  }

  await actor.updateKingdomData((kingdom) => {
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

  });
}

/**
 * @deprecated Use getInstanceResolutionState instead
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
 * @deprecated Use clearInstanceResolutionState instead
 * Clear resolution state for any check (unified)
 */
export async function clearCheckResolutionState(checkId: string): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdomData((kingdom) => {
    if (kingdom.turnState?.activeResolutions?.[checkId]) {
      delete kingdom.turnState.activeResolutions[checkId];

    }
  });
}

/**
 * @deprecated No longer needed with instance-based resolution state
 * Clear all resolution states (useful at turn boundaries)
 */
export async function clearAllResolutionStates(): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdomData((kingdom) => {
    if (kingdom.turnState) {
      kingdom.turnState.activeResolutions = {};

    }
  });
}
