/**
 * BuildStructureDialog component-specific logic
 * Data transformations and helpers for build structure dialog
 */

import type { Structure } from '../../../models/Structure';
import type { Settlement } from '../../../models/Settlement';
import { getCategoryDisplayName } from '../../../models/Structure';
import { extractCategorySkills } from './structureLogic';

/**
 * Get skills for a specific category
 */
export function getSkillsForCategory(
  category: string,
  structures: Structure[]
): string[] {
  const categoryStructures = structures.filter(s => {
    if (!s.category) return false;
    const displayName = getCategoryDisplayName(s.category);
    return displayName === category;
  });
  return extractCategorySkills(categoryStructures);
}

/**
 * Check if a category is a skill structure category
 */
export function isSkillCategory(category: string, skillCategories: string[]): boolean {
  return skillCategories.includes(category);
}

/**
 * Separate structures into built and available for a settlement
 */
export function separateBuiltAndAvailable(
  categoryStructures: Structure[],
  settlement: Settlement,
  availableStructures: Structure[]
): { built: Structure[], available: Structure[] } {
  const built = categoryStructures.filter(s => 
    settlement.structureIds.includes(s.id)
  );
  
  const available = categoryStructures.filter(s => 
    availableStructures.some(av => av.id === s.id)
  );
  
  return { built, available };
}
