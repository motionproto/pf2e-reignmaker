import type { Structure, StructureCategory } from '../../../models/Structure';
import { getCategoryDisplayName } from '../../../models/Structure';
import { structuresService } from '../../../services/structures';

/**
 * Business logic for structure-related components
 * These functions perform data transformations and calculations
 */

/**
 * Extract unique skills from structures in a category
 */
export function extractCategorySkills(structures: Structure[]): string[] {
  const skillsSet = new Set<string>();
  
  structures.forEach(structure => {
    if (structure.effects?.skillsSupported) {
      structure.effects.skillsSupported.forEach((skill: string) => {
        skillsSet.add(skill);
      });
    }
  });
  
  return Array.from(skillsSet).sort();
}

/**
 * Group structures by tier
 */
export function groupStructuresByTier(structures: Structure[]): Map<number, Structure[]> {
  const grouped = new Map<number, Structure[]>();
  
  structures.forEach(structure => {
    const tier = structure.tier || 1;
    if (!grouped.has(tier)) {
      grouped.set(tier, []);
    }
    grouped.get(tier)!.push(structure);
  });
  
  // Sort structures within each tier alphabetically
  grouped.forEach(tierStructures => {
    tierStructures.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
}

/**
 * Separate structures into skill and support types
 */
export function separateStructuresByType(structures: Structure[]): {
  skill: Structure[];
  support: Structure[];
} {
  const skill: Structure[] = [];
  const support: Structure[] = [];
  
  structures.forEach(structure => {
    if (structure.type === 'skill') {
      skill.push(structure);
    } else if (structure.type === 'support') {
      support.push(structure);
    }
  });
  
  return { skill, support };
}

/**
 * Get unique categories from structures
 */
export function getUniqueCategories(structures: Structure[]): string[] {
  const categories = new Set<string>();
  
  structures.forEach(structure => {
    if (structure.category) {
      // Handle both enum and string types
      const categoryValue = structure.category as StructureCategory;
      const displayCategory = getCategoryDisplayName(categoryValue);
      categories.add(displayCategory);
    }
  });
  
  return Array.from(categories).sort();
}

/**
 * Get all categories from all structures in the game
 * Use this to show all categories even if none are currently available
 */
export function getAllCategories(): string[] {
  const allStructures = structuresService.getAllStructures();
  return getUniqueCategories(allStructures);
}
