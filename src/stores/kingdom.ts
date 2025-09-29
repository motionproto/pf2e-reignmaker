import { writable, derived, get } from 'svelte/store';
import { KingdomState } from '../models/KingdomState';
import type { KingdomEvent } from '../models/Events';
import type { Settlement, Army, BuildProject } from '../models/KingdomState';
import type { KingdomModifier } from '../models/Modifiers';
import { modifierService } from '../services/ModifierService';
import { economicsService } from '../services/economics';
import { territoryService } from '../services/territory';

// Main kingdom state store - contains only pure kingdom data
export const kingdomState = writable(new KingdomState());

// Re-export viewingPhase from gameState for backward compatibility
export { viewingPhase } from './gameState';

// Territory metrics derived store
export const territoryMetrics = derived(kingdomState, $state => {
    return territoryService.getTerritoryMetrics($state.hexes);
});

// Derived stores for common calculations using cached values
export const totalProduction = derived(kingdomState, $state => {
    // Use cached production from KingdomState (calculated once when hexes change)
    const productionObj: Record<string, number> = {};
    $state.cachedProduction.forEach((value, key) => {
        if (value > 0) {
            productionObj[key] = value;
        }
    });
    return productionObj;
});

export const foodConsumption = derived(kingdomState, $state => {
    const consumption = economicsService.calculateConsumption($state.settlements, $state.armies);
    return consumption.totalFood;
});

export const foodConsumptionBreakdown = derived(kingdomState, $state => {
    const consumption = economicsService.calculateConsumption($state.settlements, $state.armies);
    return [consumption.settlementFood, consumption.armyFood];
});

export const armySupport = derived(kingdomState, $state => {
    const support = economicsService.calculateMilitarySupport($state.settlements, $state.armies);
    return support.capacity;
});

export const unsupportedArmies = derived(kingdomState, $state => {
    const support = economicsService.calculateMilitarySupport($state.settlements, $state.armies);
    return support.unsupported;
});

export const foodShortage = derived(kingdomState, $state => {
    const consumption = economicsService.calculateConsumption($state.settlements, $state.armies);
    const foodSupply = economicsService.checkFoodSupply($state.resources.get('food') || 0, consumption);
    return foodSupply.shortage;
});

// Actions to modify kingdom state - all ensure immutability for proper change detection
// Helper function to create a new KingdomState with updated properties
function cloneKingdomState(state: KingdomState): KingdomState {
    const newState = Object.create(Object.getPrototypeOf(state));
    return Object.assign(newState, state);
}

export function updateKingdomStat(stat: keyof KingdomState, value: any) {
    console.log(`[Store Update] Setting ${stat} to ${value}`);
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        (newState as any)[stat] = value;
        return newState;
    });
}

export function modifyResource(resource: string, amount: number) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        const currentAmount = state.resources.get(resource) || 0;
        newState.resources = new Map(state.resources);
        newState.resources.set(resource, currentAmount + amount);
        return newState;
    });
}

export function setResource(resource: string, amount: number) {
    console.log(`[Store Update] Setting resource '${resource}' to ${amount}`);
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.resources = new Map(state.resources);
        newState.resources.set(resource, amount);
        return newState;
    });
}

export function addSettlement(settlement: Settlement) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.settlements = [...state.settlements, settlement];
        return newState;
    });
}

export function removeSettlement(name: string) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.settlements = state.settlements.filter(s => s.name !== name);
        return newState;
    });
}

// Settlement update functions for better component usage
export function updateSettlement(settlementId: string, updates: Partial<Settlement>) {
    kingdomState.update(state => {
        const index = state.settlements.findIndex(s => s.id === settlementId);
        
        if (index === -1) {
            return state; // Settlement not found, return unchanged
        }
        
        const newState = cloneKingdomState(state);
        // Create new settlements array with updated settlement
        newState.settlements = [...state.settlements];
        newState.settlements[index] = { ...newState.settlements[index], ...updates };
        
        return newState;
    });
}

export function updateSettlementName(settlementId: string, name: string) {
    updateSettlement(settlementId, { name });
}

export function updateSettlementStructures(settlementId: string, structureIds: string[]) {
    updateSettlement(settlementId, { structureIds });
}

export function addStructureToSettlement(settlementId: string, structureId: string) {
    kingdomState.update(state => {
        const index = state.settlements.findIndex(s => s.id === settlementId);
        
        if (index === -1) {
            return state;
        }
        
        const newState = cloneKingdomState(state);
        newState.settlements = [...state.settlements];
        const settlement = { ...newState.settlements[index] };
        settlement.structureIds = [...settlement.structureIds, structureId];
        newState.settlements[index] = settlement;
        
        return newState;
    });
}

