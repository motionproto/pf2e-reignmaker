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
