/**
 * ResourceManagementService - Handles all resource-related business logic
 * 
 * This service manages resource production, consumption, decay,
 * and storage limits according to the kingdom rules.
 */

import type { KingdomState } from '../../models/KingdomState';
import type { Hex } from '../../models/Hex';
import type { Settlement } from '../../models/Settlement';

export interface ResourceConsumption {
    food: {
        settlements: number;
        armies: number;
        total: number;
    };
    shortage: number;
}

export interface ResourceDecay {
    lumber: number;
    stone: number;
    ore: number;
}

export class ResourceManagementService {
    
    /**
     * Calculate total resource production from all hexes
     */
    calculateProduction(kingdomState: KingdomState): Map<string, number> {
        return kingdomState.calculateProduction();
    }
    
    /**
     * Get detailed production breakdown by hex
     */
    getProductionBreakdown(kingdomState: KingdomState): Array<[Hex, Map<string, number>]> {
        return kingdomState.getProductionByHex();
    }
    
    /**
     * Calculate food consumption and shortage
     */
    calculateFoodConsumption(kingdomState: KingdomState): ResourceConsumption {
        const [settlementFood, armyFood] = kingdomState.getFoodConsumptionBreakdown();
        const total = settlementFood + armyFood;
        const available = kingdomState.resources.get('food') || 0;
        const shortage = Math.max(0, total - available);
        
        return {
            food: {
                settlements: settlementFood,
                armies: armyFood,
                total
            },
            shortage
        };
    }
    
    /**
     * Process food consumption and return unrest generated
     */
    processFoodConsumption(kingdomState: KingdomState): number {
        const consumption = this.calculateFoodConsumption(kingdomState);
        const available = kingdomState.resources.get('food') || 0;
        
        if (consumption.food.total > available) {
            // Not enough food - generate unrest
            kingdomState.resources.set('food', 0);
            return consumption.shortage;
        } else {
            // Deduct food
            kingdomState.resources.set('food', available - consumption.food.total);
            return 0;
        }
    }
    
    /**
     * Get resources that will decay at end of turn
     */
    getResourceDecay(kingdomState: KingdomState): ResourceDecay {
        return {
            lumber: kingdomState.resources.get('lumber') || 0,
            stone: kingdomState.resources.get('stone') || 0,
            ore: kingdomState.resources.get('ore') || 0
        };
    }
    
    /**
     * Apply resource decay (clear non-storable resources)
     * Only Gold and Food can be stored between turns
     */
    applyResourceDecay(kingdomState: KingdomState): ResourceDecay {
        const decay = this.getResourceDecay(kingdomState);
        
        // Clear non-storable resources
        kingdomState.resources.set('lumber', 0);
        kingdomState.resources.set('stone', 0);
        kingdomState.resources.set('ore', 0);
        
        return decay;
    }
    
    /**
     * Check if kingdom has sufficient resources for a cost
     */
    canAfford(kingdomState: KingdomState, cost: Map<string, number>): boolean {
        for (const [resource, amount] of cost) {
            const available = kingdomState.resources.get(resource) || 0;
            if (available < amount) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Deduct resources from kingdom (with validation)
     */
    deductResources(
        kingdomState: KingdomState, 
        cost: Map<string, number>
    ): { success: boolean; missing?: Map<string, number> } {
        // First check if we can afford
        const missing = new Map<string, number>();
        
        for (const [resource, amount] of cost) {
            const available = kingdomState.resources.get(resource) || 0;
            if (available < amount) {
                missing.set(resource, amount - available);
            }
        }
        
        if (missing.size > 0) {
            return { success: false, missing };
        }
        
        // Deduct the resources
        for (const [resource, amount] of cost) {
            const available = kingdomState.resources.get(resource) || 0;
            kingdomState.resources.set(resource, available - amount);
        }
        
        return { success: true };
    }
    
    /**
     * Add resources to kingdom with bounds checking
     */
    addResources(kingdomState: KingdomState, resources: Map<string, number>): void {
        for (const [resource, amount] of resources) {
            const current = kingdomState.resources.get(resource) || 0;
            
            // Special handling for fame (max 3)
            if (resource === 'fame') {
                kingdomState.fame = Math.min(3, Math.max(0, kingdomState.fame + amount));
            } else {
                // Regular resources (no negative values)
                kingdomState.resources.set(resource, Math.max(0, current + amount));
            }
        }
    }
    
    /**
     * Get resource storage capacity (if implemented)
     */
    getStorageCapacity(kingdomState: KingdomState): Map<string, number> {
        // Default unlimited storage for now
        // Could be enhanced with warehouse structures
        return new Map([
            ['gold', Infinity],
            ['food', Infinity],
            ['lumber', Infinity],
            ['stone', Infinity],
            ['ore', Infinity]
        ]);
    }
    
    /**
     * Calculate resource upkeep costs
     */
    calculateUpkeepCosts(kingdomState: KingdomState): Map<string, number> {
        const costs = new Map<string, number>();
        
        // Army upkeep (1 gold per unsupported army)
        const unsupportedArmies = kingdomState.getUnsupportedArmies();
        if (unsupportedArmies > 0) {
            costs.set('gold', unsupportedArmies);
        }
        
        // Building maintenance could be added here
        
        return costs;
    }
    
    /**
     * Process resource collection for a turn
     */
    collectTurnResources(kingdomState: KingdomState): Map<string, number> {
        const production = this.calculateProduction(kingdomState);
        
        // Add production to kingdom resources
        for (const [resource, amount] of production) {
            const current = kingdomState.resources.get(resource) || 0;
            kingdomState.resources.set(resource, current + amount);
        }
        
        return production;
    }
    
    /**
     * Get summary of resource changes for a phase
     */
    getResourceSummary(kingdomState: KingdomState): {
        current: Map<string, number>;
        production: Map<string, number>;
        consumption: ResourceConsumption;
        decay: ResourceDecay;
        upkeep: Map<string, number>;
    } {
        return {
            current: new Map(kingdomState.resources),
            production: this.calculateProduction(kingdomState),
            consumption: this.calculateFoodConsumption(kingdomState),
            decay: this.getResourceDecay(kingdomState),
            upkeep: this.calculateUpkeepCosts(kingdomState)
        };
    }
    
    /**
     * Apply project costs to resources
     */
    applyProjectCosts(
        kingdomState: KingdomState,
        projectCosts: Map<string, number>
    ): { 
        applied: Map<string, number>; 
        remaining: Map<string, number> 
    } {
        const applied = new Map<string, number>();
        const remaining = new Map<string, number>();
        
        for (const [resource, cost] of projectCosts) {
            const available = kingdomState.resources.get(resource) || 0;
            
            if (available >= cost) {
                // Can pay full cost
                applied.set(resource, cost);
                remaining.set(resource, 0);
                kingdomState.resources.set(resource, available - cost);
            } else {
                // Partial payment
                applied.set(resource, available);
                remaining.set(resource, cost - available);
                kingdomState.resources.set(resource, 0);
            }
        }
        
        return { applied, remaining };
    }
}

// Export singleton instance
export const resourceManagementService = new ResourceManagementService();