export function removeStructureFromSettlement(settlementId: string, structureId: string) {
    kingdomState.update(state => {
        const index = state.settlements.findIndex(s => s.id === settlementId);
        
        if (index === -1) {
            return state;
        }
        
        const newState = cloneKingdomState(state);
        newState.settlements = [...state.settlements];
        const settlement = { ...newState.settlements[index] };
        settlement.structureIds = settlement.structureIds.filter(id => id !== structureId);
        newState.settlements[index] = settlement;
        
        return newState;
    });
}

export function addArmy(army: Army) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.armies = [...state.armies, army];
        return newState;
    });
}

export function removeArmy(id: string) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.armies = state.armies.filter(a => a.id !== id);
        return newState;
    });
}

export function updateArmy(armyId: string, updates: Partial<Army>) {
    kingdomState.update(state => {
        const index = state.armies.findIndex(a => a.id === armyId);
        
        if (index === -1) {
            return state;
        }
        
        const newState = cloneKingdomState(state);
        newState.armies = [...state.armies];
        newState.armies[index] = { ...newState.armies[index], ...updates };
        
        return newState;
    });
}

export function addBuildProject(project: BuildProject) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.buildQueue = [...state.buildQueue, project];
        return newState;
    });
}

export function removeBuildProject(index: number) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.buildQueue = [...state.buildQueue];
        newState.buildQueue.splice(index, 1);
        return newState;
    });
}

export function setCurrentEvent(event: KingdomEvent | null) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.currentEvent = event;
        return newState;
    });
}

export function addContinuousEvent(event: KingdomEvent) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.continuousEvents = [...state.continuousEvents, event];
        return newState;
    });
}

export function removeContinuousEvent(index: number) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.continuousEvents = [...state.continuousEvents];
        newState.continuousEvents.splice(index, 1);
        return newState;
    });
}

// Re-export phase management functions from gameState for backward compatibility
export { 
    setCurrentPhase,
    setViewingPhase,
    advancePhase,
    markPhaseStepCompleted,
    resetPhaseSteps,
    incrementTurn
} from './gameState';

// Modifier management functions
export function addModifier(modifier: KingdomModifier) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        
        // Set the start turn from the current turn (would need to get from gameState)
        if (modifier.startTurn === undefined) {
            // This would be set properly by the phase that adds the modifier
            modifier.startTurn = 0;
        }
        
        // Also add to service for management
        modifierService.addModifier(modifier);
        
        // Add to state immutably
        newState.modifiers = [...state.modifiers, modifier];
        
        return newState;
    });
}

export function removeModifier(modifierId: string) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        newState.modifiers = state.modifiers.filter(m => m.id !== modifierId);
        modifierService.removeModifier(modifierId);
        return newState;
    });
}

export function processModifiers(currentTurn: number) {
    const effects = modifierService.processTurnStart(currentTurn);
    
    kingdomState.update(state => {
        // Apply resource effects
        if (effects.gold) modifyResource('gold', effects.gold);
        if (effects.food) modifyResource('food', effects.food);
        if (effects.lumber) modifyResource('lumber', effects.lumber);
        if (effects.stone) modifyResource('stone', effects.stone);
        if (effects.ore) modifyResource('ore', effects.ore);
        if (effects.luxuries) modifyResource('luxuries', effects.luxuries);
        if (effects.resources) {
            // Generic resource loss - distribute evenly or apply to gold
            modifyResource('gold', effects.resources);
        }
        
        // Apply stat effects
        if (effects.unrest) state.unrest += effects.unrest;
        if (effects.fame) state.fame += effects.fame;
        
        // Check for expired modifiers
        const expiredIds = modifierService.checkExpiredModifiers(currentTurn);
        expiredIds.forEach(id => removeModifier(id));
        
        // Sync service with state
        modifierService.importModifiers(state.modifiers);
        
        return state;
    });
    
    return effects;
}

export function getActiveModifiers(): KingdomModifier[] {
    const state = get(kingdomState);
    return state.modifiers;
}

export function resolveModifier(modifierId: string, skill: string, rollResult: number) {
    const result = modifierService.resolveModifier(modifierId, skill, rollResult);
    
    if (result.removed) {
        removeModifier(modifierId);
    }
    
    return result;
}

// Function to load kingdom state from saved data
export function loadKingdomState(savedState: Partial<KingdomState>) {
    kingdomState.update(state => {
        // Create a new state object to ensure proper reactivity
        const newState = cloneKingdomState(state);
        
        // Merge the saved state into the new state
        Object.assign(newState, savedState);
        
        // Sync modifiers with service
        if (newState.modifiers) {
            modifierService.importModifiers(newState.modifiers);
        }
        
        return newState;
    });
}

// Function to get current kingdom state for saving
export function getCurrentKingdomState(): KingdomState {
    return get(kingdomState);
}

// Function to reset kingdom state to initial values
export function resetKingdomState() {
    kingdomState.set(new KingdomState());
}
