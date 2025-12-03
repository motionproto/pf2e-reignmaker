/**
 * Incident Testing Status Tracking
 * 
 * Tracks which incidents have been tested with the PipelineCoordinator.
 * Updates badge display in Incidents UI.
 * 
 * Pipeline Steps (9-Step Architecture):
 *   Step 1: Requirements Check (optional)
 *   Step 2: Pre-Roll Interactions (optional)
 *   Step 3: Execute Roll (always)
 *   Step 4: Display Outcome (always)
 *   Step 5: Outcome Interactions (optional)
 *   Step 6: Wait For Apply (always)
 *   Step 7: Post-Apply Interactions (optional)
 *   Step 8: Execute Action (always)
 *   Step 9: Cleanup (always)
 */

export type IncidentStatus = 'untested' | 'testing' | 'tested';

/**
 * Incident status tracking
 * Key: incident ID
 * Value: current status
 */
export const INCIDENT_STATUS = new Map<string, IncidentStatus>([
  // Minor Incidents (Tier 1) - #1-8
  ['bandit-raids', 'tested'],  // #1
  ['corruption-scandal', 'tested'],  // #2
  ['crime-wave', 'tested'],  // #3
  ['diplomatic-incident', 'tested'],  // #4
  ['emigration-threat', 'tested'],  // #5
  ['protests', 'tested'],  // #6
  ['rising-tensions', 'tested'],  // #7
  ['work-stoppage', 'tested'],  // #8
  
  // Moderate Incidents (Tier 2) - #9-18
  ['assassin-attack', 'tested'],  // #9 (has pre-roll entity selection)
  ['diplomatic-crisis', 'tested'],  // #10
  ['disease-outbreak', 'tested'],  // #11
  ['infrastructure-damage', 'tested'],  // #12 (has pre-roll entity selection)
  ['mass-exodus', 'tested'],  // #13
  ['production-strike', 'tested'],  // #14
  ['riot', 'tested'],  // #15 (has game commands)
  ['settlement-crisis', 'tested'],  // #16 (has pre-roll entity selection)
  ['tax-revolt', 'tested'],  // #17
  ['trade-embargo', 'tested'],  // #18
  
  // Major Incidents (Tier 3) - #19-29
  ['border-raid', 'tested'],  // #19
  ['economic-crash', 'tested'],  // #20 (has game commands)
  ['guerrilla-movement', 'tested'],  // #21
  ['international-crisis', 'tested'],  // #22
  ['international-scandal', 'tested'],  // #23
  ['mass-desertion-threat', 'tested'],  // #24 (has game commands)
  ['noble-conspiracy', 'tested'],  // #25
  ['prison-breaks', 'tested'],  // #26 (has game commands)
  ['religious-schism', 'tested'],  // #27 (has game commands)
  ['secession-crisis', 'tested'],  // #28
  ['settlement-collapse', 'testing'],  // #29 (has pre-roll entity selection)
  ['trade-war', 'untested'],  // #30
]);

/**
 * Incident numbers (for display in badges)
 * Maps incident ID to testing order number (by tier, then alphabetically)
 */
export const INCIDENT_NUMBERS = new Map<string, number>([
  // Minor Incidents (Tier 1) - #1-8
  ['bandit-raids', 1],
  ['corruption-scandal', 2],
  ['crime-wave', 3],
  ['diplomatic-incident', 4],
  ['emigration-threat', 5],
  ['protests', 6],
  ['rising-tensions', 7],
  ['work-stoppage', 8],
  
  // Moderate Incidents (Tier 2) - #9-18
  ['assassin-attack', 9],
  ['diplomatic-crisis', 10],
  ['disease-outbreak', 11],
  ['infrastructure-damage', 12],
  ['mass-exodus', 13],
  ['production-strike', 14],
  ['riot', 15],
  ['settlement-crisis', 16],
  ['tax-revolt', 17],
  ['trade-embargo', 18],
  
  // Major Incidents (Tier 3) - #19-29
  ['border-raid', 19],
  ['economic-crash', 20],
  ['guerrilla-movement', 21],
  ['international-crisis', 22],
  ['international-scandal', 23],
  ['mass-desertion-threat', 24],
  ['noble-conspiracy', 25],
  ['prison-breaks', 26],
  ['religious-schism', 27],
  ['secession-crisis', 28],
  ['settlement-collapse', 29],
  ['trade-war', 30],
]);

/**
 * Get status for a specific incident
 */
export function getIncidentStatus(incidentId: string): IncidentStatus {
  return INCIDENT_STATUS.get(incidentId) || 'untested';
}

/**
 * Get number for a specific incident
 */
export function getIncidentNumber(incidentId: string): number | null {
  return INCIDENT_NUMBERS.get(incidentId) || null;
}

/**
 * Update status for an incident
 */
export function setIncidentStatus(incidentId: string, status: IncidentStatus): void {
  INCIDENT_STATUS.set(incidentId, status);
}

/**
 * Get all incidents by status
 */
export function getIncidentsByStatus(status: IncidentStatus): string[] {
  return Array.from(INCIDENT_STATUS.entries())
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
    total: INCIDENT_STATUS.size,
    percentComplete: 0
  };
  
  for (const status of INCIDENT_STATUS.values()) {
    stats[status]++;
  }
  
  stats.percentComplete = Math.round(
    (stats.tested / stats.total) * 100
  );
  
  return stats;
}

/**
 * Get incidents by tier
 */
export function getIncidentsByTier(tier: 'minor' | 'moderate' | 'major'): string[] {
  const tierRanges = {
    minor: [1, 8],
    moderate: [9, 18],
    major: [19, 30]
  };
  
  const [start, end] = tierRanges[tier];
  
  return Array.from(INCIDENT_NUMBERS.entries())
    .filter(([_, num]) => num >= start && num <= end)
    .map(([id, _]) => id);
}

