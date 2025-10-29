/**
 * Faction - Represents diplomatic relationships with external powers
 * Based on Reignmaker Lite diplomacy rules
 */

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
}

/**
 * Attitude level configuration
 */
export const AttitudeLevelConfig: Record<AttitudeLevel, {
  displayName: string;
  icon: string;
  color: string;
  description: string;
}> = {
  'Hostile': {
    displayName: 'Hostile',
    icon: 'fa-angry',
    color: '#ff6b6b',
    description: 'Actively opposes your kingdom'
  },
  'Unfriendly': {
    displayName: 'Unfriendly',
    icon: 'fa-frown',
    color: '#ffa500',
    description: 'Suspicious or hostile to your interests'
  },
  'Indifferent': {
    displayName: 'Indifferent',
    icon: 'fa-meh',
    color: '#ffd93d',
    description: 'No strong feelings either way'
  },
  'Friendly': {
    displayName: 'Friendly',
    icon: 'fa-smile',
    color: '#90ee90',
    description: 'Generally positive relationship'
  },
  'Helpful': {
    displayName: 'Helpful',
    icon: 'fa-grin-hearts',
    color: '#4caf50',
    description: 'Actively supports your kingdom\'s interests'
  }
};

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
 * Create a default faction
 */
export function createDefaultFaction(name: string, attitude: AttitudeLevel = 'Indifferent'): Faction {
  return {
    id: `faction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    attitude,
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
    enemies: []
  };
}
