/**
 * Structure Presentation Utilities
 * 
 * Pure UI presentation helpers for displaying structure information.
 * These utilities handle formatting, icons, and display logic without
 * any business logic or state management.
 */

import type { Structure, ResourceCost, StructureEffects } from '../../../models/Structure';
import { getCategoryDisplayName, StructureCategory } from '../../../models/Structure';

/**
 * Resource icon and color configuration
 */
export const resourceConfig: Record<string, { icon: string; color: string }> = {
  food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
  lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
  stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
  ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
  gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' },
  luxuries: { icon: 'fa-gem', color: 'var(--color-purple)' }
};

/**
 * Category icon mapping
 */
export const categoryIcons: Record<string, string> = {
  'Crime & Intrigue': 'fa-mask',
  'Civic & Governance': 'fa-landmark',
  'Military & Training': 'fa-sword',
  'Crafting & Trade': 'fa-hammer',
  'Knowledge & Magic': 'fa-book-sparkles',
  'Faith & Nature': 'fa-leaf',
  'Medicine & Healing': 'fa-heart-pulse',
  'Performance & Culture': 'fa-masks-theater',
  'Exploration & Wilderness': 'fa-compass',
  'Food Storage': 'fa-wheat-awn',
  'Fortifications': 'fa-castle',
  'Logistics': 'fa-boxes-stacked',
  'Commerce': 'fa-coins',
  'Culture': 'fa-theater-masks',
  'Revenue': 'fa-sack-dollar',
  'Justice': 'fa-gavel',
  'Diplomacy': 'fa-handshake'
};

/**
 * Get the icon for a resource type
 */
export function getResourceIcon(resource: string): string {
  return resourceConfig[resource]?.icon || 'fa-box';
}

/**
 * Get the color for a resource type
 */
export function getResourceColor(resource: string): string {
  return resourceConfig[resource]?.color || 'var(--text-primary)';
}

/**
 * Get the icon for a structure category
 */
export function getCategoryIcon(category: string | StructureCategory): string {
  const displayName = typeof category === 'string' 
    ? category 
    : getCategoryDisplayName(category);
  return categoryIcons[displayName] || 'fa-cube';
}

/**
 * Format a resource cost for display
 */
export function formatResourceCost(cost: ResourceCost): string[] {
  const formatted: string[] = [];
  
  for (const [resource, amount] of Object.entries(cost)) {
    if (amount && amount > 0) {
      formatted.push(`${amount} ${resource}`);
    }
  }
  
  return formatted.length > 0 ? formatted : ['Free'];
}

/**
 * Format structure effects for display
 */
export function formatStructureEffects(effects: StructureEffects): string[] {
  const formatted: string[] = [];
  
  if (effects.goldPerTurn) {
    formatted.push(`+${effects.goldPerTurn} Gold/turn`);
  }
  
  if (effects.unrestReductionPerTurn) {
    formatted.push(`-${effects.unrestReductionPerTurn} Unrest/turn`);
  }
  
  if (effects.foodStorage) {
    formatted.push(`+${effects.foodStorage} Food Storage`);
  }
  
  if (effects.famePerTurn) {
    formatted.push(`+${effects.famePerTurn} Fame/turn`);
  }
  
  if (effects.armySupportBonus) {
    formatted.push(`+${effects.armySupportBonus} Army Support`);
  }
  
  if (effects.imprisonedUnrestCapacity) {
    formatted.push(`Hold ${effects.imprisonedUnrestCapacity} Imprisoned Unrest`);
  }
  
  return formatted;
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: number): string {
  return `T${tier}`;
}

/**
 * Get tier description
 */
export function getTierDescription(tier: number): string {
  const descriptions: Record<number, string> = {
    1: 'Basic structures available to all settlements',
    2: 'Improved structures requiring a Town or larger',
    3: 'Advanced structures requiring a City or larger',
    4: 'Elite structures requiring a Metropolis'
  };
  
  return descriptions[tier] || `Tier ${tier} structures`;
}

/**
 * Check if a structure has any cost
 */
export function hasResourceCost(cost: ResourceCost): boolean {
  return Object.values(cost).some(amount => amount && amount > 0);
}

/**
 * Get a display-friendly structure type label
 */
export function getStructureTypeLabel(type: 'skill' | 'support'): string {
  return type === 'skill' ? 'Skill Structure' : 'Support Structure';
}

/**
 * Extract unique skills from structures in a category
 */
export function extractCategorySkills(structures: Structure[]): string[] {
  const skills = new Set<string>();
  
  structures.forEach(structure => {
    if (structure.effects?.skillsSupported) {
      structure.effects.skillsSupported.forEach(skill => {
        // Capitalize first letter
        const capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
        skills.add(capitalizedSkill);
      });
    }
  });
  
  return Array.from(skills).sort();
}

/**
 * Group structures by tier
 */
export function groupStructuresByTier(structures: Structure[]): Map<number, Structure[]> {
  const tiers = new Map<number, Structure[]>();
  
  structures.forEach(structure => {
    const tier = structure.tier || 1;
    if (!tiers.has(tier)) {
      tiers.set(tier, []);
    }
    tiers.get(tier)!.push(structure);
  });
  
  // Sort structures within each tier by name
  tiers.forEach((tierStructures) => {
    tierStructures.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return tiers;
}

/**
 * Filter structures by search query
 */
export function filterStructuresBySearch(
  structures: Structure[], 
  query: string
): Structure[] {
  if (!query.trim()) return structures;
  
  const lowerQuery = query.toLowerCase();
  
  return structures.filter(structure => 
    structure.name.toLowerCase().includes(lowerQuery) ||
    structure.effect?.toLowerCase().includes(lowerQuery) ||
    structure.special?.toLowerCase().includes(lowerQuery) ||
    structure.traits?.some(trait => trait.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get unique categories from structures
 */
export function getUniqueCategories(structures: Structure[]): string[] {
  const categories = new Set<string>();
  
  structures.forEach(structure => {
    const displayName = getCategoryDisplayName(structure.category);
    if (displayName) {
      categories.add(displayName);
    }
  });
  
  return Array.from(categories).sort();
}

/**
 * Separate structures by type
 */
export function separateStructuresByType(structures: Structure[]): {
  skill: Structure[];
  support: Structure[];
} {
  return {
    skill: structures.filter(s => s.type === 'skill'),
    support: structures.filter(s => s.type === 'support')
  };
}
