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
    ore: 'fa-mountain'
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
    lake: '#4682B4',
    river: '#4682B4',
    coast: '#5F9EA0',
    unknown: '#666666'
  };
  return colors[terrain.toLowerCase()] || '#888888';
}

/**
 * Map overlay color definitions (PIXI hex format)
 * Used by ReignMakerMapLayer and overlay renderers
 */

/**
 * Terrain overlay colors (PIXI format with alpha)
 * Used for coloring terrain hexes on the map
 */
export const TERRAIN_OVERLAY_COLORS: Record<string, { color: number; alpha: number }> = {
  // Natural terrain
  'plains': { color: 0xFFCC00, alpha: 0.35 },        // Golden yellow/orange (food icon)
  'forest': { color: 0x228B22, alpha: 0.4 },         // Forest green
  'hills': { color: 0xA0826D, alpha: 0.35 },         // Tan brown
  'mountains': { color: 0x9BA5B5, alpha: 0.45 },     // Slate grey (mountain stone)
  'swamp': { color: 0x4A5D23, alpha: 0.45 },         // Dark olive
  'marsh': { color: 0x6B8E23, alpha: 0.4 },          // Olive drab
  'water': { color: 0x1E90FF, alpha: 0.5 },          // Dodger blue (unified for all water bodies)
  'desert': { color: 0xEDC9AF, alpha: 0.35 },        // Desert sand
  'tundra': { color: 0xE0E8F0, alpha: 0.35 },        // Pale blue-grey
  
  // Special terrain
  'ruins': { color: 0x8B8B83, alpha: 0.35 },         // Grey stone
  'cave': { color: 0x2F4F4F, alpha: 0.5 },           // Dark slate grey
  'wasteland': { color: 0x696969, alpha: 0.4 },      // Dim grey
  
  // Default fallback
  'default': { color: 0xCCCCCC, alpha: 0.25 }        // Light grey
};

/**
 * Default hex overlay styles for common use cases
 */
export const MAP_HEX_STYLES = {
  // Kingdom territory fill
  kingdomTerritory: {
    fillColor: 0x4169E1,    // Royal blue
    fillAlpha: 0.3,
    borderWidth: 0          // No border on territory fill
  },
  // Party-claimed territory (used in overlays)
  partyTerritory: {
    fillColor: 0x1E90FF,    // Dodger blue
    fillAlpha: 0.4,
    borderWidth: 0
  },
  // Hex selection during actions
  selection: {
    fillColor: 0xD2691E,    // Chocolate
    fillAlpha: 0.5,
    borderColor: 0xD2691E,
    borderWidth: 2,
    borderAlpha: 0.9
  },
  // General highlight
  highlight: {
    fillColor: 0xFFD700,    // Gold
    fillAlpha: 0.4,
    borderColor: 0xFFD700,
    borderWidth: 3,
    borderAlpha: 1.0
  },
  // Settlement hex highlights
  settlement: {
    fillColor: 0x00FFFF,    // Cyan
    fillAlpha: 0.5,
    borderColor: 0x00FFFF,
    borderWidth: 3,
    borderAlpha: 1.0
  }
} as const;

/**
 * Territory border/outline colors
 */
export const TERRITORY_BORDER_COLORS = {
  // Bright electric blue for territory outlines
  outline: 0x00D4FF,
  outlineAlpha: 1.0
} as const;

/**
 * Road rendering colors
 */
export const ROAD_COLORS = {
  // Road borders and shadows
  roadBorder: 0x000000,      // Black shadow/border
  roadBorderAlpha: 0.6,
  
  // Main road colors
  landRoad: 0x8B4513,        // Brown (dirt/stone roads)
  landRoadAlpha: 0.8,
  
  waterRoad: 0x4FC3F7,       // Light blue (bridges/ferries)
  waterRoadAlpha: 0.8,
  
  // Water crossing borders
  waterBorder: 0x1976D2,     // Darker blue
  waterBorderAlpha: 0.6
} as const;

/**
 * Icon shadow color (used for all map icons)
 */
export const ICON_SHADOW_COLOR = {
  color: 0x000000,           // Black
  alpha: 0.5                 // Semi-transparent
} as const;

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
