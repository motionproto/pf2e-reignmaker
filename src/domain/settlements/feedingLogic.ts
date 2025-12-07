/**
 * Settlement Feeding Logic - Pure Functions
 * 
 * Handles settlement food consumption and feeding priority.
 */

import type { KingdomData, Settlement } from '../../actors/KingdomActor';
import { getTierConsumption, getTierNumber } from './tierLogic';

export interface FeedingResult {
  fed: string[];           // Settlement IDs that were fed
  unfed: string[];         // Settlement IDs that went unfed
  foodConsumed: number;    // Total food used
  unrestGenerated: number; // Unrest from unfed settlements
}

/**
 * Sort settlements by feeding priority
 * Capital first, then by tier (highest first)
 * 
 * @param settlements - Array of settlements to sort
 * @returns Sorted array (does not mutate original)
 */
export function sortByFeedingPriority(settlements: Settlement[]): Settlement[] {
  return [...settlements].sort((a, b) => {
    // Capital always first
    if (a.isCapital && !b.isCapital) return -1;
    if (!a.isCapital && b.isCapital) return 1;
    
    // Then by tier (highest first)
    return getTierNumber(b.tier) - getTierNumber(a.tier);
  });
}

/**
 * Calculate feeding requirements and simulate feeding
 * Does NOT mutate kingdom - call applyFeeding to apply results
 * 
 * @param kingdom - Kingdom data (not mutated)
 * @returns Feeding result
 */
export function calculateFeeding(kingdom: KingdomData): FeedingResult {
  const availableFood = kingdom.resources.food || 0;
  const settlements = sortByFeedingPriority(kingdom.settlements || []);
  
  const result: FeedingResult = {
    fed: [],
    unfed: [],
    foodConsumed: 0,
    unrestGenerated: 0
  };
  
  let remainingFood = availableFood;
  
  for (const settlement of settlements) {
    const consumption = getTierConsumption(settlement.tier);
    
    if (remainingFood >= consumption) {
      // Settlement is fed
      result.fed.push(settlement.id);
      result.foodConsumed += consumption;
      remainingFood -= consumption;
    } else {
      // Settlement goes unfed
      result.unfed.push(settlement.id);
      // Unfed settlement generates unrest equal to tier
      result.unrestGenerated += getTierNumber(settlement.tier);
    }
  }
  
  return result;
}

/**
 * Apply feeding results to kingdom (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @param feedingResult - Result from calculateFeeding
 */
export function applyFeeding(kingdom: KingdomData, feedingResult: FeedingResult): void {
  // Deduct food consumed
  kingdom.resources.food = Math.max(0, (kingdom.resources.food || 0) - feedingResult.foodConsumed);
  
  // Update settlement fed status
  for (const settlement of kingdom.settlements || []) {
    settlement.wasFedLastTurn = feedingResult.fed.includes(settlement.id);
  }
  
  // Apply unrest from unfed settlements
  if (feedingResult.unrestGenerated > 0) {
    kingdom.unrest = (kingdom.unrest || 0) + feedingResult.unrestGenerated;
  }
}

/**
 * Perform complete feeding operation (mutates kingdom)
 * Combines calculateFeeding and applyFeeding
 * 
 * @param kingdom - Kingdom data to mutate
 * @returns Feeding result
 */
export function performFeeding(kingdom: KingdomData): FeedingResult {
  const result = calculateFeeding(kingdom);
  applyFeeding(kingdom, result);
  return result;
}

/**
 * Check if all settlements can be fed with current food
 * 
 * @param kingdom - Kingdom data
 * @returns True if all settlements can be fed
 */
export function canFeedAllSettlements(kingdom: KingdomData): boolean {
  const totalConsumption = (kingdom.settlements || [])
    .reduce((sum, s) => sum + getTierConsumption(s.tier), 0);
  return (kingdom.resources.food || 0) >= totalConsumption;
}

/**
 * Calculate food deficit (how much more food is needed)
 * 
 * @param kingdom - Kingdom data
 * @returns Food deficit (0 if no deficit)
 */
export function calculateFoodDeficit(kingdom: KingdomData): number {
  const totalConsumption = (kingdom.settlements || [])
    .reduce((sum, s) => sum + getTierConsumption(s.tier), 0);
  const available = kingdom.resources.food || 0;
  return Math.max(0, totalConsumption - available);
}

