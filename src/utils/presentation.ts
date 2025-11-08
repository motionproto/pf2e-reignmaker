/**
 * UI Presentation Constants
 * Centralized definitions for icons, colors, and other UI elements
 */

/**
 * Faction attitude level icon definitions
 * Used for displaying faction attitudes across the application
 */
export const FACTION_ATTITUDE_ICONS = {
  Hostile: 'fa-angry',
  Unfriendly: 'fa-frown',
  Indifferent: 'fa-meh',
  Friendly: 'fa-smile',
  Helpful: 'fa-grin-hearts'
} as const;

/**
 * Faction attitude level colors
 * CSS color values for faction attitudes
 */
export const FACTION_ATTITUDE_COLORS = {
  Hostile: '#ff6b6b',
  Unfriendly: '#ffa500',
  Indifferent: '#ffd93d',
  Friendly: '#90ee90',
  Helpful: '#4caf50'
} as const;

/**
 * Faction attitude level display names
 */
export const FACTION_ATTITUDE_NAMES = {
  Hostile: 'Hostile',
  Unfriendly: 'Unfriendly',
  Indifferent: 'Indifferent',
  Friendly: 'Friendly',
  Helpful: 'Helpful'
} as const;

/**
 * Faction attitude level descriptions
 */
export const FACTION_ATTITUDE_DESCRIPTIONS = {
  Hostile: 'Actively opposes your kingdom',
  Unfriendly: 'Suspicious or hostile to your interests',
  Indifferent: 'No strong feelings either way',
  Friendly: 'Generally positive relationship',
  Helpful: 'Actively supports your kingdom\'s interests'
} as const;

/**
 * Default faction colors from data/factions/default-factions.json
 * Pre-defined colors for default factions
 */
export const DEFAULT_FACTION_COLORS = {
  'default-swordlords-restov': '#d94d4d',
  'default-steelscale-kobolds': '#4dd9d9',
  'default-house-surtova': '#a6d94d',
  'default-house-lodovka': '#a64dd9',
  'default-house-lebeda': '#d9c34d',
  'default-house-garess': '#4d73d9',
  'default-house-medvyed': '#4dd973',
  'default-house-orlovsky': '#d94da6',
  'default-church-erastil': '#d98e4d',
  'default-church-abadar': '#4d8ed9',
  'default-church-gorum': '#4dd98e',
  'default-church-pharasma': '#d94dc3'
} as const;

export type FactionAttitude = keyof typeof FACTION_ATTITUDE_ICONS;

/**
 * Equipment type icon definitions
 * Used for army equipment display across the application
 */
export const EQUIPMENT_ICONS = {
  armor: 'fa-solid fa-shield',
  runes: 'fa-solid fa-ankh',
  weapons: 'fa-solid fa-sword',
  equipment: 'fa-solid fa-suitcase'
} as const;

/**
 * Equipment type names
 */
export const EQUIPMENT_NAMES = {
  armor: 'Armor',
  runes: 'Runes',
  weapons: 'Weapons',
  equipment: 'Enhanced Gear'
} as const;

/**
 * Equipment type bonus descriptions
 */
export const EQUIPMENT_BONUSES = {
  armor: {
    normal: '+1 AC',
    critical: '+2 AC'
  },
  runes: {
    normal: '+1 to hit',
    critical: '+2 to hit'
  },
  weapons: {
    normal: '+1 damage dice',
    critical: '+2 damage dice'
  },
  equipment: {
    normal: '+1 to saves',
    critical: '+2 to saves'
  }
} as const;

export type EquipmentType = keyof typeof EQUIPMENT_ICONS;
