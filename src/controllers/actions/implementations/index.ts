/**
 * Action Implementations Registry
 * 
 * Central registry for custom action implementations.
 * Actions with complex logic or custom resolution are registered here.
 */

import type { KingdomData } from '../../../actors/KingdomActor';
import type { ActionRequirement } from '../action-resolver';
import type { ResolutionData } from '../../../types/modifiers';
import type { ResolveResult } from '../../../actions/shared/ActionHelpers';
import type { SvelteComponent } from 'svelte';

import ArrestDissidentsAction from '../../../actions/arrest-dissidents/ArrestDissidentsAction';
import RepairStructureAction from '../../../actions/repair-structure/RepairStructureAction';
import EstablishSettlementAction from '../../../actions/establish-settlement/EstablishSettlementAction';
import UpgradeSettlementAction from '../../../actions/upgrade-settlement/UpgradeSettlementAction';
import BuildStructureAction from '../../../actions/build-structure/BuildStructureAction';
import EstablishDiplomaticRelationsAction from '../../../actions/establish-diplomatic-relations/EstablishDiplomaticRelationsAction';
import BuildRoadsAction from '../../../actions/build-roads/BuildRoadsAction';
import ClaimHexesAction from '../../../actions/claim-hexes/ClaimHexesAction';
import FortifyHexAction from '../../../actions/fortify-hex/FortifyHexAction';
import SendScoutsAction from '../../../actions/send-scouts/SendScoutsAction';
import RecruitArmyAction from '../../../actions/recruit-unit/RecruitUnitAction';
import HarvestResourcesAction from '../../../actions/harvest-resources/HarvestResourcesAction';
import PurchaseResourcesAction from '../../../actions/purchase-resources/PurchaseResourcesAction';
import SellSurplusAction from '../../../actions/sell-surplus/SellSurplusAction';
// REMOVED: ExecuteOrPardonPrisonersAction - migrated to pipeline system
// import ExecuteOrPardonPrisonersAction from '../../../actions/execute-or-pardon-prisoners/ExecuteOrPardonPrisonersAction';
// REMOVED: TrainArmyAction - migrated to prepare/commit pattern
// import TrainArmyAction from '../../../actions/train-army/TrainArmyAction';
// REMOVED: DisbandArmyAction - migrated to prepare/commit pattern
// import DisbandArmyAction from '../../../actions/disband-army/DisbandArmyAction';
import OutfitArmyAction from '../../../actions/outfit-army/OutfitArmyAction';
import DeployArmyAction from '../../../actions/deploy-army/DeployArmyAction';
import RequestMilitaryAidAction from '../../../actions/request-military-aid/RequestMilitaryAidAction';
import RequestEconomicAidAction from '../../../actions/request-economic-aid/RequestEconomicAidAction';
// REMOVED: InfiltrationAction - not yet implemented
// import InfiltrationAction from '../../../actions/infiltration/InfiltrationAction';

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

// Export all implementations for direct use if needed
export { ArrestDissidentsAction, RepairStructureAction, EstablishSettlementAction, UpgradeSettlementAction, BuildStructureAction, EstablishDiplomaticRelationsAction, BuildRoadsAction, ClaimHexesAction, FortifyHexAction, SendScoutsAction, RecruitArmyAction, HarvestResourcesAction, PurchaseResourcesAction, SellSurplusAction, OutfitArmyAction, DeployArmyAction, RequestMilitaryAidAction, RequestEconomicAidAction };

// TODO: Export additional implementations as they're created
// export { RecruitArmyAction };
// etc.
