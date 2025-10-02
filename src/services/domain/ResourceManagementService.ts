/**
 * ResourceManagementService - Handles all resource-related business logic
 * 
 * This service manages resource production, consumption, decay,
 * and storage limits according to the kingdom rules.
 * 
 * Updated to use KingdomData interface (architecture-compliant)
 */

import type { KingdomData } from '../../actors/KingdomActor';

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
    calculateProduction(kingdomData: KingdomData): Record<string, number> {
        return { ...kingdomData.cachedProduction };
    }
    
    /**
     * Calculate food consumption and shortage
     */
    calculateFoodConsumption(kingdomData: KingdomData): ResourceConsumption {
        // Calculate settlement food consumption
        const settlementFood = kingdomData.settlements.reduce((sum, settlement) => {
            return sum + this.getSettlementFoodConsumption(settlement.tier);
        }, 0);
        
        const armyFood = kingdomData.armies.length; // Each army consumes 1 food
        const total = settlementFood + armyFood;
        const available = kingdomData.resources.food || 0;
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
     * Get food consumption for settlement tier
     */
    private getSettlementFoodConsumption(tier: string): number {
        switch (tier) {
            case 'village': return 1;
            case 'town': return 4;
            case 'city': return 8;
            case 'metropolis': return 12;
            default: return 0;
        }
    }
    
    /**
     * Get resources that will decay at end of turn
     */
    getResourceDecay(kingdomData: KingdomData): ResourceDecay {
        return {
            lumber: kingdomData.resources.lumber || 0,
            stone: kingdomData.resources.stone || 0,
            ore: kingdomData.resources.ore || 0
        };
    }
    
    /**
     * Check if kingdom has sufficient resources for a cost
     */
    canAfford(kingdomData: KingdomData, cost: Record<string, number>): boolean {
        for (const [resource, amount] of Object.entries(cost)) {
            const available = kingdomData.resources[resource] || 0;
            if (available < amount) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Get resource storage capacity
     */
    getStorageCapacity(kingdomData: KingdomData): Record<string, number> {
        // Default unlimited storage for now
        // Could be enhanced with warehouse structures
        return {
            gold: Infinity,
            food: Infinity,
            lumber: Infinity,
            stone: Infinity,
            ore: Infinity,
            luxuries: Infinity
        };
    }
    
    /**
     * Calculate resource upkeep costs
     */
    calculateUpkeepCosts(kingdomData: KingdomData): Record<string, number> {
        const costs: Record<string, number> = {};
        
        // Army upkeep (1 gold per unsupported army)
        const totalArmySupport = kingdomData.settlements.reduce((sum, settlement) => {
            return sum + this.getSettlementArmySupport(settlement.tier);
        }, 0);
        
        const unsupportedArmies = Math.max(0, kingdomData.armies.length - totalArmySupport);
        if (unsupportedArmies > 0) {
            costs.gold = unsupportedArmies;
        }
        
        return costs;
    }
    
    /**
     * Get army support capacity for settlement tier
     */
    private getSettlementArmySupport(tier: string): number {
        switch (tier) {
            case 'village': return 1;
            case 'town': return 2;
            case 'city': return 3;
            case 'metropolis': return 4;
            default: return 0;
        }
    }
    
    /**
     * Get summary of resource changes for a phase
     */
    getResourceSummary(kingdomData: KingdomData): {
        current: Record<string, number>;
        production: Record<string, number>;
        consumption: ResourceConsumption;
        decay: ResourceDecay;
        upkeep: Record<string, number>;
    } {
        return {
            current: { ...kingdomData.resources },
            production: this.calculateProduction(kingdomData),
            consumption: this.calculateFoodConsumption(kingdomData),
            decay: this.getResourceDecay(kingdomData),
            upkeep: this.calculateUpkeepCosts(kingdomData)
        };
    }
    
    /**
     * Calculate if there are unsupported armies
     */
    getUnsupportedArmies(kingdomData: KingdomData): number {
        const totalArmySupport = kingdomData.settlements.reduce((sum, settlement) => {
            return sum + this.getSettlementArmySupport(settlement.tier);
        }, 0);
        
        return Math.max(0, kingdomData.armies.length - totalArmySupport);
    }
    
    /**
     * Get missing resources for a cost
     */
    getMissingResources(kingdomData: KingdomData, cost: Record<string, number>): Record<string, number> {
        const missing: Record<string, number> = {};
        
        for (const [resource, amount] of Object.entries(cost)) {
            const available = kingdomData.resources[resource] || 0;
            if (available < amount) {
                missing[resource] = amount - available;
            }
        }
        
        return missing;
    }
    
    /**
     * Calculate net resource change for a turn
     */
    calculateNetResourceChange(kingdomData: KingdomData): Record<string, number> {
        const production = this.calculateProduction(kingdomData);
        const consumption = this.calculateFoodConsumption(kingdomData);
        const upkeep = this.calculateUpkeepCosts(kingdomData);
        const decay = this.getResourceDecay(kingdomData);
        
        const net: Record<string, number> = { ...production };
        
        // Subtract food consumption
        net.food = (net.food || 0) - consumption.food.total;
        
        // Subtract upkeep costs
        for (const [resource, amount] of Object.entries(upkeep)) {
            net[resource] = (net[resource] || 0) - amount;
        }
        
        // Account for decay (non-storable resources are lost)
        net.lumber = (net.lumber || 0) - decay.lumber;
        net.stone = (net.stone || 0) - decay.stone;
        net.ore = (net.ore || 0) - decay.ore;
        
        return net;
    }
}

// Export singleton instance
export const resourceManagementService = new ResourceManagementService();
