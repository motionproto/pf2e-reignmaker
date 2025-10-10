/**
 * UnrestService - Centralized unrest calculations and utilities
 * 
 * This is the single source of truth for all unrest-related logic:
 * - Size-based unrest calculation (hexes → unrest per turn)
 * - Tier-based incident thresholds
 * - Skill check penalties
 * - Icon/color mappings for UI display
 */

/**
 * Configurable constants (can be exposed as game settings later)
 */
export const HEXES_PER_UNREST = 8;
export const UNREST_PER_TIER = 3;
export const MAX_UNREST_TIER = 3;

/**
 * Unrest tier information for display and game mechanics
 */
export interface UnrestTierInfo {
  tier: number;
  tierName: string;
  penalty: number;
  incidentThreshold: number;
  incidentChance: number;
  incidentSeverity: 'minor' | 'moderate' | 'major';
  description: string;
  statusClass: string;
  icon: string;
  color: string;
}

/**
 * Calculate unrest gained per turn based on kingdom size
 * Formula: floor(hexes / 8)
 */
export function calculateSizeUnrest(hexes: number): number {
  return Math.floor(hexes / HEXES_PER_UNREST);
}

/**
 * Get unrest tier (0-3) based on current unrest level
 * Formula: min(3, floor(unrest / 3))
 */
export function getUnrestTier(unrest: number): number {
  return Math.min(MAX_UNREST_TIER, Math.floor(unrest / UNREST_PER_TIER));
}

/**
 * Get comprehensive unrest tier information for UI display
 * This is the single source of truth for unrest tier calculations
 */
export function getUnrestTierInfo(unrest: number): UnrestTierInfo {
  const tier = getUnrestTier(unrest);
  
  // D100 thresholds - minimum roll needed to trigger incident
  // These match the incident tables in Unrest_incidents.md
  const d100Thresholds = [0, 21, 16, 11]; // Tier 0: N/A, Tier 1: 21+, Tier 2: 16+, Tier 3: 11+
  const incidentChances = [0, 80, 85, 90]; // Tier 0: 0%, Tier 1: 80%, Tier 2: 85%, Tier 3: 90%
  
  const tierNames = ['Stable', 'Discontent', 'Turmoil', 'Rebellion'];
  const tierDescriptions = [
    'No incidents occur at this level',
    'Minor incidents possible (80% chance)',
    'Moderate incidents possible (85% chance)',
    'Major incidents possible (90% chance)'
  ];
  const statusClasses = ['stable', 'discontent', 'unrest', 'rebellion'];
  
  // Icon and color mappings for each tier
  const tierIcons = ['fa-dove', 'fa-hand-fist', 'fa-fire', 'fa-house-fire'];
  const tierColors = [
    'var(--color-success)',      // Stable - green
    'var(--color-warning)',       // Discontent - yellow/orange
    'var(--color-danger)',        // Turmoil - red
    'var(--color-danger)'         // Rebellion - red
  ];
  
  const severity: 'minor' | 'moderate' | 'major' = 
    tier <= 1 ? 'minor' : tier <= 2 ? 'moderate' : 'major';
  
  return {
    tier,
    tierName: tierNames[tier] || 'Stable',
    penalty: tier,
    incidentThreshold: d100Thresholds[tier] || 0,
    incidentChance: incidentChances[tier] || 0,
    incidentSeverity: severity,
    description: tierDescriptions[tier] || 'No incidents occur at this level',
    statusClass: statusClasses[tier] || 'stable',
    icon: tierIcons[tier] || 'fa-dove',
    color: tierColors[tier] || 'var(--color-success)'
  };
}

/**
 * Get unrest status text based on level
 */
export function getUnrestStatus(unrest: number): string {
  if (unrest === 0) return 'stable';
  if (unrest <= 2) return 'calm';
  if (unrest <= 4) return 'tense';
  if (unrest <= 6) return 'troubled';
  if (unrest <= 8) return 'volatile';
  return 'critical';
}

/**
 * Get incident chance (0.0-1.0) based on unrest tier
 */
export function getIncidentChance(unrest: number): number {
  const tier = getUnrestTier(unrest);
  switch (tier) {
    case 0: return 0.0;  // Stable - no incidents
    case 1: return 0.8;  // Minor - 80% chance
    case 2: return 0.85; // Moderate - 85% chance
    case 3: return 0.9;  // Major - 90% chance
    default: return 0.0;
  }
}

/**
 * Get incident severity based on unrest tier
 */
export function getIncidentSeverity(unrest: number): 'minor' | 'moderate' | 'major' {
  const tier = getUnrestTier(unrest);
  if (tier <= 1) return 'minor';
  if (tier <= 2) return 'moderate';
  return 'major';
}

/**
 * Get skill check penalty based on unrest level
 * Used by PF2eSkillService for kingdom skill checks
 */
export function getSkillPenalty(unrest: number): number {
  if (unrest < 3) return 0;
  if (unrest <= 5) return -1;  // Discontent
  if (unrest <= 8) return -2;  // Turmoil
  return -3;                   // Rebellion (capped at -3)
}

/**
 * Get unrest icon and color for display based on current level
 * Returns the appropriate FontAwesome icon and CSS color variable
 */
export function getUnrestIconAndColor(unrest: number): { icon: string; color: string } {
  const tierInfo = getUnrestTierInfo(unrest);
  return {
    icon: tierInfo.icon,
    color: tierInfo.color
  };
}

/**
 * Check if unrest is at a critical level (tier 3)
 */
export function isCriticalUnrest(unrest: number): boolean {
  return getUnrestTier(unrest) >= 3;
}

/**
 * Get tier name for display
 */
export function getUnrestTierName(unrest: number): string {
  return getUnrestTierInfo(unrest).tierName;
}
