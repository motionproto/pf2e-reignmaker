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
 * Get the highest tier built in a category
 */
export function getMaxTierBuiltInCategory(
  categoryName: string,
  selectedSettlementId: string,
  settlements: Settlement[]
): number {
  if (!selectedSettlementId) return 0;
  
  const settlement = settlements.find(s => s.id === selectedSettlementId);
  if (!settlement) return 0;
  
  // Get all built structures in this settlement
  const builtStructures = structuresService.getAllStructures().filter(s =>
    settlement.structureIds.includes(s.id)
  );
  
  // Find built structures in this category
  const builtInCategory = builtStructures.filter(s => {
    if (!s.category) return false;
    return getCategoryDisplayName(s.category) === categoryName;
  });
  
  // Find max tier (0 if none built)
  return Math.max(
    0,
    ...builtInCategory.map(s => s.tier || 1)
  );
}

/**
 * Separate structures into buildable and locked based on tier progression
 * Rule: Can build tier N+1 where N is the highest tier built in that category
 * Locked structures are shown but greyed out
 */
export function separateByBuildability(
  structures: Structure[],
  categoryName: string,
  selectedSettlementId: string,
  settlements: Settlement[]
): { buildable: Structure[], locked: Structure[] } {
  if (!selectedSettlementId) return { buildable: structures, locked: [] };
  
  const maxTierBuilt = getMaxTierBuiltInCategory(categoryName, selectedSettlementId, settlements);
  const nextTier = maxTierBuilt + 1;
  
  const buildable: Structure[] = [];
  const locked: Structure[] = [];
  
  structures.forEach(structure => {
    const structureTier = structure.tier || 1;
    if (structureTier <= nextTier) {
      buildable.push(structure);
    } else {
      locked.push(structure);
    }
  });
  
  return { buildable, locked };
}
