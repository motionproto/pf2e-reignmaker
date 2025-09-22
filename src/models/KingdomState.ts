// Kingdom State management for PF2e Kingdom Lite
// Auto-converted and fixed from KingdomState.kt

import { Hex } from './Hex';
import type { KingdomEvent } from './Events';

/**
 * Settlement tiers based on Reignmaker Lite rules
 */
export enum SettlementTier {
  VILLAGE = 'Village',
  TOWN = 'Town',
  CITY = 'City',
  METROPOLIS = 'Metropolis'
}

/**
 * Settlement tier configuration
 */
export const SettlementTierConfig = {
  [SettlementTier.VILLAGE]: { displayName: 'Village', maxStructures: 2, foodConsumption: 1, armySupport: 1 },
  [SettlementTier.TOWN]: { displayName: 'Town', maxStructures: 4, foodConsumption: 4, armySupport: 2 },
  [SettlementTier.CITY]: { displayName: 'City', maxStructures: 8, foodConsumption: 8, armySupport: 3 },
  [SettlementTier.METROPOLIS]: { displayName: 'Metropolis', maxStructures: Infinity, foodConsumption: 12, armySupport: 4 }
};

/**
 * Represents a settlement in the kingdom
 */
export interface Settlement {
  name: string;
  tier: SettlementTier;
  structureIds: string[]; // IDs of built structures
  connectedByRoads: boolean;
  
  // Computed properties
  foodConsumption?: number;
  armySupport?: number;
}

/**
 * Army representation
 */
export interface Army {
  id: string;
  name: string;
  level: number;
}

/**
 * Build project in queue
 */
export interface BuildProject {
  structureId: string;
  settlementName: string;
  progress: number;
  totalCost: Map<string, number>;
  remainingCost: Map<string, number>;
}

/**
 * Turn phases based on Reignmaker Lite rules
 */
export enum TurnPhase {
  PHASE_I = 'Phase I: Kingdom Status',
  PHASE_II = 'Phase II: Resources',
  PHASE_III = 'Phase III: Unrest & Incidents',
  PHASE_IV = 'Phase IV: Events',
  PHASE_V = 'Phase V: Actions',
  PHASE_VI = 'Phase VI: Resolution'
}

/**
 * Turn phase configuration
 */
export const TurnPhaseConfig = {
  [TurnPhase.PHASE_I]: { displayName: 'Phase I: Kingdom Status', description: 'Gain Fame and apply ongoing modifiers' },
  [TurnPhase.PHASE_II]: { displayName: 'Phase II: Resources', description: 'Collect resources and manage consumption' },
  [TurnPhase.PHASE_III]: { displayName: 'Phase III: Unrest & Incidents', description: 'Calculate unrest and resolve incidents' },
  [TurnPhase.PHASE_IV]: { displayName: 'Phase IV: Events', description: 'Resolve kingdom events' },
  [TurnPhase.PHASE_V]: { displayName: 'Phase V: Actions', description: 'Perform kingdom actions' },
  [TurnPhase.PHASE_VI]: { displayName: 'Phase VI: Resolution', description: 'End of turn cleanup' }
};

/**
 * Represents an ongoing modifier or effect
 */
export interface Modifier {
  name: string;
  description: string;
  effect: (state: KingdomState) => void;
  duration: number; // -1 for permanent, otherwise number of turns
  remainingTurns: number;
}

/**
 * Represents the current state of a kingdom
 * This class contains only pure kingdom data - what defines the kingdom itself.
 * Turn/phase management and UI state are handled separately in gameState.
 */
export class KingdomState {
  // Core Kingdom stats (Reignmaker Lite)
  unrest: number = 0;
  imprisonedUnrest: number = 0;  // Unrest that is stored and excluded from the sum
  fame: number = 0;
  
  // Resources
  resources: Map<string, number> = new Map([
    ['gold', 0],
    ['food', 0],
    ['lumber', 0],
    ['stone', 0],
    ['ore', 0]
  ]);
  
  // Territory and production - always kept up to date
  hexes: Hex[] = [];
  size: number = 0; // Total number of claimed hexes
  settlements: Settlement[] = [];
  
