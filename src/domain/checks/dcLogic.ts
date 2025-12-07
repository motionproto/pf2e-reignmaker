/**
 * DC (Difficulty Class) Logic - Pure Functions
 * 
 * Provides level-based DCs and skill bonuses from PF2e rules.
 */

/**
 * Level-based DC table from PF2e rules
 */
export const DC_BY_LEVEL: Record<number, number> = {
  1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
  6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
  11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
  16: 35, 17: 36, 18: 38, 19: 39, 20: 40
};

/**
 * Average skill bonus by party level (for trained + stat progression)
 */
export const SKILL_BONUS_BY_LEVEL: Record<number, number> = {
  1: 7, 2: 8, 3: 11, 4: 12, 5: 14,
  6: 15, 7: 18, 8: 19, 9: 20, 10: 21,
  11: 22, 12: 23, 13: 24, 14: 25, 15: 28,
  16: 29, 17: 30, 18: 31, 19: 32, 20: 33
};

/**
 * Get level-appropriate DC
 * 
 * @param level - Party/kingdom level (1-20)
 * @returns DC value
 */
export function getLevelBasedDC(level: number): number {
  const clampedLevel = Math.max(1, Math.min(20, level));
  return DC_BY_LEVEL[clampedLevel] || 15;
}

/**
 * Get skill bonus for a given level
 * 
 * @param level - Party/kingdom level (1-20)
 * @returns Skill bonus
 */
export function getSkillBonusForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(20, level));
  return SKILL_BONUS_BY_LEVEL[clampedLevel] || SKILL_BONUS_BY_LEVEL[20];
}

/**
 * Calculate party level based on turn number
 * Smooth linear progression from level 1 to target level
 * 
 * @param turn - Current turn number
 * @param totalTurns - Total turns in campaign
 * @param targetLevel - Final level to reach (default: 16)
 * @returns Current level
 */
export function calculateLevelForTurn(
  turn: number, 
  totalTurns: number, 
  targetLevel: number = 16
): number {
  if (totalTurns <= 1) return 1;
  
  // Linear interpolation: turn 1 = level 1, turn totalTurns = targetLevel
  const level = 1 + Math.round((turn - 1) * (targetLevel - 1) / (totalTurns - 1));
  return Math.min(Math.max(1, level), targetLevel);
}

/**
 * Get unrest penalty for skill checks
 * Per production rules: unrest 3-5 = -1, 6-8 = -2, 9+ = -3
 * 
 * @param unrest - Current unrest level
 * @returns Penalty (negative number or 0)
 */
export function getUnrestPenalty(unrest: number): number {
  if (unrest < 3) return 0;
  if (unrest <= 5) return -1;
  if (unrest <= 8) return -2;
  return -3; // Capped at -3
}

