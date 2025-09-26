// Kingdom State management for PF2e Kingdom Lite
// Auto-converted and fixed from KingdomState.kt

import { Hex } from './Hex';
import type { KingdomEvent } from './Events';
import type { Settlement } from './Settlement';
import { SettlementTier, SettlementTierConfig } from './Settlement';
import type { KingdomModifier } from './Modifiers';

// Re-export for backward compatibility
export { SettlementTier, SettlementTierConfig };
export type { Settlement };

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
  PHASE_VI = 'Phase VI: Upkeep'
}

/**
 * Turn phase configuration
 */
export const TurnPhaseConfig = {
  [TurnPhase.PHASE_I]: { displayName: 'Kingdom Status', description: 'Gain Fame and apply ongoing modifiers' },
  [TurnPhase.PHASE_II]: { displayName: 'Resources', description: 'Collect resources and revenue' },
  [TurnPhase.PHASE_III]: { displayName: 'Unrest & Incidents', description: 'Calculate unrest and resolve incidents' },
  [TurnPhase.PHASE_IV]: { displayName: 'Events', description: 'Resolve kingdom events' },
  [TurnPhase.PHASE_V]: { displayName: 'Actions', description: 'Perform kingdom actions' },
  [TurnPhase.PHASE_VI]: { displayName: 'Upkeep', description: 'Pay consumption, support costs, and end turn' }
};


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
  
  // Cached production values - calculated once when hexes change
  cachedProduction: Map<string, number> = new Map();
  cachedProductionByHex: Array<[Hex, Map<string, number>]> = [];
  
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
  
  // Modifiers and effects (from unresolved events, trade agreements, etc.)
  modifiers: KingdomModifier[] = [];
  
  /**
   * Update cached production values - should be called whenever hexes change
   * This calculates production once and stores it for reuse
   */
  updateCachedProduction(): void {
    // Clear existing cache
    this.cachedProduction.clear();
    this.cachedProductionByHex = [];
    
    console.log('Updating production cache for', this.hexes.length, 'hexes');
    
    // Calculate and cache production for each hex
    this.hexes.forEach(hex => {
      if (hex.worksite) {
        console.log(`Processing hex ${hex.id}:`, {
          terrain: hex.terrain,
          worksite: hex.worksite.type,
          hasSpecialTrait: hex.hasSpecialTrait
        });
        
        const hexProduction = hex.getProduction();
        
        // Store in by-hex cache
        if (hexProduction.size > 0) {
          this.cachedProductionByHex.push([hex, hexProduction]);
          console.log(`  Production:`, Object.fromEntries(hexProduction));
        }
        
        // Aggregate into total production cache
        hexProduction.forEach((amount, resource) => {
          this.cachedProduction.set(
            resource, 
            (this.cachedProduction.get(resource) || 0) + amount
          );
        });
      }
    });
    
    console.log('Production cache updated:', {
      total: Object.fromEntries(this.cachedProduction),
      hexCount: this.cachedProductionByHex.length,
      hexesWithWorksites: this.hexes.filter(h => h.worksite).length
    });
  }
  
  /**
   * Get total resource production (uses cached values)
   * Returns cached production or calculates if cache is empty
   */
  calculateProduction(): Map<string, number> {
    // If cache is empty, update it
    if (this.cachedProduction.size === 0) {
      this.updateCachedProduction();
    }
    return new Map(this.cachedProduction);
  }
  
  /**
   * Get detailed production breakdown by hex (uses cached values)
   */
  getProductionByHex(): Array<[Hex, Map<string, number>]> {
    // If cache is empty, update it
    if (this.cachedProductionByHex.length === 0 && this.hexes.some(h => h.worksite)) {
      this.updateCachedProduction();
    }
    return this.cachedProductionByHex;
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
