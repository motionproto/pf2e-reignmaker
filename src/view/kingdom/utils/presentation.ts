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