  // Worksite counts - always kept in sync with hexes
  worksiteCount: Map<string, number> = new Map([
    ['farmlands', 0],
    ['lumberCamps', 0],
    ['quarries', 0],
    ['mines', 0],
    ['bogMines', 0],
    ['huntingCamps', 0]
  ]);
  
  // Military
  armies: Army[] = [];
  
  // Construction
  buildQueue: BuildProject[] = [];
  
  // War status
  isAtWar: boolean = false;
  
  // Event management (events affect the kingdom directly)
  currentEvent: KingdomEvent | null = null;
  continuousEvents: KingdomEvent[] = [];
  
  // Modifiers and effects
  ongoingModifiers: Modifier[] = [];
  
  /**
   * Calculate total resource production from all hexes with worksites
   * Includes special traits that add +1 to production
   */
  calculateProduction(): Map<string, number> {
    const production = new Map<string, number>();
    
    this.hexes.forEach(hex => {
      const hexProduction = hex.getProduction();
      hexProduction.forEach((amount, resource) => {
        production.set(resource, (production.get(resource) || 0) + amount);
      });
    });
    
    return production;
  }
  
  /**
   * Get detailed production breakdown by hex
   */
  getProductionByHex(): Array<[Hex, Map<string, number>]> {
    return this.hexes
      .filter(hex => hex.worksite !== null && hex.worksite !== undefined)
      .map(hex => [hex, hex.getProduction()]);
  }
  
  /**
   * Get total food consumption for settlements and armies
   * According to Kingdom Rules:
   * - Village: 1 Food, Town: 4 Food, City: 8 Food, Metropolis: 12 Food
   * - Each army: 1 Food
   */
  getTotalFoodConsumption(): number {
    const settlementFood = this.settlements.reduce((sum, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return sum + (config ? config.foodConsumption : 0);
    }, 0);
    
    const armyFood = this.armies.length; // Each army consumes 1 food
    return settlementFood + armyFood;
  }
  
  /**
   * Get food consumption breakdown
   */
  getFoodConsumptionBreakdown(): [number, number] {
    const settlementFood = this.settlements.reduce((sum, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return sum + (config ? config.foodConsumption : 0);
    }, 0);
    
    const armyFood = this.armies.length;
    return [settlementFood, armyFood];
  }
  
  /**
   * Get total army support capacity
   * According to Kingdom Rules:
   * - Village: 1 Army, Town: 2 Armies, City: 3 Armies, Metropolis: 4 Armies
   */
  getTotalArmySupport(): number {
    return this.settlements.reduce((sum, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return sum + (config ? config.armySupport : 0);
    }, 0);
  }
  
  /**
   * Get number of unsupported armies
   */
  getUnsupportedArmies(): number {
    return Math.max(0, this.armies.length - this.getTotalArmySupport());
  }
  
  /**
   * Calculate food shortage for this turn
   */
  calculateFoodShortage(): number {
    const needed = this.getTotalFoodConsumption();
    const available = this.resources.get('food') || 0;
    return Math.max(0, needed - available);
  }
  
  /**
   * Process resource collection (Phase II Step 1)
   * Adds production from all hexes to kingdom resources
   */
  collectResources(): void {
    const production = this.calculateProduction();
    production.forEach((amount, resource) => {
      this.resources.set(resource, (this.resources.get(resource) || 0) + amount);
    });
  }
  
  /**
   * Process food consumption (Phase II Step 2)
   * Returns the amount of unrest generated from shortage
   */
  processFoodConsumption(): number {
    const totalNeeded = this.getTotalFoodConsumption();
    const currentFood = this.resources.get('food') || 0;
    
    if (currentFood < totalNeeded) {
      const shortage = totalNeeded - currentFood;
      this.resources.set('food', 0);
      this.unrest += shortage;
      return shortage; // Return shortage amount for reporting
    } else {
      this.resources.set('food', currentFood - totalNeeded);
      return 0; // No shortage
    }
  }
  
  /**
   * Clear non-storable resources at end of turn
   * Only Food and Gold can be stored between turns
   */
  clearNonStorableResources(): void {
    this.resources.set('lumber', 0);
    this.resources.set('stone', 0);
    this.resources.set('ore', 0);
  }
}
