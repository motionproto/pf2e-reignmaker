/**
 * ResolutionStateHelpers - Unified utilities for syncing CheckCard state across clients
 *
 * Resolution state is stored in pendingOutcomes[].resolutionState (instance-level)
 *
 * Architecture:
 * - CheckCard receives instance prop (OutcomePreview)
 * - Reads state from instance.resolutionState
 * - Updates via these helpers
 * - Emits final ResolutionData when ready
 */

import { getKingdomActor } from '../../stores/KingdomStore';
import type { ResolutionState } from '../../models/Modifiers';
import type { OutcomePreview } from '../../models/OutcomePreview';
import { logger } from '../../utils/Logger';

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
 * Clear resolution state from instance
 */
export async function clearInstanceResolutionState(instanceId: string): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;

  await actor.updateKingdomData((kingdom) => {
    const instance = kingdom.pendingOutcomes?.find(i => i.previewId === instanceId);
    if (instance) {
      instance.resolutionState = undefined;
    }
  });
}
