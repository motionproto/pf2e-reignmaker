/**
 * Incident Logic - Pure Functions
 * 
 * Handles incident triggering based on unrest levels.
 */

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'minor' | 'moderate' | 'major';

/**
 * Get incident chance based on unrest tier
 * Tier 0: 0%, Tier 1: 25%, Tier 2: 50%, Tier 3: 75%
 * 
 * @param unrestTier - Current unrest tier (0-3)
 * @returns Probability of incident (0-1)
 */
export function getIncidentChance(unrestTier: number): number {
  const chances = [0, 0.25, 0.50, 0.75];
  return chances[Math.min(unrestTier, 3)];
}

/**
 * Get incident chance from raw unrest value
 * 
 * @param unrest - Current unrest level
 * @returns Probability of incident (0-1)
 */
export function getIncidentChanceFromUnrest(unrest: number): number {
  if (unrest < 3) return 0;
  if (unrest <= 5) return 0.25;
  if (unrest <= 8) return 0.50;
  return 0.75;
}

/**
 * Get incident severity based on unrest tier
 * Tier 0-1: minor, Tier 2: moderate, Tier 3: major
 * 
 * @param unrestTier - Current unrest tier (0-3)
 * @returns Incident severity
 */
export function getIncidentSeverity(unrestTier: number): IncidentSeverity {
  if (unrestTier <= 1) return 'minor';
  if (unrestTier === 2) return 'moderate';
  return 'major';
}

/**
 * Get incident severity from raw unrest value
 * 
 * @param unrest - Current unrest level
 * @returns Incident severity
 */
export function getIncidentSeverityFromUnrest(unrest: number): IncidentSeverity {
  if (unrest < 6) return 'minor';
  if (unrest <= 8) return 'moderate';
  return 'major';
}

/**
 * Roll to determine if an incident occurs
 * 
 * @param unrest - Current unrest level
 * @param roll - Random value 0-1 (for deterministic testing)
 * @returns True if incident occurs
 */
export function rollForIncident(unrest: number, roll: number): boolean {
  const chance = getIncidentChanceFromUnrest(unrest);
  return roll < chance;
}

/**
 * Incident check result
 */
export interface IncidentCheckResult {
  triggered: boolean;
  severity: IncidentSeverity | null;
  chance: number;
  unrestTier: number;
}

/**
 * Perform complete incident check
 * 
 * @param unrest - Current unrest level
 * @param roll - Random value 0-1
 * @returns Incident check result
 */
export function checkForIncident(unrest: number, roll: number): IncidentCheckResult {
  const chance = getIncidentChanceFromUnrest(unrest);
  const triggered = roll < chance;
  
  return {
    triggered,
    severity: triggered ? getIncidentSeverityFromUnrest(unrest) : null,
    chance,
    unrestTier: Math.min(3, Math.floor(unrest / 3))
  };
}

