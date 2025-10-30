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
    'Hospitality': 'fa-glass-cheers',
    'Commerce': 'fa-coins',
    'Diplomacy': 'fa-handshake',
    'Food Storage': 'fa-warehouse',
    'Fortifications': 'fa-castle',
    'Justice': 'fa-balance-scale',
    'Logistics': 'fa-boxes',
    'Revenue': 'fa-hand-holding-usd'
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
    ore: 'fa-mountain',
    fame: 'fa-star'
  };
  return icons[resource] || 'fa-box';
}

/**
 * Get color CSS variable for a resource/stat type
 * Uses centralized icon color variables from variables.css
 */
export function getResourceColor(resource: string): string {
  const colors: Record<string, string> = {
    // Resources
    gold: 'var(--icon-gold)',
    food: 'var(--icon-food)',
    lumber: 'var(--icon-lumber)',
    stone: 'var(--icon-stone)',
    ore: 'var(--icon-ore)',
    
    // Stats
    fame: 'var(--icon-fame)',
    unrest: 'var(--icon-unrest-minor)',
    prison: 'var(--icon-prison)'
  };
  return colors[resource] || 'var(--text-primary)';
}

/**
 * Get icon for settlement status indicators
 */
export function getSettlementStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'mapped': 'fa-map-marker-alt',
    'unmapped': 'fa-map-marker-alt-slash',
    'hex': 'far fa-hexagon',  // Unfilled/empty hex
    'road': 'fa-road',
    'unfed': 'fa-wheat-awn'  // Use existing food icon
  };
  return icons[status] || 'fa-circle';
}

/**
 * Get icon for a terrain type
 */
export function getTerrainIcon(terrain: string): string {
  const icons: Record<string, string> = {
    plains: 'fa-seedling',
    forest: 'fa-tree',
    hills: 'fa-hill-rockslide',
    mountains: 'fa-mountain',
    swamp: 'fa-water',
    desert: 'fa-sun',
    lake: 'fa-water',
    river: 'fa-water',
    coast: 'fa-water',
    unknown: 'fa-question'
  };
  return icons[terrain.toLowerCase()] || 'fa-map';
}

/**
 * Get color for a terrain type (CSS hex format)
 */
export function getTerrainColor(terrain: string): string {
  const colors: Record<string, string> = {
    plains: '#90C650',
    forest: '#228B22',
    hills: '#8B7355',
    mountains: '#808080',
    swamp: '#6B8E23',
    desert: '#EDC9AF',
    water: '#4682B4',
    lake: '#4682B4',
    river: '#4682B4',
    coast: '#5F9EA0',
    unknown: '#666666'
  };
  return colors[terrain.toLowerCase()] || '#888888';
}

/**
 * Re-export color constants from styles/colors.ts
 * This maintains backwards compatibility for existing imports
 */
export {
  TERRAIN_OVERLAY_COLORS,
  MAP_HEX_STYLES,
  TERRITORY_BORDER_COLORS,
  ROAD_COLORS,
  ICON_SHADOW_COLOR
} from '../../../styles/colors';

/**
 * Capitalize each word in skill names
 */
export function capitalizeSkills(skills: string[]): string[] {
  return skills.map(skill => 
    skill.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  );
}

/**
 * Format skills array as comma-separated string with capitalization
 */
export function formatSkillsString(skills: string[]): string {
  return capitalizeSkills(skills).join(', ');
}

/**
 * Get badge class for outcome type
 */
export function getOutcomeBadgeClass(outcome: string): string {
  switch (outcome) {
    case 'criticalSuccess':
      return 'badge-crit-success';
    case 'success':
      return 'badge-success';
    case 'failure':
      return 'badge-failure';
    case 'criticalFailure':
      return 'badge-crit-failure';
    default:
      return 'badge-neutral';
  }
}

/**
 * Get badge label for outcome type
 */
export function getOutcomeBadgeLabel(outcome: string): string {
  switch (outcome) {
    case 'criticalSuccess':
      return 'Crit Success';
    case 'success':
      return 'Success';
    case 'failure':
      return 'Failure';
    case 'criticalFailure':
      return 'Crit Fail';
    default:
      return outcome;
  }
}
