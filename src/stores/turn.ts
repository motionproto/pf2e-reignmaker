import { writable, derived } from 'svelte/store';
import { TurnManager } from '../models/TurnManager';
import { KingdomState } from '../models/KingdomState';
import type { PlayerAction } from '../models/PlayerActions';
import type { TurnPhase } from '../models/KingdomState';

// Turn management store - initialize immediately with new simplified TurnManager
export const turnManager = writable<TurnManager | null>(new TurnManager());

// Initialize turn manager - simplified for new architecture
export function initializeTurnManager(): void {
    const manager = new TurnManager();
    turnManager.set(manager);
    console.log('[TurnStore] Initialized simplified TurnManager');
    
    // Trigger controller for current phase when initializing
    triggerCurrentPhaseController();
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

// Actions to modify turn state
export function startNewTurn() {
    turnManager.update(manager => {
        if (manager) {
            manager.startNewGame();
        }
        return manager;
    });
    actionHistory.set([]);
}

export function completePhase(phase: TurnPhase) {
    turnManager.update(manager => {
        if (manager) {
            manager.markCurrentPhaseComplete();
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

// Trigger current phase controller (for initialization)
export function triggerCurrentPhaseController(): void {
    turnManager.update(manager => {
        if (manager) {
            // Call the trigger function from the store level
            triggerCurrentPhaseControllerInternal();
        }
        return manager;
    });
}

// Internal function to trigger current phase controller
async function triggerCurrentPhaseControllerInternal(): Promise<void> {
    try {
        const { kingdomData } = await import('./KingdomStore');
        const { get } = await import('svelte/store');
        const kingdom = get(kingdomData);
        
        if (kingdom && kingdom.currentPhase) {
            console.log(`🟡 [TurnStore] Triggering controller for current phase: ${kingdom.currentPhase}`);
            
            const manager = get(turnManager);
            if (manager) {
                await manager.triggerPhaseController(kingdom.currentPhase);
            }
        }
    } catch (error) {
        console.error('[TurnStore] Error triggering current phase controller:', error);
    }
}
