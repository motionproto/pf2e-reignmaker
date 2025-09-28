import type { Structure, StructureCategory } from '../../../models/Structure';
import { getCategoryDisplayName } from '../../../models/Structure';

/**
 * Get icon for a structure category
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Civic & Governance': 'fa-landmark',
    'Crafting & Trade': 'fa-hammer',
    'Crime & Intrigue': 'fa-user-secret',
    'Exploration & Wilderness': 'fa-compass',
    'Faith & Nature': 'fa-leaf',
    'Knowledge & Magic': 'fa-book',
    'Medicine & Healing': 'fa-medkit',
    'Military & Training': 'fa-shield-alt',
    'Performance & Culture': 'fa-theater-masks',
    'Commerce': 'fa-coins',
    'Culture': 'fa-palette',
    'Diplomacy': 'fa-handshake',
    'Food Storage': 'fa-warehouse',
    'Fortifications': 'fa-castle',
    'Justice': 'fa-balance-scale'
  };
  return icons[category] || 'fa-building';
}

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
 * Get label for a tier
 */
export function getTierLabel(tier: number): string {
  const labels: Record<number, string> = {
    1: 'Tier I',
    2: 'Tier II',
    3: 'Tier III',
    4: 'Tier IV'
  };
  return labels[tier] || `Tier ${tier}`;
}

/**
 * Get icon for a resource type
 */
export function getResourceIcon(resource: string): string {
  const icons: Record<string, string> = {
    gold: 'fa-coins',
    food: 'fa-wheat-awn',
    lumber: 'fa-tree',
    stone: 'fa-cube',
    ore: 'fa-gem'
  };
  return icons[resource] || 'fa-box';
}

/**
 * Get color class for a resource type
 */
export function getResourceColor(resource: string): string {
  const colors: Record<string, string> = {
    gold: 'resource-gold',
    food: 'resource-food',
    lumber: 'resource-lumber',
    stone: 'resource-stone',
    ore: 'resource-ore'
  };
  return colors[resource] || 'resource-default';
}
