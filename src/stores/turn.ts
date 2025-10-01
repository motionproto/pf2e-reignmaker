import { writable, derived } from 'svelte/store';
import { TurnManager } from '../models/TurnManager';
import { KingdomState } from '../models/KingdomState';
import type { PlayerAction } from '../models/PlayerActions';
import type { TurnPhase } from '../models/KingdomState';

// Turn management store - initialize with null until kingdom state is available
export const turnManager = writable<TurnManager | null>(null);

// Initialize turn manager when kingdom state becomes available
export function initializeTurnManager(kingdomState: KingdomState): void {
    const manager = new TurnManager(kingdomState);
    turnManager.set(manager);
    console.log('[TurnStore] Initialized TurnManager with kingdom state');
}

// Store for available actions in the current phase
export const availableActions = writable<PlayerAction[]>([]);

// Store for selected action
export const selectedAction = writable<PlayerAction | null>(null);

// Store for action history
export const actionHistory = writable<Array<{
    action: PlayerAction;
    result: any;
    timestamp: Date;
}>>([]);

// Derived store for current phase info
export const currentPhaseInfo = derived(turnManager, $manager => {
    return $manager?.getCurrentPhaseInfo() || null;
});

// Actions to modify turn state
export function startNewTurn() {
    turnManager.update(manager => {
        if (manager) {
            manager.startNewTurn();
        }
        return manager;
    });
    actionHistory.set([]);
}

export function completePhase(phase: TurnPhase) {
    turnManager.update(manager => {
        if (manager) {
            manager.completePhase(phase);
        }
        return manager;
    });
}

export function setAvailableActions(actions: PlayerAction[]) {
    availableActions.set(actions);
}

export function selectAction(action: PlayerAction | null) {
    selectedAction.set(action);
}

export function recordActionResult(action: PlayerAction, result: any) {
    actionHistory.update(history => {
        history.push({
            action,
            result,
            timestamp: new Date()
        });
        return history;
    });
}

export function clearActionHistory() {
    actionHistory.set([]);
}

export function resetTurnState() {
    turnManager.set(null);
    availableActions.set([]);
    selectedAction.set(null);
    actionHistory.set([]);
}

export function updateTurnManagerKingdomState(kingdomState: KingdomState): void {
    turnManager.update(manager => {
        if (manager) {
            manager.updateKingdomState(kingdomState);
        }
        return manager;
    });
}
