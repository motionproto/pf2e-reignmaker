/**
 * Action Implementations Registry
 * 
 * Central registry for custom action implementations.
 * Actions with complex logic or custom resolution are registered here.
 */

import type { KingdomData } from '../../../actors/KingdomActor';
import type { ActionRequirement } from '../action-resolver';
import type { ResolutionData } from '../../../types/modifiers';
import type { SvelteComponent } from 'svelte';

/**
 * ⚠️ ALL ACTION IMPORTS REMOVED - MIGRATED TO ARCHIVED-IMPLEMENTATIONS
 * 
 * These imports were from src/actions/* which has been archived.
 * The action registry below is empty - all actions now use the pipeline system.
 * 
 * If you need to reference an old action implementation, it can be found in:
 * archived-implementations/actions/
 */

/**
 * Result type for action resolution
 * (Previously imported from archived actions/shared/ActionHelpers)
 */
export interface ResolveResult {
  success: boolean;
  error?: string;
}

/**
 * Interface for custom action implementations
 */
export interface CustomActionImplementation {
  id: string;
  
  // Check if action requirements are met
  checkRequirements?(kingdomData: KingdomData, instance?: any): ActionRequirement;
  
  // Pre-roll dialog configuration (for actions requiring selection before rolling)
  preRollDialog?: {
    dialogId: string;  // Maps to ActionsPhase dialog flag
    extractMetadata?: (dialogResult: any) => any;  // Extract metadata from dialog result
  };
  
  // Custom resolution for specific outcomes
  customResolution?: {
    component: any; // Svelte component constructor (use any to allow specific component types)
    getComponentProps?(outcome: string): Record<string, any>; // ✅ NEW: Get props for component
    validateData(resolutionData: ResolutionData): boolean;
    execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult>;
  };
  
  // Determine if a specific outcome needs custom resolution
  needsCustomResolution?(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure', instance?: any): boolean;
}

/**
 * Registry of all custom action implementations
 * 
 * ⚠️ ALL REGISTRATIONS REMOVED - MIGRATING TO PIPELINE SYSTEM
 * 
 * This registry is being phased out in favor of the unified pipeline system.
 * All actions will be migrated to pipelines over time. During the migration:
 * - Actions with pipelines: Full functionality via pipeline system
 * - Actions without pipelines: Basic functionality (modifiers only) + warning notification
 * 
 * The infrastructure remains for backward compatibility and reference.
 */
const actionImplementations = new Map<string, CustomActionImplementation>();

// ⚠️ ALL REGISTRATIONS COMMENTED OUT - CLEAN SLATE FOR PIPELINE MIGRATION
// 
// Previously registered actions (kept for reference):
// - ArrestDissidentsAction
// - RepairStructureAction
// - EstablishSettlementAction
// - UpgradeSettlementAction
// - BuildStructureAction
// - EstablishDiplomaticRelationsAction (MIGRATED to pipeline)
// - BuildRoadsAction (MIGRATED to pipeline)
// - ClaimHexesAction (MIGRATED to pipeline)
// - FortifyHexAction (MIGRATED to pipeline)
// - SendScoutsAction (MIGRATED to pipeline)
// - RecruitArmyAction
// - HarvestResourcesAction (MIGRATED to pipeline)
// - PurchaseResourcesAction (MIGRATED to pipeline)
// - SellSurplusAction (MIGRATED to pipeline)
// - ExecuteOrPardonPrisonersAction (MIGRATED to pipeline)
// - OutfitArmyAction
// - DeployArmyAction
// - RequestMilitaryAidAction
// - RequestEconomicAidAction
//
// To re-enable an action implementation (only if not migrating to pipeline):
// actionImplementations.set(ActionClass.id, ActionClass);

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
 * Get custom resolution component and props for an action outcome
 * @param actionId - The action ID
 * @param outcome - The outcome degree
 * @param instance - Optional instance data for context-aware decisions
 * @returns Object with component and props, or null if no custom resolution
 */
export function getCustomResolutionComponent(
  actionId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  instance?: any
): { component: any; props: Record<string, any> } | null {
  const impl = actionImplementations.get(actionId);
  
  if (!impl || !impl.customResolution) {
    return null;
  }
  
  // Check if this outcome needs custom resolution (pass instance for context-aware decisions)
  if (impl.needsCustomResolution && !impl.needsCustomResolution(outcome, instance)) {
    return null;
  }
  
  // Get component props if available
  const props = impl.customResolution.getComponentProps 
    ? impl.customResolution.getComponentProps(outcome)
    : {};
  
  return {
    component: impl.customResolution.component,
    props
  };
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
  kingdomData: KingdomData,
  instance?: any
): ActionRequirement | null {
  const impl = actionImplementations.get(actionId);
  
  if (!impl || !impl.checkRequirements) {
    return null;
  }
  
  return impl.checkRequirements(kingdomData, instance);
}

/**
 * Execute custom resolution for an action
 * @param actionId - The action ID
 * @param resolutionData - The resolution data from the UI
 * @param instance - The action instance with metadata (outcome, etc.)
 * @returns ResolveResult, or error if action doesn't have custom resolution
 */
export async function executeCustomResolution(
  actionId: string,
  resolutionData: ResolutionData,
  instance?: any
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
  
  // Execute custom resolution with instance metadata
  return await impl.customResolution.execute(resolutionData, instance);
}

/**
 * ⚠️ NO EXPORTS - All action implementations archived
 * 
 * Previously exported actions (now in archived-implementations/actions/):
 * - ArrestDissidentsAction, RepairStructureAction, EstablishSettlementAction
 * - UpgradeSettlementAction, BuildStructureAction, EstablishDiplomaticRelationsAction
 * - BuildRoadsAction, ClaimHexesAction, FortifyHexAction, SendScoutsAction
 * - RecruitArmyAction, HarvestResourcesAction, PurchaseResourcesAction, SellSurplusAction
 * - OutfitArmyAction, DeployArmyAction, RequestMilitaryAidAction, RequestEconomicAidAction
 * 
 * All actions now use the unified pipeline system (src/pipelines/).
 */
