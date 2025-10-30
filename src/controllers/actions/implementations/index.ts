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
import ExecuteOrPardonPrisonersAction from '../../../actions/execute-or-pardon-prisoners/ExecuteOrPardonPrisonersAction';
import TrainArmyAction from '../../../actions/train-army/TrainArmyAction';

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
    execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult>;
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
actionImplementations.set(RepairStructureAction.id, RepairStructureAction);
actionImplementations.set(EstablishSettlementAction.id, EstablishSettlementAction);
actionImplementations.set(UpgradeSettlementAction.id, UpgradeSettlementAction);
actionImplementations.set(BuildStructureAction.id, BuildStructureAction);
actionImplementations.set(EstablishDiplomaticRelationsAction.id, EstablishDiplomaticRelationsAction);
actionImplementations.set(BuildRoadsAction.id, BuildRoadsAction);
actionImplementations.set(ClaimHexesAction.id, ClaimHexesAction);
actionImplementations.set(FortifyHexAction.id, FortifyHexAction);
actionImplementations.set(SendScoutsAction.id, SendScoutsAction);
actionImplementations.set(RecruitArmyAction.id, RecruitArmyAction);
actionImplementations.set(HarvestResourcesAction.id, HarvestResourcesAction);
actionImplementations.set(PurchaseResourcesAction.id, PurchaseResourcesAction);
actionImplementations.set(SellSurplusAction.id, SellSurplusAction);
actionImplementations.set(ExecuteOrPardonPrisonersAction.id, ExecuteOrPardonPrisonersAction);
actionImplementations.set(TrainArmyAction.id, TrainArmyAction);

// TODO: Add more action implementations as they're created
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
export { ArrestDissidentsAction, RepairStructureAction, EstablishSettlementAction, UpgradeSettlementAction, BuildStructureAction, EstablishDiplomaticRelationsAction, BuildRoadsAction, ClaimHexesAction, FortifyHexAction, SendScoutsAction, RecruitArmyAction, HarvestResourcesAction, PurchaseResourcesAction, SellSurplusAction, ExecuteOrPardonPrisonersAction, TrainArmyAction };

// TODO: Export additional implementations as they're created
// export { RecruitArmyAction };
// etc.
