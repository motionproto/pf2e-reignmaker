import { writable, derived, get } from 'svelte/store';
import { KingdomState } from '../models/KingdomState';
import type { KingdomEvent } from '../models/Events';
import type { Settlement, Army, BuildProject } from '../models/KingdomState';
import type { KingdomModifier } from '../models/Modifiers';
import { modifierService } from '../services/domain/modifiers/ModifierService';
import { economicsService } from '../services/economics';
import { territoryService } from '../services/territory';
import { initializePlayerActions } from './gameState';
import { TurnPhase } from '../models/KingdomState';

// Define required steps for each phase
const PHASE_REQUIRED_STEPS: Map<TurnPhase, string[]> = new Map([
  [TurnPhase.PHASE_I, ['gain-fame', 'apply-modifiers']],  // Status phase
  [TurnPhase.PHASE_II, ['resources-collect']],  // Resources phase
  [TurnPhase.PHASE_III, ['calculate-unrest']],  // Unrest phase
  [TurnPhase.PHASE_IV, ['resolve-event']],  // Events phase
  [TurnPhase.PHASE_V, []],  // Actions phase - no required steps, optional actions
  [TurnPhase.PHASE_VI, ['upkeep-food', 'upkeep-military', 'upkeep-build']],  // Resolution/Upkeep phase
]);

// Main kingdom state store - contains only pure kingdom data
export const kingdomState = writable(new KingdomState());

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
    // Create a completely new KingdomState instance
    const newState = new KingdomState();
    
    // Copy all properties, ensuring new references for collections
    newState.unrest = state.unrest;
    newState.imprisonedUnrest = state.imprisonedUnrest;
    newState.fame = state.fame;
    newState.size = state.size;
    newState.isAtWar = state.isAtWar;
    
    // Create new Map instances
    newState.resources = new Map(state.resources);
    newState.worksiteCount = new Map(state.worksiteCount);
    newState.cachedProduction = new Map(state.cachedProduction);
    newState.playerActions = new Map(state.playerActions);
    newState.phaseStepsCompleted = new Map(state.phaseStepsCompleted);  // FIX: Copy phase steps
    
    // Create new array instances with spread
    newState.hexes = [...state.hexes];
    newState.settlements = [...state.settlements];
    newState.armies = [...state.armies];
    newState.buildQueue = [...state.buildQueue];
    newState.continuousEvents = [...state.continuousEvents];
    newState.modifiers = [...state.modifiers];
    newState.cachedProductionByHex = [...state.cachedProductionByHex];
    
    // Copy object references (these should be replaced when modified)
    newState.currentEvent = state.currentEvent;
    
    // Copy turn and phase management properties
    newState.currentTurn = state.currentTurn;
    newState.currentPhase = state.currentPhase;
    newState.phasesCompleted = new Set(state.phasesCompleted);  // FIX: Copy phases completed
    newState.oncePerTurnActions = new Set(state.oncePerTurnActions);
    newState.eventDC = state.eventDC;
    
    // Copy event/incident tracking
    newState.currentEventId = state.currentEventId;
    newState.currentIncidentId = state.currentIncidentId;
    newState.incidentRoll = state.incidentRoll;
    newState.eventStabilityRoll = state.eventStabilityRoll;
    newState.eventRollDC = state.eventRollDC;
    newState.eventTriggered = state.eventTriggered;
    
    return newState;
}

