/**
 * Action Migration Status Tracking
 * 
 * Tracks which actions have been tested with the PipelineCoordinator.
 * Updates badge display in Actions tab UI.
 */

export type ActionStatus = 'untested' | 'testing' | 'tested';

/**
 * Action status tracking
 * Key: action ID
 * Value: current status
 */
export const ACTION_STATUS = new Map<string, ActionStatus>([
  // Phase 1: No Interactions
  ['deal-with-unrest', 'tested'],  // #1
  
  // Phase 2: Post-Apply Map Interactions
  ['claim-hexes', 'untested'],  // #2
  ['build-roads', 'untested'],  // #3
  ['fortify-hex', 'untested'],  // #4
  ['create-worksite', 'untested'],  // #5
  ['harvest-resources', 'untested'],  // #6
  ['send-scouts', 'untested'],  // #7
  
  // Phase 3: Custom Components (graceful degradation)
  ['sell-surplus', 'untested'],  // #8
  ['purchase-resources', 'untested'],  // #9
  
  // Phase 4: Pre-Roll Entity Selection
  ['collect-stipend', 'untested'],  // #10
  ['execute-or-pardon-prisoners', 'untested'],  // #11
  ['establish-diplomatic-relations', 'untested'],  // #12
  ['request-economic-aid', 'untested'],  // #13
  ['request-military-aid', 'untested'],  // #14
  ['train-army', 'untested'],  // #15
  ['disband-army', 'untested'],  // #16
  
  // Phase 5: Foundry Integration (gameCommands)
  ['recruit-unit', 'untested'],  // #17
  ['deploy-army', 'untested'],  // #18
  ['build-structure', 'untested'],  // #19
  ['repair-structure', 'untested'],  // #20
  ['upgrade-settlement', 'untested'],  // #21
  
  // Phase 6: Complex Custom Logic
  ['arrest-dissidents', 'untested'],  // #22
  ['outfit-army', 'untested'],  // #23
  ['infiltration', 'untested'],  // #24
  ['establish-settlement', 'untested'],  // #25
  ['recover-army', 'untested'],  // #26
]);

/**
 * Action numbers (for display in badges)
 * Maps action ID to testing order number (simplest → most complex)
 */
export const ACTION_NUMBERS = new Map<string, number>([
  // Phase 1: No Interactions (#1)
  ['deal-with-unrest', 1],
  
  // Phase 2: Post-Apply Map Interactions (#2-7)
  ['claim-hexes', 2],
  ['build-roads', 3],
  ['fortify-hex', 4],
  ['create-worksite', 5],
  ['harvest-resources', 6],
  ['send-scouts', 7],
  
  // Phase 3: Custom Components (graceful degradation) (#8-9)
  ['sell-surplus', 8],
  ['purchase-resources', 9],
  
  // Phase 4: Pre-Roll Entity Selection (#10-16)
  ['collect-stipend', 10],
  ['execute-or-pardon-prisoners', 11],
  ['establish-diplomatic-relations', 12],
  ['request-economic-aid', 13],
  ['request-military-aid', 14],
  ['train-army', 15],
  ['disband-army', 16],
  
  // Phase 5: Foundry Integration (gameCommands) (#17-21)
  ['recruit-unit', 17],
  ['deploy-army', 18],
  ['build-structure', 19],
  ['repair-structure', 20],
  ['upgrade-settlement', 21],
  
  // Phase 6: Complex Custom Logic (#22-26)
  ['arrest-dissidents', 22],
  ['outfit-army', 23],
  ['infiltration', 24],
  ['establish-settlement', 25],
  ['recover-army', 26],
]);

/**
 * Get status for a specific action
 */
export function getActionStatus(actionId: string): ActionStatus {
  return ACTION_STATUS.get(actionId) || 'untested';
}

/**
 * Get number for a specific action
 */
export function getActionNumber(actionId: string): number | null {
  return ACTION_NUMBERS.get(actionId) || null;
}

/**
 * Update status for an action
 */
export function setActionStatus(actionId: string, status: ActionStatus): void {
  ACTION_STATUS.set(actionId, status);
}

/**
 * Get all actions by status
 */
export function getActionsByStatus(status: ActionStatus): string[] {
  return Array.from(ACTION_STATUS.entries())
    .filter(([_, s]) => s === status)
    .map(([id, _]) => id);
}

/**
 * Get completion statistics
 */
export function getCompletionStats(): {
  untested: number;
  testing: number;
  tested: number;
  total: number;
  percentComplete: number;
} {
  const stats = {
    untested: 0,
    testing: 0,
    tested: 0,
    total: ACTION_STATUS.size,
    percentComplete: 0
  };
  
  for (const status of ACTION_STATUS.values()) {
    stats[status]++;
  }
  
  stats.percentComplete = Math.round(
    (stats.tested / stats.total) * 100
  );
  
  return stats;
}
