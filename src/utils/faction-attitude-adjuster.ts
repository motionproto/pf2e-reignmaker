/**
 * Faction Attitude Adjuster - Pure utility functions for attitude calculations
 * 
 * Provides reusable logic for improving/worsening faction relations
 * Used by FactionService, GameCommandsResolver, and action implementations
 */

import type { AttitudeLevel } from '../models/Faction';
import { ATTITUDE_ORDER } from '../models/Faction';
import type { KingdomData } from '../actors/KingdomActor';

/**
 * Get attitude N steps away (positive = improve, negative = worsen)
 * 
 * @param current - Current attitude level
 * @param steps - Number of steps to move (+1 = improve, -1 = worsen, +2 = improve twice, etc.)
 * @param options - Optional constraints (maxLevel, minLevel)
 * @returns New attitude level or null if no change possible
 * 
 * @example
 * adjustAttitudeBySteps('Unfriendly', 1) // → 'Indifferent'
 * adjustAttitudeBySteps('Friendly', 1, { maxLevel: 'Friendly' }) // → null (capped)
 * adjustAttitudeBySteps('Indifferent', -1) // → 'Unfriendly'
 */
export function adjustAttitudeBySteps(
  current: AttitudeLevel,
  steps: number,
  options?: {
    maxLevel?: AttitudeLevel;
    minLevel?: AttitudeLevel;
  }
): AttitudeLevel | null {
  const currentIndex = ATTITUDE_ORDER.indexOf(current);
  if (currentIndex === -1) {
    return null; // Invalid current attitude
  }
  
  // Calculate target index (lower index = better attitude in ATTITUDE_ORDER)
  const targetIndex = currentIndex - steps;
  
  // Apply constraints
  let finalIndex = targetIndex;
  
  if (options?.maxLevel) {
    const maxIndex = ATTITUDE_ORDER.indexOf(options.maxLevel);
    finalIndex = Math.max(finalIndex, maxIndex); // Can't go beyond maxLevel
  }
  
  if (options?.minLevel) {
    const minIndex = ATTITUDE_ORDER.indexOf(options.minLevel);
    finalIndex = Math.min(finalIndex, minIndex); // Can't go below minLevel
  }
  
  // Bounds check (can't exceed array bounds)
  if (finalIndex < 0 || finalIndex >= ATTITUDE_ORDER.length) {
    return null; // No change possible (already at limit)
  }
  
  // Return new attitude if different from current
  return finalIndex === currentIndex ? null : ATTITUDE_ORDER[finalIndex];
}

/**
 * Check if kingdom has diplomatic structures (diplomaticCapacity > 1)
 * 
 * Used to determine if "Friendly" cap should be applied:
 * - No diplomatic structures (capacity = 1): Limited to Friendly
 * - Any diplomatic structure (capacity > 1): Can reach Helpful
 * 
 * @param kingdom - Kingdom data
 * @returns True if kingdom has diplomatic structures
 */
export function hasDiplomaticStructures(kingdom: KingdomData): boolean {
  return (kingdom.resources?.diplomaticCapacity || 1) > 1;
}

/**
 * Check if attitude can be adjusted by N steps
 * 
 * @param current - Current attitude level
 * @param steps - Number of steps to adjust
 * @param options - Optional constraints
 * @returns True if adjustment is possible
 */
export function canAdjustAttitude(
  current: AttitudeLevel,
  steps: number,
  options?: {
    maxLevel?: AttitudeLevel;
    minLevel?: AttitudeLevel;
  }
): boolean {
  return adjustAttitudeBySteps(current, steps, options) !== null;
}

/**
 * Get display reason for why attitude cannot be adjusted
 * 
 * @param current - Current attitude level
 * @param steps - Number of steps attempting to adjust
 * @param options - Optional constraints
 * @returns User-friendly reason string, or null if adjustment is possible
 */
export function getAdjustmentBlockReason(
  current: AttitudeLevel,
  steps: number,
  options?: {
    maxLevel?: AttitudeLevel;
    minLevel?: AttitudeLevel;
  }
): string | null {
  // Check if adjustment is possible
  if (canAdjustAttitude(current, steps, options)) {
    return null;
  }
  
  const currentIndex = ATTITUDE_ORDER.indexOf(current);
  const targetIndex = currentIndex - steps;
  
  // Check natural bounds
  if (targetIndex < 0) {
    return 'Already Helpful';
  }
  if (targetIndex >= ATTITUDE_ORDER.length) {
    return 'Already Hostile';
  }
  
  // Check constraints
  if (options?.maxLevel && steps > 0) {
    const maxIndex = ATTITUDE_ORDER.indexOf(options.maxLevel);
    if (currentIndex <= maxIndex) {
      return `Max: ${options.maxLevel}`;
    }
  }
  
  if (options?.minLevel && steps < 0) {
    const minIndex = ATTITUDE_ORDER.indexOf(options.minLevel);
    if (currentIndex >= minIndex) {
      return `Min: ${options.minLevel}`;
    }
  }
  
  return 'Cannot adjust';
}