// General-purpose update function that handles all update patterns
export function updateKingdom(updater: (state: KingdomState) => void) {
    kingdomState.update(state => {
        const newState = cloneKingdomState(state);
        updater(newState);
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
        
        // FORCE override specific fields from savedState to ensure proper synchronization
        // This prevents local state from persisting when it should be overridden by remote changes
        for (const [key, value] of Object.entries(savedState)) {
            if (value !== undefined && value !== null) {
                (newState as any)[key] = value;
                
                // Special logging for phase changes to track synchronization
                if (key === 'currentPhase') {
                    console.log('[loadKingdomState] FORCE updated currentPhase from', state.currentPhase, 'to', value);
                }
            }
        }
        
        // Sync modifiers with service
        if (newState.modifiers) {
            modifierService.importModifiers(newState.modifiers);
        }
        
        // Initialize player actions if not present or empty
        if (!newState.playerActions || newState.playerActions.size === 0) {
            newState.playerActions = initializePlayerActions();
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

// Phase management functions - moved from gameState
export function isPhaseComplete(phase: TurnPhase): boolean {
  const kingdom = get(kingdomState);
  const requiredSteps = PHASE_REQUIRED_STEPS.get(phase) || [];
  
  // If no required steps, phase is always "complete" (e.g., Actions phase)
  if (requiredSteps.length === 0) {
    return true;
  }
  
  // Check if all required steps are completed
  return requiredSteps.every(step => kingdom.phaseStepsCompleted.get(step) === true);
}

export function markPhaseStepCompleted(stepId: string) {
  const kingdom = get(kingdomState);
  
  updateKingdom(k => {
    const newSteps = new Map(k.phaseStepsCompleted);
    newSteps.set(stepId, true);
    k.phaseStepsCompleted = newSteps;
    
    // Auto-complete related steps based on game rules (synchronous)
    // Status Phase: If gain-fame is done and no modifiers exist, auto-complete apply-modifiers
    if (stepId === 'gain-fame' && k.currentPhase === TurnPhase.PHASE_I) {
      const hasModifiers = k.modifiers && k.modifiers.length > 0;
      if (!hasModifiers && !k.phaseStepsCompleted.get('apply-modifiers')) {
        k.phaseStepsCompleted.set('apply-modifiers', true);
        console.log('[kingdom] Auto-completed apply-modifiers (no modifiers exist)');
      }
    }
    
    // After updating steps, check if current phase is now complete
    const requiredSteps = PHASE_REQUIRED_STEPS.get(k.currentPhase) || [];
    const phaseNowComplete = requiredSteps.length > 0 && 
      requiredSteps.every(step => k.phaseStepsCompleted.get(step) === true);
    
    if (phaseNowComplete && !k.phasesCompleted.has(k.currentPhase)) {
      const newPhasesCompleted = new Set(k.phasesCompleted);
      newPhasesCompleted.add(k.currentPhase);
      k.phasesCompleted = newPhasesCompleted;
      console.log(`[kingdom] Phase ${k.currentPhase} marked as complete`);
    }
  });
}

export function isPhaseStepCompleted(stepId: string): boolean {
  const kingdom = get(kingdomState);
  return kingdom.phaseStepsCompleted.get(stepId) === true;
}

export function isCurrentPhaseComplete(): boolean {
  const kingdom = get(kingdomState);
  return isPhaseComplete(kingdom.currentPhase);
}

// Phase auto-completion checks
export function checkPhaseAutoCompletions(phase: TurnPhase) {
  const kingdom = get(kingdomState);
  
  // Unrest Phase: Auto-complete if kingdom is stable
  if (phase === TurnPhase.PHASE_III) {
    const currentUnrest = kingdom.unrest || 0;
    // Simple tier calculation (could be moved to IncidentManager if needed)
    const tier = currentUnrest >= 10 ? 3 : currentUnrest >= 5 ? 2 : currentUnrest >= 1 ? 1 : 0;
    
    if (tier === 0 && !kingdom.phaseStepsCompleted.get('calculate-unrest')) {
      markPhaseStepCompleted('calculate-unrest');
      console.log('[kingdom] Auto-completed calculate-unrest (kingdom is stable)');
    }
  }
}

export function resetPhaseSteps() {
  updateKingdom(k => {
    k.phaseStepsCompleted = new Map();
  });
}

// Phase advancement functions - moved from gameState for proper synchronization
export function getNextPhase(currentPhase: TurnPhase): TurnPhase | null {
  const phases = Object.values(TurnPhase);
  const currentIndex = phases.indexOf(currentPhase);
  
  if (currentIndex < phases.length - 1) {
    return phases[currentIndex + 1];
  } else {
    return null; // End of turn
  }
}

export function advancePhase() {
  const kingdom = get(kingdomState);
  const oldPhase = kingdom.currentPhase;
  const nextPhase = getNextPhase(kingdom.currentPhase);
  
  if (nextPhase) {
    console.log('[kingdom] Phase advancing from', oldPhase, 'to', nextPhase);
    updateKingdom(k => {
      k.currentPhase = nextPhase;
    });
    
    // DEBUGGING: Check the state after update
    const updatedKingdom = get(kingdomState);
    console.log('[kingdom] Phase updated in store. New phase:', updatedKingdom.currentPhase);
    
    // Emit Foundry hook for phase change to trigger persistence
    console.log('[kingdom] About to emit hook. Hooks available?', typeof Hooks !== 'undefined');
    if (typeof Hooks !== 'undefined') {
      console.log('[kingdom] Emitting pf2e-reignmaker.phaseChanged hook');
      Hooks.call('pf2e-reignmaker.phaseChanged', {
        oldPhase,
        newPhase: nextPhase,
        turn: kingdom.currentTurn
      });
      console.log('[kingdom] Hook emitted successfully');
    } else {
      console.error('[kingdom] Hooks not available! Cannot emit phase change hook');
    }
  } else {
    // End of turn - clear resources and advance to next turn
    console.log('[kingdom] End of turn - advancing from turn', kingdom.currentTurn, 'to turn', kingdom.currentTurn + 1);
    
    const newTurn = kingdom.currentTurn + 1;
    
    // Clear non-storable resources and event tracking before ending turn
    updateKingdom(k => {
      // Advance turn
      k.currentTurn = newTurn;
      k.currentPhase = TurnPhase.PHASE_I;
      k.phaseStepsCompleted = new Map();
      k.phasesCompleted = new Set();
      k.oncePerTurnActions = new Set();
      
      // Clear non-storable resources
      k.resources.set('lumber', 0);
      k.resources.set('stone', 0);
      k.resources.set('ore', 0);
      
      // Process end turn modifiers if any
      k.modifiers = k.modifiers.filter(modifier => 
        modifier.duration !== 1
      );
      
      // Clear event/incident tracking for new turn
      k.currentEventId = null;
      k.currentIncidentId = null;
      k.incidentRoll = null;
      k.eventStabilityRoll = null;
      k.eventRollDC = null;
      k.eventTriggered = null;
      
      // Reset player actions for the new turn
      k.playerActions = initializePlayerActions();
    });
    
    // Emit Foundry hook for turn advancement to trigger persistence
    if (typeof Hooks !== 'undefined') {
      Hooks.call('pf2e-reignmaker.turnAdvanced', {
        oldTurn: kingdom.currentTurn,
        newTurn: newTurn,
        phase: TurnPhase.PHASE_I
      });
    }
  }
}

export function setCurrentPhase(phase: TurnPhase) {
  const kingdom = get(kingdomState);
  const oldPhase = kingdom.currentPhase;
  
  updateKingdom(k => {
    k.currentPhase = phase;
  });
  
  // Emit Foundry hook for phase change to trigger persistence
  if (typeof Hooks !== 'undefined' && oldPhase !== phase) {
    Hooks.call('pf2e-reignmaker.phaseChanged', {
      oldPhase,
      newPhase: phase,
      turn: kingdom.currentTurn
    });
  }
}
