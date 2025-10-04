/**
 * General presentation utilities for kingdom view
 * Icon and color mappings used across multiple components
 */

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
