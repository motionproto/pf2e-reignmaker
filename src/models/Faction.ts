/**
 * Faction - Represents diplomatic relationships with external powers
 * Based on Reignmaker Lite diplomacy rules
 */

import { generateFactionColor } from '../utils/FactionColorGenerator';

export type AttitudeLevel = 'Hostile' | 'Unfriendly' | 'Indifferent' | 'Friendly' | 'Helpful';

export interface NotablePerson {
  id: string;
  name: string;
  actorId?: string;       // Linked Foundry actor ID
}

export interface Faction {
  id: string;
  name: string;
  attitude: AttitudeLevel;
  color: string;          // Faction color (hex format: #RRGGBB) - auto-generated on creation
  goal: string;           // Strategic goal or objective (GM-only)
  notes: string;          // Public notes visible to all players
  gmNotes: string;        // GM-only private notes
  progressClock: {
    current: number;      // Current progress toward goal (GM-only)
    max: number;          // Maximum progress needed (GM-only)
  };
  
  // Detail page fields
  image?: string;         // Path to faction image (Foundry file path)
  description: string;    // Full faction description
  notablePeople: NotablePerson[];  // Important NPCs
  territory: {            // Territory/Economy/Religion/Fame
    territory: string;
    economy: string;
    religion: string;
    fame: string;
  };
  assets: string;         // Faction resources/assets
  quirks: string;         // Unique characteristics
  allies: string[];       // Array of ally names
  enemies: string[];      // Array of enemy names
  provinces: string[];    // Array of province names controlled by this faction
}

/**
 * Ordered attitude levels (best to worst)
 */
export const ATTITUDE_ORDER: AttitudeLevel[] = [
  'Helpful',
  'Friendly',
  'Indifferent',
  'Unfriendly',
  'Hostile'
];

/**
 * Create a default faction with auto-generated color
 */
export function createDefaultFaction(
  name: string, 
  attitude: AttitudeLevel = 'Indifferent',
  existingFactions: Faction[] = []
): Faction {
  // Extract existing colors
  const existingColors = existingFactions.map(f => f.color);
  
  return {
    id: `faction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    attitude,
    color: generateFactionColor(existingColors),  // Auto-generate contrasting color
    goal: '',
    notes: '',
    gmNotes: '',
    progressClock: {
      current: 0,
      max: 4
    },
    description: '',
    notablePeople: [],
    territory: {
      territory: '',
      economy: '',
      religion: '',
      fame: ''
    },
    assets: '',
    quirks: '',
    allies: [],
    enemies: [],
    provinces: []
  };
}
