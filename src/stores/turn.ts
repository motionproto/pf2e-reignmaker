import { writable, derived } from 'svelte/store';
import { TurnManager } from '../models/TurnManager';
import type { PlayerAction } from '../models/PlayerActions';
import type { TurnPhase } from '../models/KingdomState';

// Turn management store
export const turnManager = writable(new TurnManager());

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
    return $manager.getCurrentPhaseInfo();
});

// Actions to modify turn state
export function startNewTurn() {
    turnManager.update(manager => {
        manager.startNewTurn();
        return manager;
    });
    actionHistory.set([]);
}

export function completePhase(phase: TurnPhase) {
    turnManager.update(manager => {
        manager.completePhase(phase);
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
    turnManager.set(new TurnManager());
    availableActions.set([]);
    selectedAction.set(null);
    actionHistory.set([]);
}
