import type { Structure } from '../../../../../models/Structure';
import type { Settlement } from '../../../../../models/Settlement';
import { structuresService } from '../../../../../services/structures';
import { getCategoryDisplayName } from '../../../../../models/Structure';

/**
 * Get all structures for a selected category (both built and available)
 */
export function getCategoryStructures(
  selectedCategory: string,
  selectedSettlementId: string,
  settlements: Settlement[]
): Structure[] {
  if (!selectedCategory || !selectedSettlementId) return [];
  
  const settlement = settlements.find(s => s.id === selectedSettlementId);
  if (!settlement) return [];
  
  // Get all structures in this category
  const allInCategory = structuresService.getAllStructures()
    .filter(s => {
      if (!s.category) return false;
      const displayName = getCategoryDisplayName(s.category);
      return displayName === selectedCategory;
    })
    .sort((a, b) => (a.tier || 0) - (b.tier || 0));
  
  return allInCategory;
}

/**
 * Separate category structures into built and available
 */
export function separateBuiltAndAvailable(
  categoryStructures: Structure[],
  availableStructures: Structure[],
  selectedSettlementId: string,
  settlements: Settlement[]
): { built: Structure[], available: Structure[] } {
  if (!selectedSettlementId) return { built: [], available: [] };
  
  const settlement = settlements.find(s => s.id === selectedSettlementId);
  if (!settlement) return { built: [], available: [] };
  
  const built = categoryStructures.filter(s => 
    settlement.structureIds.includes(s.id)
  );
  
  const available = categoryStructures.filter(s => 
    availableStructures.some(av => av.id === s.id)
  );
  
  return { built, available };
}

/**
 * Filter structures to show only the next available tier per category
 * Rule: Show tier N+1 where N is the highest tier built in that category
 */
export function filterStructuresByNextTier(
  structures: Structure[],
  selectedSettlementId: string,
  settlements: Settlement[]
): Structure[] {
  if (!selectedSettlementId) return structures;
  
  const settlement = settlements.find(s => s.id === selectedSettlementId);
  if (!settlement) return structures;
  
  // Get all built structures in this settlement
  const builtStructures = structuresService.getAllStructures().filter(s =>
    settlement.structureIds.includes(s.id)
  );
  
  // Group available structures by category
  const structuresByCategory = new Map<string, Structure[]>();
  
  structures.forEach(structure => {
    if (!structure.category) return;
    const displayName = getCategoryDisplayName(structure.category);
    if (!structuresByCategory.has(displayName)) {
      structuresByCategory.set(displayName, []);
    }
    structuresByCategory.get(displayName)!.push(structure);
  });
  
  const result: Structure[] = [];
  
  // For each category, find the next tier to show
  structuresByCategory.forEach((categoryStructures, categoryName) => {
    // Find built structures in this category
    const builtInCategory = builtStructures.filter(s => {
      if (!s.category) return false;
      return getCategoryDisplayName(s.category) === categoryName;
    });
    
    // Find max tier (0 if none built)
    const maxTier = Math.max(
      0,
      ...builtInCategory.map(s => s.tier || 1)
    );
    
    // Get next tier structure (tier N+1, capped at tier 4)
    const nextTier = Math.min(maxTier + 1, 4);
    const nextTierStructure = categoryStructures.find(s => s.tier === nextTier);
    
    if (nextTierStructure) {
      result.push(nextTierStructure);
    }
  });
  
  return result;
}
