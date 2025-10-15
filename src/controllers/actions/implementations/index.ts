/**
 * Action Implementations Registry
 * 
 * Central registry for custom action implementations.
 * Actions with complex logic or custom resolution are registered here.
 */

import type { KingdomData } from '../../../actors/KingdomActor';
import type { ActionRequirement } from '../action-resolver';
import type { ResolutionData } from '../../../types/modifiers';
import type { ResolveResult } from './ActionHelpers';
import type { SvelteComponent } from 'svelte';

import ArrestDissidentsAction from './ArrestDissidentsAction';

/**
 * Interface for custom action implementations
 */
export interface CustomActionImplementation {
  id: string;
  
  // Check if action requirements are met
  checkRequirements?(kingdomData: KingdomData): ActionRequirement;
  
  // Custom resolution for specific outcomes
  customResolution?: {
    component: any; // Svelte component constructor (use any to allow specific component types)
    validateData(resolutionData: ResolutionData): boolean;
    execute(resolutionData: ResolutionData): Promise<ResolveResult>;
  };
  
  // Determine if a specific outcome needs custom resolution
  needsCustomResolution?(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean;
}

/**
 * Registry of all custom action implementations
 */
const actionImplementations = new Map<string, CustomActionImplementation>();

// Register action implementations
actionImplementations.set(ArrestDissidentsAction.id, ArrestDissidentsAction);

// TODO: Add more action implementations as they're created
// actionImplementations.set(BuildStructureAction.id, BuildStructureAction);
// actionImplementations.set(ExecuteOrPardonPrisonersAction.id, ExecuteOrPardonPrisonersAction);
// actionImplementations.set(RecruitArmyAction.id, RecruitArmyAction);
// etc.

/**
 * Get custom implementation for an action
 * @param actionId - The action ID to look up
 * @returns The custom implementation if it exists, undefined otherwise
 */
export function getActionImplementation(actionId: string): CustomActionImplementation | undefined {
  return actionImplementations.get(actionId);
}

/**
 * Check if an action has a custom implementation
 * @param actionId - The action ID to check
 * @returns True if the action has a custom implementation
 */
export function hasCustomImplementation(actionId: string): boolean {
  return actionImplementations.has(actionId);
}

/**
 * Get custom resolution component for an action outcome
 * @param actionId - The action ID
 * @param outcome - The outcome degree
 * @returns The Svelte component if custom resolution is needed, null otherwise
 */
export function getCustomResolutionComponent(
  actionId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
): any | null {
  const impl = actionImplementations.get(actionId);
  
  if (!impl || !impl.customResolution) {
    return null;
  }
  
  // Check if this outcome needs custom resolution
  if (impl.needsCustomResolution && !impl.needsCustomResolution(outcome)) {
    return null;
  }
  
  return impl.customResolution.component;
}

/**
 * Check requirements for an action using custom implementation
 * Falls back to default requirement checking if no custom implementation exists
 * @param actionId - The action ID
 * @param kingdomData - The kingdom data
 * @returns ActionRequirement result, or null if no custom implementation
 */
export function checkCustomRequirements(
  actionId: string,
  kingdomData: KingdomData
): ActionRequirement | null {
  const impl = actionImplementations.get(actionId);
  
  if (!impl || !impl.checkRequirements) {
    return null;
  }
  
  return impl.checkRequirements(kingdomData);
}

/**
 * Execute custom resolution for an action
 * @param actionId - The action ID
 * @param resolutionData - The resolution data from the UI
 * @returns ResolveResult, or error if action doesn't have custom resolution
 */
export async function executeCustomResolution(
  actionId: string,
  resolutionData: ResolutionData
): Promise<ResolveResult> {
  const impl = actionImplementations.get(actionId);
  
  if (!impl || !impl.customResolution) {
    return {
      success: false,
      error: `Action ${actionId} does not have custom resolution`
    };
  }
  
  // Validate resolution data
  if (!impl.customResolution.validateData(resolutionData)) {
    return {
      success: false,
      error: 'Invalid resolution data provided'
    };
  }
  
  // Execute custom resolution
  return await impl.customResolution.execute(resolutionData);
}

// Export all implementations for direct use if needed
export { ArrestDissidentsAction };

// TODO: Export additional implementations as they're created
// export { BuildStructureAction };
// export { ExecuteOrPardonPrisonersAction };
// export { RecruitArmyAction };
// etc.
