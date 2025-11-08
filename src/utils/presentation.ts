/**
 * UI Presentation Constants
 * Centralized definitions for icons, colors, and other UI elements
 */

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
