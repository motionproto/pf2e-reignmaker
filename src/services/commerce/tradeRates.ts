/**
 * Commerce Trade Rates Service
 * 
 * Reads trade ratios from commerce structures in settlements.
 */

import { getKingdomData } from '../../stores/KingdomStore';
import { structuresService } from '../structures';

export interface TradeRatio {
  resourceCost: number;  // Resources needed
  goldGain: number;      // Gold received
}

export interface TradeRates {
  sell: TradeRatio;  // Selling resources for gold
  buy: TradeRatio;   // Buying resources with gold
  tier: number;      // Current tier (0-4, where 0 = no structure)
}

// Tier progression for critical success bonuses
const SELL_TIERS: TradeRatio[] = [
  { resourceCost: 2, goldGain: 1 },   // Tier 0: No structure (2:1)
  { resourceCost: 2, goldGain: 1 },   // Tier 1: Market Square (2:1)
  { resourceCost: 3, goldGain: 2 },   // Tier 2: Bazaar (3:2)
  { resourceCost: 1, goldGain: 1 },   // Tier 3: Merchant Guild (1:1)
  { resourceCost: 1, goldGain: 2 },   // Tier 4: Imperial Bank (1:2)
  { resourceCost: 1, goldGain: 3 }    // Tier 5: Bonus tier (1:3) - critical success only
];

const BUY_TIERS: TradeRatio[] = [
  { resourceCost: 1, goldGain: 2 },   // Tier 0: No structure (2:1 inverted)
  { resourceCost: 1, goldGain: 2 },   // Tier 1: Market Square (2:1 inverted)
  { resourceCost: 2, goldGain: 3 },   // Tier 2: Bazaar (3:2 inverted)
  { resourceCost: 1, goldGain: 1 },   // Tier 3: Merchant Guild (1:1 inverted)
  { resourceCost: 2, goldGain: 1 },   // Tier 4: Imperial Bank (1:2 inverted)
  { resourceCost: 3, goldGain: 1 }    // Tier 5: Bonus tier (1:3 inverted) - critical success only
];

/**
 * Get the best trade rates available from kingdom's commerce structures
 */
export function getBestTradeRates(): TradeRates {
  const tier = getCommerceTier();
  
  return {
    sell: SELL_TIERS[tier],
    buy: BUY_TIERS[tier],
    tier
  };
}

/**
 * Get trade rates for critical success (one tier higher)
 */
export function getCriticalSuccessRates(): TradeRates {
  const baseTier = getCommerceTier();
  const critTier = Math.min(baseTier + 1, SELL_TIERS.length - 1);
  
  return {
    sell: SELL_TIERS[critTier],
    buy: BUY_TIERS[critTier],
    tier: critTier
  };
}

/**
 * Check if kingdom has any commerce structure
 */
export function hasCommerceStructure(): boolean {
  return getCommerceTier() > 0;
}

/**
 * Get the current commerce tier based on built structures
 */
function getCommerceTier(): number {
  const kingdom = getKingdomData();
  
  if (!kingdom.settlements || kingdom.settlements.length === 0) {
    return 0; // No structures
  }
  
  // Initialize structures service
  structuresService.initializeStructures();
  
  // Check for commerce structures in priority order
  const tierMap: { [key: string]: number } = {
    'imperial-bank': 4,
    'merchant-guild': 3,
    'bazaar': 2,
    'market-square': 1
  };
  
  let highestTier = 0;
  
  for (const settlement of kingdom.settlements) {
    if (!settlement.structureIds || settlement.structureIds.length === 0) continue;
    
    for (const structureId of settlement.structureIds) {
      const tier = tierMap[structureId];
      if (tier && tier > highestTier) {
        highestTier = tier;
      }
    }
  }
  
  return highestTier;
}

/**
 * Parse ratio string like "2:1" into { resourceCost: 2, goldGain: 1 }
 */
function parseRatio(ratio: string): TradeRatio {
  const parts = ratio.split(':');
  if (parts.length !== 2) {
    return { resourceCost: 2, goldGain: 1 }; // Default
  }
  
  return {
    resourceCost: parseInt(parts[0], 10),
    goldGain: parseInt(parts[1], 10)
  };
}

/**
 * Format ratio for display
 */
export function formatTradeRatio(ratio: TradeRatio, type: 'sell' | 'buy'): string {
  if (type === 'sell') {
    return `${ratio.resourceCost} resource${ratio.resourceCost > 1 ? 's' : ''} → ${ratio.goldGain} gold`;
  } else {
    return `${ratio.goldGain} gold → ${ratio.resourceCost} resource${ratio.resourceCost > 1 ? 's' : ''}`;
  }
}

/**
 * Get commerce structure name for current tier
 */
export function getCommerceStructureName(): string {
  const tier = getCommerceTier();
  
  const tierNames = [
    'None',
    'Market Square',
    'Bazaar',
    'Merchant Guild',
    'Imperial Bank',
    'Legendary Trade (Bonus)' // Critical success from Imperial Bank
  ];
  
  return tierNames[tier] || 'None';
}
