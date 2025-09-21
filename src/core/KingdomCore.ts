// Auto-converted and fixed from KingdomCore.kt
// Kingdom data model based on the simplified rules

/**
 * Fresh start - Kingdom data model based on the simplified rules
 */

export interface Kingdom {
  id: string;
  name: string;
  level: number;
  xp: number;
  currentTurn: number;
  gold: number;
  unrest: number;
  fame: number;
  resources: Resources;
  settlements: Settlement[];
  activeEvents: string[]; // Event IDs
  modifiers: Modifier[];
}

export interface Resources {
  food: number;
  lumber: number;
  ore: number;
  stone: number;
}

export interface Settlement {
  id: string;
  name: string;
  level: number;
  structures: string[]; // Structure IDs
}

export interface Modifier {
  source: string;
  type: string;
  value: number;
  duration: string;
  turns?: number;
  until?: string;
}

/**
 * Raw data types for JSON parsing - matching actual JSON schema
 */

// Structure JSON schema
export interface RawStructure {
  id: string;
  name: string;
  type: string;
  category: string;
  tier: number;
  effect: string | null;
  earnIncomeLevel: string | null;
  bonus: number | null;
  skills: string[] | null;
  construction: RawConstruction | null;
  traits: string[];
  special: string | null;
  upgradeFrom: string | null;
}

export interface RawConstruction {
  resources: RawResourceCost | null;
}

export interface RawResourceCost {
  lumber: number | null;
  stone: number | null;
  ore: number | null;
  food: number | null;
}

// Player Action JSON schema
export interface RawPlayerAction {
  id: string;
  name: string;
  category: string;
  description: string;
  skills: RawSkillOption[] | null;
  effects: RawActionEffects | null;
  special: string | null;
}

export interface RawSkillOption {
  skill: string;
  description: string;
}

export interface RawActionEffects {
  criticalSuccess: RawActionResult | null;
  success: RawActionResult | null;
  failure: RawActionResult | null;
  criticalFailure: RawActionResult | null;
}

export interface RawActionResult {
  description: string;
  modifiers: any; // Complex object, using any for now
}

// Event JSON schema
export interface RawEvent {
  id: string;
  name: string;
  description: string;
  traits: string[];
  location: string | null;
  modifier: number;
  resolution: string | null;
  resolvedOn: string[] | null;
  stages: RawEventStage[] | null;
  special: string | null;
}

export interface RawEventStage {
  skills: string[] | null;
  criticalSuccess: RawEventOutcome | null;
  success: RawEventOutcome | null;
  failure: RawEventOutcome | null;
  criticalFailure: RawEventOutcome | null;
}

export interface RawEventOutcome {
  msg: string;
  modifiers: RawEventModifier[] | null;
}

export interface RawEventModifier {
  type: string;
  name: string;
  value: number;
  selector: string;
  enabled: boolean;
  turns: number | null;
}

// Incident JSON schema
export interface RawIncident {
  id: string;
  name: string;
  tier: string;
  description: string;
  percentileMin: number;
  percentileMax: number;
  skillOptions: RawIncidentSkillOption[];
}

export interface RawIncidentSkillOption {
  skill: string;
  description: string;
  successEffect: string;
  failureEffect: string;
  criticalFailureExtra: string | null;
}

/**
 * Helper functions for Kingdom management
 */
export class KingdomHelper {
  /**
   * Calculate XP needed for next level
   */
  static getXPForLevel(level: number): number {
    // Levels 1-20 require 1000 XP each
    return level * 1000;
  }
  
  /**
   * Check if kingdom should level up
   */
  static checkLevelUp(kingdom: Kingdom): boolean {
    const xpNeeded = this.getXPForLevel(kingdom.level + 1);
    return kingdom.xp >= xpNeeded;
  }
  
  /**
   * Apply a level up to the kingdom
   */
  static levelUp(kingdom: Kingdom): void {
    kingdom.level++;
    // Additional level up benefits would be applied here
  }
  
  /**
   * Calculate total food consumption
   */
  static calculateFoodConsumption(kingdom: Kingdom): number {
    let totalFood = 0;
    
    // Each settlement level consumes 1 food
    kingdom.settlements.forEach(settlement => {
      totalFood += settlement.level;
    });
    
    // Additional consumption from armies, etc.
    
    return totalFood;
  }
  
  /**
   * Create a new kingdom
   */
  static createKingdom(name: string): Kingdom {
    return {
      id: `kingdom-${Date.now()}`,
      name: name,
      level: 1,
      xp: 0,
      currentTurn: 1,
      gold: 0,
      unrest: 0,
      fame: 0,
      resources: {
        food: 0,
        lumber: 0,
        ore: 0,
        stone: 0
      },
      settlements: [],
      activeEvents: [],
      modifiers: []
    };
  }
}
