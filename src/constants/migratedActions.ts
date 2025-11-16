/**
 * Centralized list of actions migrated to pipeline system
 * 
 * IMPORTANT: Keep this list in sync as actions are migrated
 * Used by:
 * - ActionsPhase.svelte (determines which flow to use)
 * - CheckInstanceHelpers.ts (determines if preview should be calculated)
 */
export const MIGRATED_ACTIONS = new Set([
  'claim-hexes',
  'deal-with-unrest',
  'sell-surplus',
  'purchase-resources',
  'harvest-resources',
  'build-roads',
  'fortify-hex',
  'create-worksite',
  'send-scouts',
  'collect-stipend',
  'execute-or-pardon-prisoners',
  'establish-diplomatic-relations',
  'request-economic-aid',
  'request-military-aid'
]);

/**
 * Action number mapping for migration badges
 */
export const MIGRATED_ACTION_NUMBERS = new Map([
  ['claim-hexes', 1],
  ['deal-with-unrest', 2],
  ['sell-surplus', 3],
  ['purchase-resources', 4],
  ['harvest-resources', 5],
  ['build-roads', 6],
  ['fortify-hex', 7],
  ['create-worksite', 8],
  ['send-scouts', 9],
  ['collect-stipend', 10],
  ['execute-or-pardon-prisoners', 11],
  ['establish-diplomatic-relations', 12],
  ['request-economic-aid', 13],
  ['request-military-aid', 14]
]);
