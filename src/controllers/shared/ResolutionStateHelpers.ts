/**
 * ResolutionStateHelpers - Unified utilities for syncing CheckCard state across clients
 * 
 * NEW ARCHITECTURE: Resolution state stored in ActiveCheckInstance.resolutionState
 * OLD ARCHITECTURE: Resolution state stored in turnState.activeResolutions (deprecated)
 * 
 * Architecture: Instance-level
 * - CheckCard receives instance prop
 * - Reads state from instance.resolutionState
 * - Updates via these helpers
 * - Emits final ResolutionData when ready
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import type { ResolutionState } from '../../models/Modifiers';
import type { ActiveCheckInstance } from '../../models/CheckInstance';
import { logger } from '../../utils/Logger';

// ============================================================================
// NEW INSTANCE-BASED API (PREFERRED)
// ============================================================================

/**
 * Get resolution state from instance (NEW)
 */
export function getInstanceResolutionState(instance: ActiveCheckInstance | null | undefined): ResolutionState {
  if (!instance) {
    return {
      selectedChoice: null,
      resolvedDice: {},
      selectedResources: {}
    };
  }
  
  return instance.resolutionState || {
    selectedChoice: null,
    resolvedDice: {},
    selectedResources: {}
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
    const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
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

    logger.debug(`✅ [ResolutionStateHelpers] Updated instance resolution state: ${instanceId}`, instance.resolutionState);
  });
}

/**
 * Clear resolution state from instance (NEW)
 */
export async function clearInstanceResolutionState(instanceId: string): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdomData((kingdom) => {
    const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
    if (instance) {
      instance.resolutionState = undefined;
      logger.debug(`🚫 [ResolutionStateHelpers] Cleared instance resolution state: ${instanceId}`);
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

    logger.debug(`✅ [ResolutionStateHelpers] Updated resolution state for: ${checkId}`, kingdom.turnState.activeResolutions[checkId]);
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
      logger.debug(`🚫 [ResolutionStateHelpers] Cleared resolution state for: ${checkId}`);
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
      logger.debug(`🚫 [ResolutionStateHelpers] Cleared all resolution states`);
    }
  });
}
