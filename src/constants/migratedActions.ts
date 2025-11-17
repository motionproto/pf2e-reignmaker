/**
 * Action Migration Status Tracking
 * 
 * Tracks which actions have been tested with the PipelineCoordinator.
 * Updates badge display in Actions tab UI.
 */

export type ActionStatus = 'untested' | 'testing' | 'tested' | 'verified';

/**
 * Action status tracking
 * Key: action ID
 * Value: current status
 */
export const ACTION_STATUS = new Map<string, ActionStatus>([
  // Basic Kingdom Operations (#1-9)
  ['claim-hexes', 'untested'],
  ['deal-with-unrest', 'untested'],
  ['sell-surplus', 'untested'],
  ['purchase-resources', 'untested'],
  ['harvest-resources', 'untested'],
  ['build-roads', 'untested'],
  ['fortify-hex', 'untested'],
  ['create-worksite', 'untested'],
  ['send-scouts', 'untested'],
  
  // Entity Selection Actions (#10-16)
  ['collect-stipend', 'untested'],
  ['execute-or-pardon-prisoners', 'untested'],
  ['establish-diplomatic-relations', 'untested'],
  ['request-economic-aid', 'untested'],
  ['request-military-aid', 'untested'],
  ['train-army', 'untested'],
  ['disband-army', 'untested'],
  
  // Foundry Integration Actions (#17-21)
  ['recruit-unit', 'untested'],
  ['deploy-army', 'untested'],
  ['build-structure', 'untested'],
  ['repair-structure', 'untested'],
  ['upgrade-settlement', 'untested'],
  
  // Complex Custom Logic (#22-26)
  ['arrest-dissidents', 'untested'],
  ['outfit-army', 'untested'],
  ['infiltration', 'untested'],
  ['establish-settlement', 'untested'],
  ['recover-army', 'untested'],
]);

/**
 * Action numbers (for display in badges)
 * Maps action ID to migration order number
 */
export const ACTION_NUMBERS = new Map<string, number>([
  // Basic Kingdom Operations (#1-9)
  ['claim-hexes', 1],
  ['deal-with-unrest', 2],
  ['sell-surplus', 3],
  ['purchase-resources', 4],
  ['harvest-resources', 5],
  ['build-roads', 6],
  ['fortify-hex', 7],
  ['create-worksite', 8],
  ['send-scouts', 9],
  
  // Entity Selection Actions (#10-16)
  ['collect-stipend', 10],
  ['execute-or-pardon-prisoners', 11],
  ['establish-diplomatic-relations', 12],
  ['request-economic-aid', 13],
  ['request-military-aid', 14],
  ['train-army', 15],
  ['disband-army', 16],
  
  // Foundry Integration Actions (#17-21)
  ['recruit-unit', 17],
  ['deploy-army', 18],
  ['build-structure', 19],
  ['repair-structure', 20],
  ['upgrade-settlement', 21],
  
  // Complex Custom Logic (#22-26)
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
  verified: number;
  total: number;
  percentComplete: number;
} {
  const stats = {
    untested: 0,
    testing: 0,
    tested: 0,
    verified: 0,
    total: ACTION_STATUS.size,
    percentComplete: 0
  };
  
  for (const status of ACTION_STATUS.values()) {
    stats[status]++;
  }
  
  stats.percentComplete = Math.round(
    ((stats.tested + stats.verified) / stats.total) * 100
  );
  
  return stats;
}
