/**
 * Create Worksite Validator
 * Validates that a hex can have a worksite created on it
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { isHexClaimedByPlayer, getHex, hexHasSettlement } from '../shared/hexValidation';

/**
 * All possible worksite types
 */
export const WORKSITE_TYPES = ['Farmstead', 'Logging Camp', 'Mine', 'Quarry'] as const;
export type WorksiteType = typeof WORKSITE_TYPES[number];

/**
 * Terrain compatibility rules for worksites
 * Based on production.ts and WorksiteEditorHandlers
 */
const WORKSITE_TERRAIN_RULES: Record<string, string[]> = {
  'Farmstead': ['plains', 'forest', 'hills', 'swamp', 'desert', 'water'], // Universal
  'Logging Camp': ['forest'],
  'Mine': ['mountains', 'swamp'], // Mountains (regular mine) or Swamp (bog mine)
  'Quarry': ['hills', 'mountains']
};

/**
 * Check if a worksite type is valid for the given terrain
 */
function isValidTerrainForWorksite(terrain: string, worksiteType: string): boolean {
  const normalizedTerrain = terrain.toLowerCase();
  const allowedTerrains = WORKSITE_TERRAIN_RULES[worksiteType];
  
  if (!allowedTerrains) {
    return false;
  }
  
  return allowedTerrains.includes(normalizedTerrain);
}

/**
 * Get user-friendly error message for invalid worksite placement
 */
function getInvalidPlacementMessage(worksiteType: string, terrain: string): string {
  switch (worksiteType) {
    case 'Logging Camp':
      return `Logging Camps can only be built in forest terrain`;
    case 'Mine':
      return `Mines can only be built in mountains or swamp terrain (bog mines)`;
    case 'Quarry':
      return `Quarries can only be built in hills or mountains`;
    case 'Farmstead':
      return `Farmsteads can be built on most terrain types`;
    default:
      return `Cannot place ${worksiteType} on ${terrain} terrain`;
  }
}

/**
 * Get valid worksite types for a given hex based on terrain
 * Used by WorksiteTypeSelector component
 * 
 * @param hexId - The hex ID to check
 * @returns Array of valid worksite type names
 */
export function getValidWorksiteTypes(hexId: string): WorksiteType[] {
  const kingdom = get(kingdomData);
  const hex = getHex(hexId, kingdom);
  
  if (!hex || !hex.terrain) {
    return [];
  }
  
  const terrain = hex.terrain.toLowerCase();
  
  return WORKSITE_TYPES.filter(type => 
    isValidTerrainForWorksite(terrain, type)
  );
}

/**
 * Validate if a hex can have a worksite created (for pipeline use)
 * 
 * @param hexId - The hex ID to validate
 * @param worksiteType - The type of worksite to create (from metadata)
 * @returns boolean - true if hex can have worksite created
 */
export function validateCreateWorksiteForPipeline(hexId: string, worksiteType?: string): boolean {
  const kingdom = get(kingdomData);
  
  // Find the hex
  const hex = getHex(hexId, kingdom);
  
  if (!hex) {
    return false;
  }
  
  // Must be claimed territory
  if (!isHexClaimedByPlayer(hexId, kingdom)) {
    return false;
  }
  
  // Cannot have a settlement (settlements have their own structures)
  if (hexHasSettlement(hexId, kingdom)) {
    return false;
  }
  
  // Cannot already have a worksite (one per hex)
  if (hex.worksite) {
    return false;
  }
  
  // If worksite type is provided, validate terrain compatibility
  if (worksiteType && !isValidTerrainForWorksite(hex.terrain || '', worksiteType)) {
    return false;
  }
  
  return true;
}

/**
 * Detailed validation with user messages (for UI)
 * 
 * @param hexId - The hex ID to validate
 * @param worksiteType - The type of worksite to create
 * @returns Object with valid flag and optional message
 */
export async function validateCreateWorksite(
  hexId: string, 
  worksiteType: string
): Promise<{ valid: boolean; message?: string }> {
  const kingdom = get(kingdomData);
  
  // Find the hex
  const hex = getHex(hexId, kingdom);
  
  if (!hex) {
    return { valid: false, message: 'Hex not found' };
  }
  
  // Must be claimed territory
  if (!isHexClaimedByPlayer(hexId, kingdom)) {
    return { valid: false, message: 'Must be in claimed territory' };
  }
  
  // Cannot have a settlement
  if (hexHasSettlement(hexId, kingdom)) {
    return { valid: false, message: 'Cannot build worksites in settlement hexes' };
  }
  
  // Cannot already have a worksite
  if (hex.worksite) {
    return { valid: false, message: `Hex already has a ${hex.worksite.type} (only one worksite per hex)` };
  }
  
  // Validate terrain compatibility
  if (!isValidTerrainForWorksite(hex.terrain || '', worksiteType)) {
    const message = getInvalidPlacementMessage(worksiteType, hex.terrain || 'unknown');
    return { valid: false, message };
  }
  
  // Success message
  const terrainName = hex.terrain || 'terrain';
  return { 
    valid: true, 
    message: `Build ${worksiteType} on ${terrainName} hex` 
  };
}
