/**
 * Action migration status tracking
 * 
 * IMPORTANT: Actions go through 3 stages:
 * 1. Pipeline exists (all 26 have pipelines) - untested
 * 2. Currently being tested - testing
 * 3. Tested with PipelineCoordinator (continuous pipeline) - tested
 * 
 * Update status to 'testing' when actively working on an action.
 * Update status to 'tested' after completing full testing workflow!
 * 
 * ⚠️ ALL ACTIONS RESET TO 'untested' after PipelineCoordinator refactor (2025-11-16)
 * Previous event-based system removed, all actions need retesting with continuous pipeline.
 */

export type ActionStatus = 'untested' | 'testing' | 'tested';

/**
 * Master status map for all 26 actions
 * Update this as actions are tested with PipelineCoordinator
 * 
 * Order matches ACTION_NUMBERS (migration order 1-26)
 */
export const ACTION_STATUS = new Map<string, ActionStatus>([
  ['claim-hexes', 'tested'],              // #1
  ['deal-with-unrest', 'tested'],         // #2
  ['sell-surplus', 'untested'],                   // #3
  ['purchase-resources', 'untested'],             // #4
  ['harvest-resources', 'untested'],              // #5
  ['build-roads', 'untested'],                    // #6
  ['fortify-hex', 'untested'],                    // #7
  ['create-worksite', 'untested'],                // #8
  ['send-scouts', 'untested'],                    // #9
  ['collect-stipend', 'untested'],                // #10
  ['execute-or-pardon-prisoners', 'untested'],    // #11
  ['diplomatic-mission', 'untested'],             // #12
  ['request-economic-aid', 'untested'],           // #13
  ['request-military-aid', 'untested'],           // #14
  ['train-army', 'untested'],                     // #15
  ['disband-army', 'untested'],                   // #16
  ['recruit-unit', 'untested'],                   // #17
  ['deploy-army', 'untested'],                    // #18
  ['build-structure', 'untested'],                // #19
  ['repair-structure', 'untested'],               // #20
  ['upgrade-settlement', 'untested'],             // #21
  ['arrest-dissidents', 'untested'],              // #22
  ['outfit-army', 'untested'],                    // #23
  ['infiltration', 'untested'],                   // #24
  ['establish-settlement', 'untested'],           // #25
  ['recover-army', 'untested']                    // #26
]);

/**
 * Action number mapping (1-26 in migration order)
 * Used for UI badges: "#1", "#2", etc.
 */
export const ACTION_NUMBERS = new Map<string, number>([
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
  ['diplomatic-mission', 12],
  ['request-economic-aid', 13],
  ['request-military-aid', 14],
  ['train-army', 15],
  ['disband-army', 16],
  ['recruit-unit', 17],
  ['deploy-army', 18],
  ['build-structure', 19],
  ['repair-structure', 20],
  ['upgrade-settlement', 21],
  ['arrest-dissidents', 22],
  ['outfit-army', 23],
  ['infiltration', 24],
  ['establish-settlement', 25],
  ['recover-army', 26]
]);

/**
 * Helper: Get actions by status
 * Example: getActionsByStatus('tested') returns all tested action IDs
 */
export function getActionsByStatus(status: ActionStatus): string[] {
  return Array.from(ACTION_STATUS.entries())
    .filter(([_, s]) => s === status)
    .map(([id]) => id);
}

/**
 * Helper: Get action status
 */
export function getActionStatus(actionId: string): ActionStatus | undefined {
  return ACTION_STATUS.get(actionId);
}

/**
 * Helper: Get action number
 */
export function getActionNumber(actionId: string): number | undefined {
  return ACTION_NUMBERS.get(actionId);
}

/**
 * Helper: Get completion statistics
 */
export function getCompletionStats(): {
  untested: number;
  testing: number;
  tested: number;
  total: number;
  percentComplete: number;
} {
  const untested = getActionsByStatus('untested').length;
  const testing = getActionsByStatus('testing').length;
  const tested = getActionsByStatus('tested').length;
  const total = ACTION_STATUS.size;
  const percentComplete = Math.round((tested / total) * 100);
  
  return { untested, testing, tested, total, percentComplete };
}

/**
 * BACKWARDS COMPATIBILITY EXPORTS
 * These maintain compatibility with existing code during migration
 */

/**
 * Set of action IDs that have been tested with PipelineCoordinator
 * Used by ActionsPhase.svelte to determine execution flow
 * 
 * ⚠️ Currently EMPTY - all actions reset to 'untested' after coordinator refactor
 * Actions will be added back as they are tested
 */
export const MIGRATED_ACTIONS = new Set<string>(
  getActionsByStatus('tested')
);

/**
 * @deprecated Use ACTION_NUMBERS instead
 * Kept for backwards compatibility
 */
export const MIGRATED_ACTION_NUMBERS = ACTION_NUMBERS;
