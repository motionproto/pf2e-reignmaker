/**
 * CohesionService - Kingdom cohesion check logic for large kingdoms
 *
 * When a kingdom reaches 20 or more claimed hexes, leaders must make skill checks
 * to maintain cohesion. This check rotates between leaders each turn.
 */

import { PLAYER_KINGDOM } from '../../types/ownership';
import type { KingdomData } from '../../actors/KingdomActor';
import { getSkillDoctrine } from '../../constants/doctrine';
import type { DoctrineType } from '../../types/Doctrine';

export interface SkillOption {
  skill: string;
  modifier: number;
  label: string;  // Capitalized display name
  doctrine?: DoctrineType;  // Doctrine alignment for tracking
}

export interface CohesionCheckResult {
  required: boolean;
  hexCount: number;
  penalty: number;
}

/**
 * Threshold for cohesion check to be required (>= 20 hexes)
 */
export const COHESION_HEX_THRESHOLD = 20;

/**
 * Hexes per penalty tier (penalty increases by 1 for every 20 hexes beyond threshold)
 */
export const COHESION_PENALTY_INTERVAL = 20;

/**
 * Check if a cohesion check is required based on kingdom size
 */
export function shouldTriggerCohesionCheck(hexCount: number): boolean {
  return hexCount >= COHESION_HEX_THRESHOLD;
}

/**
 * Calculate the penalty for the cohesion check based on kingdom size
 * - At 20 hexes: 0 penalty (check required but no penalty)
 * - At 40 hexes: -1 penalty
 * - At 60 hexes: -2 penalty
 * - etc.
 */
export function calculateCohesionPenalty(hexCount: number): number {
  if (hexCount < COHESION_HEX_THRESHOLD) return 0;
  return Math.floor((hexCount - COHESION_HEX_THRESHOLD) / COHESION_PENALTY_INTERVAL);
}

/**
 * Get the active leader index for the current turn
 * Cycles through leaders each turn, skipping offline leaders
 *
 * @param turnNumber - Current turn number
 * @param leaderCount - Total number of leaders
 * @param onlineStatuses - Optional array of booleans indicating if each leader is online
 * @returns Index of the active leader, or -1 if no online leaders
 */
export function getActiveLeaderIndex(
  turnNumber: number,
  leaderCount: number,
  onlineStatuses?: boolean[]
): number {
  if (leaderCount === 0) return -1;

  // If no online statuses provided, use simple rotation
  if (!onlineStatuses) {
    return turnNumber % leaderCount;
  }

  // Count online leaders
  const onlineIndices = onlineStatuses
    .map((isOnline, index) => isOnline ? index : -1)
    .filter(index => index !== -1);

  if (onlineIndices.length === 0) return -1;

  // Rotate among online leaders only
  const onlineIndex = turnNumber % onlineIndices.length;
  return onlineIndices[onlineIndex];
}

/**
 * Get the count of claimed hexes for the player kingdom
 */
export function getClaimedHexCount(kingdom: KingdomData): number {
  if (!kingdom.hexes) return 0;
  return kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length;
}

/**
 * Check cohesion requirements for the kingdom
 */
export function checkCohesionRequirements(kingdom: KingdomData): CohesionCheckResult {
  const hexCount = getClaimedHexCount(kingdom);
  const required = shouldTriggerCohesionCheck(hexCount);
  const penalty = calculateCohesionPenalty(hexCount);

  return { required, hexCount, penalty };
}

/**
 * Capitalize a skill name for display
 */
function capitalizeSkill(skill: string): string {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

/**
 * Get the top N skills for a character sorted by totalModifier
 * @param actor - The PF2e character actor
 * @param count - Number of skills to return (default 4)
 * @returns Array of skill options sorted by modifier (highest first)
 */
export function getLeaderTopSkills(actor: any, count: number = 4): SkillOption[] {
  if (!actor?.skills) return [];

  const allSkills = Object.entries(actor.skills)
    .filter(([slug]: [string, any]) => {
      // Exclude lore skills (they have special handling)
      // and perception (not typically a kingdom skill)
      return !slug.startsWith('lore') && slug !== 'perception';
    })
    .map(([slug, skill]: [string, any]) => {
      // Try different ways to get the modifier
      const modifier = skill.totalModifier ?? skill.mod ?? skill.check?.mod ?? 0;
      // Get doctrine alignment from centralized mapping
      const doctrine = getSkillDoctrine(slug) || undefined;
      return {
        skill: slug,
        modifier,
        label: capitalizeSkill(slug),
        doctrine
      };
    })
    .sort((a, b) => b.modifier - a.modifier)
    .slice(0, count);

  return allSkills;
}

/**
 * Format the penalty for display
 * Returns empty string if no penalty, otherwise "-N"
 */
export function formatCohesionPenalty(penalty: number): string {
  if (penalty === 0) return '';
  return `-${penalty}`;
}

// Export as singleton-style functions (no class needed for pure functions)
export const cohesionService = {
  shouldTriggerCohesionCheck,
  calculateCohesionPenalty,
  getActiveLeaderIndex,
  getClaimedHexCount,
  checkCohesionRequirements,
  getLeaderTopSkills,
  formatCohesionPenalty,
  COHESION_HEX_THRESHOLD,
  COHESION_PENALTY_INTERVAL
};
