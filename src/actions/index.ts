/**
 * Kingdom Actions - Centralized Export
 * 
 * All custom action implementations are exported from here.
 * Import actions directly from this file rather than navigating to specific folders.
 */

// Re-export from individual action folders
export { default as ArrestDissidentsAction } from './arrest-dissidents/ArrestDissidentsAction';
export { default as EstablishSettlementAction } from './establish-settlement/EstablishSettlementAction';
export { default as RepairStructureAction } from './repair-structure/RepairStructureAction';
export { default as RecruitArmyAction } from './recruit-unit/RecruitUnitAction';
export { default as UpgradeSettlementAction } from './upgrade-settlement/UpgradeSettlementAction';

// Re-export shared helpers
export * from './shared/ActionHelpers';

// Export types if needed
export type { CustomActionImplementation } from '../controllers/actions/implementations';
export type { ResolveResult } from './shared/ActionHelpers';
