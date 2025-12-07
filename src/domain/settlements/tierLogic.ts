/**
 * Settlement Tier Logic - Pure Functions
 * 
 * Handles settlement tier calculations, upgrades, and limits.
 */

import type { KingdomData, Settlement } from '../../actors/KingdomActor';

/**
 * Settlement tier configuration
 */
export const SETTLEMENT_TIER_CONFIG = {
  Village: { 
    tier: 1, 
    maxStructures: 4, 
    consumption: 1, 
    goldIncome: 1, 
    armySupport: 1,
    upgradeSize: 10, 
    upgradeCost: 4 
  },
  Town: { 
    tier: 2, 
    maxStructures: 8, 
    consumption: 2, 
    goldIncome: 2, 
    armySupport: 2,
    upgradeSize: 25, 
    upgradeCost: 8 
  },
  City: { 
    tier: 3, 
    maxStructures: 12, 
    consumption: 4, 
    goldIncome: 4, 
    armySupport: 3,
    upgradeSize: 50, 
    upgradeCost: 16 
  },
  Metropolis: { 
    tier: 4, 
    maxStructures: 16, 
    consumption: 6, 
    goldIncome: 6, 
    armySupport: 4,
    upgradeSize: 999, 
    upgradeCost: 0 
  }
} as const;

export type SettlementTierName = keyof typeof SETTLEMENT_TIER_CONFIG;

/**
 * Get tier configuration for a settlement tier name
 * 
 * @param tierName - Settlement tier name
 * @returns Tier configuration or undefined
 */
export function getTierConfig(tierName: string) {
  return SETTLEMENT_TIER_CONFIG[tierName as SettlementTierName];
}

/**
 * Get tier number from tier name
 * 
 * @param tierName - Settlement tier name
 * @returns Tier number (1-4) or 1 if not found
 */
export function getTierNumber(tierName: string): number {
  return getTierConfig(tierName)?.tier || 1;
}

/**
 * Get max structures for a settlement tier
 * 
 * @param tierName - Settlement tier name
 * @returns Maximum structures allowed
 */
export function getMaxStructures(tierName: string): number {
  return getTierConfig(tierName)?.maxStructures || 4;
}

/**
 * Get food consumption for a settlement tier
 * 
 * @param tierName - Settlement tier name
 * @returns Food consumption per turn
 */
export function getTierConsumption(tierName: string): number {
  return getTierConfig(tierName)?.consumption || 1;
}

/**
 * Get gold income for a settlement tier
 * 
 * @param tierName - Settlement tier name
 * @returns Gold income per turn (when fed)
 */
export function getTierGoldIncome(tierName: string): number {
  return getTierConfig(tierName)?.goldIncome || 1;
}

/**
 * Get next tier name for upgrade
 * 
 * @param currentTier - Current tier name
 * @returns Next tier name or null if max
 */
export function getNextTierName(currentTier: string): SettlementTierName | null {
  const tiers: SettlementTierName[] = ['Village', 'Town', 'City', 'Metropolis'];
  const currentIndex = tiers.indexOf(currentTier as SettlementTierName);
  if (currentIndex < 0 || currentIndex >= tiers.length - 1) return null;
  return tiers[currentIndex + 1];
}

/**
 * Check if settlement can be upgraded
 * 
 * @param settlement - Settlement to check
 * @param kingdomSize - Current kingdom size (hex count)
 * @returns True if upgradeable
 */
export function canUpgradeSettlement(settlement: Settlement, kingdomSize: number): boolean {
  const config = getTierConfig(settlement.tier);
  if (!config) return false;
  
  // Can't upgrade Metropolis
  if (config.tier >= 4) return false;
  
  // Check size requirement
  return kingdomSize >= config.upgradeSize;
}

/**
 * Get upgrade cost for settlement
 * 
 * @param settlement - Settlement to upgrade
 * @returns Upgrade cost in food
 */
export function getUpgradeCost(settlement: Settlement): number {
  return getTierConfig(settlement.tier)?.upgradeCost || 0;
}

/**
 * Apply settlement upgrade (mutates settlement)
 * 
 * @param settlement - Settlement to upgrade
 * @returns True if upgraded
 */
export function applySettlementUpgrade(settlement: Settlement): boolean {
  const nextTier = getNextTierName(settlement.tier);
  if (!nextTier) return false;
  
  settlement.tier = nextTier;
  return true;
}

/**
 * Check if settlement has room for more structures
 * 
 * @param settlement - Settlement to check
 * @param queueCount - Number of structures in build queue for this settlement
 * @returns True if can add more structures
 */
export function hasStructureCapacity(settlement: Settlement, queueCount: number = 0): boolean {
  const maxStructures = getMaxStructures(settlement.tier);
  const currentCount = (settlement.structures?.length || 0) + queueCount;
  return currentCount < maxStructures;
}

/**
 * Get available structure slots in settlement
 * 
 * @param settlement - Settlement to check
 * @param queueCount - Number of structures in build queue
 * @returns Number of available slots
 */
export function getAvailableStructureSlots(settlement: Settlement, queueCount: number = 0): number {
  const maxStructures = getMaxStructures(settlement.tier);
  const currentCount = (settlement.structures?.length || 0) + queueCount;
  return Math.max(0, maxStructures - currentCount);
}

