import { writable, derived, get } from 'svelte/store';
import { KingdomState } from '../models/KingdomState';
import type { KingdomEvent } from '../models/Events';
import type { Settlement, Army, BuildProject, Modifier } from '../models/KingdomState';

// Main kingdom state store - contains only pure kingdom data
export const kingdomState = writable(new KingdomState());

// Re-export viewingPhase from gameState for backward compatibility
export { viewingPhase } from './gameState';

// Derived stores for common calculations
export const totalProduction = derived(kingdomState, $state => {
    // If we have calculated income from the sync, use it
    const income = ($state as any).income;
    if (income && income instanceof Map && income.size > 0) {
        // Convert Map to object for compatibility with existing code
        const incomeObj: Record<string, number> = {};
        income.forEach((value: number, key: string) => {
            if (value > 0) {
                incomeObj[key] = value;
            }
        });
        return incomeObj;
    }
    // Fallback to calculated production
    const production = $state.calculateProduction();
    const productionObj: Record<string, number> = {};
    production.forEach((value, key) => {
        if (value > 0) {
            productionObj[key] = value;
        }
    });
    return productionObj;
});

export const foodConsumption = derived(kingdomState, $state => 
    $state.getTotalFoodConsumption()
);

export const foodConsumptionBreakdown = derived(kingdomState, $state => 
    $state.getFoodConsumptionBreakdown()
);

export const armySupport = derived(kingdomState, $state => 
    $state.getTotalArmySupport()
);

export const unsupportedArmies = derived(kingdomState, $state => 
    $state.getUnsupportedArmies()
);

export const foodShortage = derived(kingdomState, $state => 
    $state.calculateFoodShortage()
);

// Actions to modify kingdom state
export function updateKingdomStat(stat: keyof KingdomState, value: any) {
    kingdomState.update(state => {
        (state as any)[stat] = value;
        return state;
    });
}

export function modifyResource(resource: string, amount: number) {
    kingdomState.update(state => {
        const currentAmount = state.resources.get(resource) || 0;
        state.resources.set(resource, currentAmount + amount);
        return state;
    });
}

export function setResource(resource: string, amount: number) {
    kingdomState.update(state => {
        state.resources.set(resource, amount);
        return state;
    });
}

export function addSettlement(settlement: Settlement) {
    kingdomState.update(state => {
        state.settlements.push(settlement);
        return state;
    });
}

export function removeSettlement(name: string) {
    kingdomState.update(state => {
        state.settlements = state.settlements.filter(s => s.name !== name);
        return state;
    });
}

export function addArmy(army: Army) {
    kingdomState.update(state => {
        state.armies.push(army);
        return state;
    });
}

export function removeArmy(id: string) {
    kingdomState.update(state => {
        state.armies = state.armies.filter(a => a.id !== id);
        return state;
    });
}

export function addBuildProject(project: BuildProject) {
    kingdomState.update(state => {
        state.buildQueue.push(project);
        return state;
    });
}

export function removeBuildProject(index: number) {
    kingdomState.update(state => {
        state.buildQueue.splice(index, 1);
        return state;
    });
}

export function setCurrentEvent(event: KingdomEvent | null) {
    kingdomState.update(state => {
        state.currentEvent = event;
        return state;
    });
}

export function addContinuousEvent(event: KingdomEvent) {
    kingdomState.update(state => {
        state.continuousEvents.push(event);
        return state;
    });
}

export function removeContinuousEvent(index: number) {
    kingdomState.update(state => {
        state.continuousEvents.splice(index, 1);
        return state;
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

export function collectResources() {
    kingdomState.update(state => {
        state.collectResources();
        return state;
    });
}

export function processFoodConsumption(): number {
    let shortage = 0;
    kingdomState.update(state => {
        shortage = state.processFoodConsumption();
        return state;
    });
    return shortage;
}

export function clearNonStorableResources() {
    kingdomState.update(state => {
        state.clearNonStorableResources();
        return state;
    });
}

export function addModifier(modifier: Modifier) {
    kingdomState.update(state => {
        state.ongoingModifiers.push(modifier);
        return state;
    });
}

export function removeModifier(index: number) {
    kingdomState.update(state => {
        state.ongoingModifiers.splice(index, 1);
        return state;
    });
}

// Function to load kingdom state from saved data
export function loadKingdomState(savedState: Partial<KingdomState>) {
    kingdomState.update(state => {
        return Object.assign(state, savedState);
    });
}

// Function to get current kingdom state for saving
export function getCurrentKingdomState(): KingdomState {
    return get(kingdomState);
}
