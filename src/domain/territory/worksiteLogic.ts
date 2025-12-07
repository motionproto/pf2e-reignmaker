/**
 * Worksite Logic - Pure Functions
 * 
 * Handles worksite creation and terrain-based production calculations.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';

export interface WorksiteProduction {
  food?: number;
  lumber?: number;
  stone?: number;
  ore?: number;
}

/**
 * Worksite type to terrain compatibility and production
 */
export const WORKSITE_CONFIG: Record<string, {
  validTerrains: string[];
  production: (terrain: string) => WorksiteProduction;
}> = {
  'Farmstead': {
    validTerrains: ['plains', 'forest', 'hills', 'swamp'],
    production: (terrain) => ({ food: terrain === 'plains' ? 2 : 1 })
  },
  'Logging Camp': {
    validTerrains: ['forest'],
    production: () => ({ lumber: 2 })
  },
  'Quarry': {
    validTerrains: ['hills', 'mountains'],
    production: () => ({ stone: 2 })
  },
  'Mine': {
    validTerrains: ['mountains'],
    production: () => ({ ore: 2 })
  },
  'Bog Mine': {
    validTerrains: ['swamp'],
    production: () => ({ ore: 1 })
  }
};

/**
 * Get valid worksite types for a terrain
 * 
 * @param terrain - Terrain type
 * @returns Array of valid worksite type names
 */
export function getValidWorksiteTypes(terrain: string): string[] {
  const normalizedTerrain = terrain?.toLowerCase() || '';
  return Object.entries(WORKSITE_CONFIG)
    .filter(([_, config]) => config.validTerrains.includes(normalizedTerrain))
    .map(([type, _]) => type);
}

/**
 * Get production for a worksite type on specific terrain
 * 
 * @param worksiteType - Type of worksite
 * @param terrain - Terrain type
 * @returns Production object or null if invalid
 */
export function getWorksiteProduction(
  worksiteType: string,
  terrain: string
): WorksiteProduction | null {
  const config = WORKSITE_CONFIG[worksiteType];
  if (!config) return null;
  
  const normalizedTerrain = terrain?.toLowerCase() || '';
  if (!config.validTerrains.includes(normalizedTerrain)) return null;
  
  return config.production(normalizedTerrain);
}

/**
 * Apply worksite creation to a hex (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @param hexId - Hex ID to create worksite on
 * @param worksiteType - Type of worksite to create
 * @returns True if successful
 */
export function applyCreateWorksite(
  kingdom: KingdomData,
  hexId: string,
  worksiteType: string
): boolean {
  const hex = kingdom.hexes?.find(h => h.id === hexId);
  if (!hex) return false;
  
  // Auto-convert Mine to Bog Mine on swamp
  let finalType = worksiteType;
  if (worksiteType === 'Mine' && hex.terrain?.toLowerCase() === 'swamp') {
    finalType = 'Bog Mine';
  }
  
  hex.worksite = { type: finalType };
  return true;
}

/**
 * Get hexes eligible for worksite creation
 * 
 * @param kingdom - Kingdom data
 * @param faction - Faction to check (default: player)
 * @returns Array of eligible hexes with their valid worksite types
 */
export function getWorksiteEligibleHexes(
  kingdom: KingdomData,
  faction: string = PLAYER_KINGDOM
): Array<{ hex: any; validTypes: string[] }> {
  return (kingdom.hexes || [])
    .filter(h => h.claimedBy === faction && !h.worksite)
    .map(hex => ({
      hex,
      validTypes: getValidWorksiteTypes(hex.terrain || '')
    }))
    .filter(item => item.validTypes.length > 0);
}

/**
 * Calculate total worksite production for kingdom
 * 
 * @param kingdom - Kingdom data
 * @param faction - Faction to calculate for (default: player)
 * @returns Total production by resource type
 */
export function calculateTotalWorksiteProduction(
  kingdom: KingdomData,
  faction: string = PLAYER_KINGDOM
): WorksiteProduction {
  const total: WorksiteProduction = { food: 0, lumber: 0, stone: 0, ore: 0 };
  
  for (const hex of kingdom.hexes || []) {
    if (hex.claimedBy !== faction || !hex.worksite) continue;
    
    const production = getWorksiteProduction(hex.worksite.type, hex.terrain || '');
    if (production) {
      total.food = (total.food || 0) + (production.food || 0);
      total.lumber = (total.lumber || 0) + (production.lumber || 0);
      total.stone = (total.stone || 0) + (production.stone || 0);
      total.ore = (total.ore || 0) + (production.ore || 0);
    }
  }
  
  return total;
}

/**
 * Score terrain by production value, weighted by current needs
 * Used to prioritize which hexes to claim/develop
 * 
 * @param terrain - Terrain type
 * @param currentProduction - Current production levels
 * @returns Score (higher = more valuable)
 */
export function scoreTerrainByProductionNeed(
  terrain: string,
  currentProduction: WorksiteProduction
): number {
  const t = (terrain || 'plains').toLowerCase();
  
  // Target production levels - value drops off as we approach these
  const needLumber = Math.max(0, 6 - (currentProduction.lumber || 0));
  const needStone = Math.max(0, 4 - (currentProduction.stone || 0)) * 2;  // Stone is rarer
  const needOre = Math.max(0, 3 - (currentProduction.ore || 0)) * 3;      // Ore is rarest
  const needFood = Math.max(0, 8 - (currentProduction.food || 0));
  
  switch (t) {
    case 'forest':
      return 2 * needLumber + 2 * needFood;
    case 'hills':
      return 2 * needStone + 1 * needFood;
    case 'mountains':
      return 2 * needStone + 2 * needOre;
    case 'plains':
      return 2 * needFood;
    case 'swamp':
      return 1 * needFood + 1 * needOre;
    default:
      return 1;
  }
}

