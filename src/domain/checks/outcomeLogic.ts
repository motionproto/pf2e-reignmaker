/**
 * Outcome Logic - Pure Functions
 * 
 * Calculates degree of success for skill checks using PF2e rules.
 */

export type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

/**
 * Calculate degree of success for a check
 * 
 * PF2e rules:
 * - Natural 20 improves result by one degree
 * - Natural 1 worsens result by one degree  
 * - Beat DC by 10+ = critical success
 * - Beat DC = success
 * - Fail by less than 10 = failure
 * - Fail by 10+ = critical failure
 * 
 * @param total - Total roll result (d20 + modifiers)
 * @param dc - Difficulty class
 * @param naturalRoll - The natural d20 roll (for nat 1/20 handling)
 * @returns Degree of success
 */
export function calculateDegreeOfSuccess(
  total: number, 
  dc: number, 
  naturalRoll: number
): OutcomeType {
  const difference = total - dc;
  
  // Natural 20 handling
  if (naturalRoll === 20) {
    if (difference >= 0) return 'criticalSuccess';
    if (difference >= -9) return 'success';
    return 'failure';
  }
  
  // Natural 1 handling
  if (naturalRoll === 1) {
    if (difference >= 10) return 'success';
    if (difference >= 0) return 'failure';
    return 'criticalFailure';
  }
  
  // Standard degree calculation
  if (difference >= 10) return 'criticalSuccess';
  if (difference >= 0) return 'success';
  if (difference > -10) return 'failure';
  return 'criticalFailure';
}

/**
 * Simulate a complete skill check
 * 
 * @param rollD20 - Function that returns a d20 roll (1-20)
 * @param skillBonus - Total skill modifier
 * @param dc - Difficulty class
 * @param unrestPenalty - Penalty from kingdom unrest
 * @returns Check result with all details
 */
export function simulateCheck(
  rollD20: () => number,
  skillBonus: number,
  dc: number,
  unrestPenalty: number = 0
): {
  roll: number;
  total: number;
  dc: number;
  outcome: OutcomeType;
  unrestPenalty: number;
} {
  const roll = rollD20();
  const total = roll + skillBonus + unrestPenalty;
  const outcome = calculateDegreeOfSuccess(total, dc, roll);
  
  return { roll, total, dc, outcome, unrestPenalty };
}

/**
 * Determine if an outcome is successful (success or critical success)
 * 
 * @param outcome - Outcome type
 * @returns True if successful
 */
export function isSuccess(outcome: OutcomeType): boolean {
  return outcome === 'success' || outcome === 'criticalSuccess';
}

/**
 * Determine if an outcome is a critical result
 * 
 * @param outcome - Outcome type  
 * @returns True if critical (success or failure)
 */
export function isCritical(outcome: OutcomeType): boolean {
  return outcome === 'criticalSuccess' || outcome === 'criticalFailure';
}

/**
 * Get a numeric value for outcome comparison
 * Higher is better: critSuccess=3, success=2, failure=1, critFail=0
 * 
 * @param outcome - Outcome type
 * @returns Numeric value
 */
export function getOutcomeValue(outcome: OutcomeType): number {
  switch (outcome) {
    case 'criticalSuccess': return 3;
    case 'success': return 2;
    case 'failure': return 1;
    case 'criticalFailure': return 0;
  }
}

/**
 * Improve outcome by one degree (for nat 20, hero points, etc.)
 * 
 * @param outcome - Current outcome
 * @returns Improved outcome
 */
export function improveOutcome(outcome: OutcomeType): OutcomeType {
  switch (outcome) {
    case 'criticalFailure': return 'failure';
    case 'failure': return 'success';
    case 'success': return 'criticalSuccess';
    case 'criticalSuccess': return 'criticalSuccess'; // Can't improve further
  }
}

/**
 * Worsen outcome by one degree (for nat 1, etc.)
 * 
 * @param outcome - Current outcome
 * @returns Worsened outcome
 */
export function worsenOutcome(outcome: OutcomeType): OutcomeType {
  switch (outcome) {
    case 'criticalSuccess': return 'success';
    case 'success': return 'failure';
    case 'failure': return 'criticalFailure';
    case 'criticalFailure': return 'criticalFailure'; // Can't worsen further
  }
}

