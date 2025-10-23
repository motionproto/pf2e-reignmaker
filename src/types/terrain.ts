/**
 * Terrain Type Definitions for Kingdom Hexes
 * 
 * Defines all valid terrain types that can exist in the kingdom.
 * Water provides automatic road benefits and supports fishing (farmstead worksite).
 */

/**
 * Valid terrain types for kingdom hexes
 */
export type TerrainType = 
  | 'plains'     // Farmstead (2 food)
  | 'forest'     // Logging Camp (2 lumber) OR Farmstead (2 food)
  | 'hills'      // Quarry (1 stone) OR Farmstead (1 food)
  | 'mountains'  // Mine (1 ore) OR Quarry (1 stone)
  | 'swamp'      // Hunting/Fishing Camp (1 food) OR Mine/Bog Mine (1 ore) (wetlands → swamp on import)
  | 'desert'     // Oasis Farm (1 food, requires Oasis trait)
  | 'water';     // Automatic road + Optional Farmstead/Fishing (1 food)

/**
 * Travel difficulty types (for future movement mechanics)
 * Based on Kingmaker module's travel property
 */
export type TravelDifficulty = 
  | 'open'                    // Normal movement speed
  | 'difficult'               // Difficult terrain (1/2 speed)
  | 'greater-difficult'       // Greater difficult terrain (1/4 speed)
  | 'water';                  // Water travel (requires boats/swimming)

/**
 * Check if a terrain type is water-based
 */
export function isWaterTerrain(terrain: string | null | undefined): boolean {
  if (!terrain) return false;
  return terrain.toLowerCase() === 'water';
}

/**
 * Normalize travel difficulty from Kingmaker module format
 */
export function normalizeTravelDifficulty(travel: string | null | undefined): TravelDifficulty {
  if (!travel) return 'open';
  
  const normalized = travel.toLowerCase().trim();
  
  switch (normalized) {
    case 'open':
    case 'normal':
      return 'open';
    
    case 'difficult':
    case 'difficult terrain':
      return 'difficult';
    
    case 'greater difficult':
    case 'greater-difficult':
    case 'greater difficult terrain':
      return 'greater-difficult';
    
    case 'water':
      return 'water';
    
    default:
      console.warn(`Unknown travel difficulty: "${travel}", defaulting to open`);
      return 'open';
  }
}

/**
 * Normalize terrain string to TerrainType
 * Handles various aliases and formats from external sources (e.g., Kingmaker module)
 */
export function normalizeTerrainType(terrain: string | null | undefined): TerrainType {
  if (!terrain) return 'plains';
  
  const normalized = terrain.toLowerCase().trim();
  
  switch (normalized) {
    // Plains variants
    case 'plains':
    case 'plain':
    case 'grassland':
    case 'grasslands':
      return 'plains';
    
    // Forest variants
    case 'forest':
    case 'forests':
    case 'wood':
    case 'woods':
      return 'forest';
    
    // Hills variants
    case 'hill':
    case 'hills':
    case 'highland':
    case 'highlands':
      return 'hills';
    
    // Mountain variants
    case 'mountain':
    case 'mountains':
    case 'mount':
      return 'mountains';
    
    // Swamp/Wetlands variants
    case 'swamp':
    case 'swamps':
    case 'wetland':
    case 'wetlands':
    case 'marsh':
    case 'marshes':
    case 'bog':
      return 'swamp';
    
    // Desert variants
    case 'desert':
    case 'deserts':
    case 'badlands':
      return 'desert';
    
    // Water variants (NEW)
    case 'water':
    case 'lake':
    case 'ocean':
    case 'sea':
      return 'water';
    
    // Default fallback
    default:
      console.warn(`Unknown terrain type: "${terrain}", defaulting to plains`);
      return 'plains';
  }
}
