/**
 * TurnManager - Simple turn progression system
 * 
 * This class focuses ONLY on turn and phase progression.
 * No orchestration, no controllers, no complex state management.
 * 
 * Phases handle their own execution and tell TurnManager when complete.
 */

import { TurnPhase } from './KingdomState';

/**
 * Simple turn progression manager
 */
export class TurnManager {
    // Simple callbacks for UI updates
    onTurnChanged?: (turn: number) => void;
    onPhaseChanged?: (phase: TurnPhase) => void;
    onTurnEnded?: (turn: number) => void;
    
    constructor() {
        console.log('[TurnManager] Initialized - simple turn progression only');
    }
    
    /**
     * Mark current phase as complete (called directly by phases)
     */
    async markCurrentPhaseComplete(): Promise<void> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        console.log(`[TurnManager] Phase ${currentKingdom.currentPhase} marked as complete`);
        
        // Update completion tracking in KingdomActor
        const { updateKingdom } = await import('../stores/KingdomStore');
        
        await updateKingdom((kingdom) => {
            if (!kingdom.phasesCompleted.includes(currentKingdom.currentPhase)) {
                kingdom.phasesCompleted.push(currentKingdom.currentPhase);
                console.log(`[TurnManager] Added ${currentKingdom.currentPhase} to completed phases:`, kingdom.phasesCompleted);
            }
        });
        
        // Notify UI of phase completion
        this.onPhaseChanged?.(currentKingdom.currentPhase);
    }
    
    /**
     * Progress to the next phase
     */
    async nextPhase(): Promise<void> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        const next = this.getNextPhase(currentKingdom.currentPhase);
        if (next !== null) {
            const { updateKingdom } = await import('../stores/KingdomStore');
            await updateKingdom((kingdom) => {
                kingdom.currentPhase = next;
            });
            
            // Trigger the phase controller for the new phase
            await this.triggerPhaseController(next);
            
            this.onPhaseChanged?.(next);
            console.log(`[TurnManager] Advanced to ${next}`);
        } else {
            // End of turn reached
            await this.endTurn();
        }
    }
    
    /**
     * Trigger the appropriate phase controller when entering a new phase
     */
    async triggerPhaseController(phase: TurnPhase): Promise<void> {
        console.log(`🟡 [TurnManager] Triggering controller for ${phase}...`);
        
        try {
            switch (phase) {
                case TurnPhase.STATUS: // Status Phase
                    await this.tryTriggerController('../controllers/StatusPhaseController', 'createStatusPhaseController', phase);
                    break;
                
                case TurnPhase.RESOURCES: // Resources Phase
                    await this.tryTriggerController('../controllers/ResourcePhaseController', 'createResourcePhaseController', phase);
                    break;
                
                case TurnPhase.UNREST: // Unrest Phase
                    await this.tryTriggerController('../controllers/UnrestPhaseController', 'createUnrestPhaseController', phase);
                    break;
                
                case TurnPhase.EVENTS: // Events Phase
                    await this.tryTriggerController('../controllers/EventPhaseController', 'createEventPhaseController', phase);
                    break;
                
                case TurnPhase.ACTIONS: // Actions Phase
                    await this.tryTriggerController('../controllers/ActionPhaseController', 'createActionPhaseController', phase);
                    break;
                
                case TurnPhase.UPKEEP: // Upkeep Phase
                    await this.tryTriggerController('../controllers/UpkeepPhaseController', 'createUpkeepPhaseController', phase);
                    break;
                
                default:
                    console.warn(`[TurnManager] No controller available for phase: ${phase}`);
            }
            
            console.log(`✅ [TurnManager] Phase controller check completed for ${phase}`);
        } catch (error) {
            console.error(`❌ [TurnManager] Error triggering controller for ${phase}:`, error);
        }
    }
    
    /**
     * Helper method to safely try triggering a controller
     */
    private async tryTriggerController(modulePath: string, factoryName: string, phase: TurnPhase): Promise<void> {
        try {
            const module = await import(modulePath);
            const factory = module[factoryName];
            
            if (typeof factory === 'function') {
                const controller = await factory();
                
                if (controller && typeof (controller as any).runAutomation === 'function') {
                    const result = await (controller as any).runAutomation();
                    if (!result.success) {
                        console.error(`❌ [TurnManager] ${phase} controller failed:`, result.error);
                    }
                } else {
                    console.log(`🟡 [TurnManager] ${phase} controller not yet migrated to new architecture`);
                }
            } else {
                console.log(`🟡 [TurnManager] ${phase} controller factory not found`);
            }
        } catch (error) {
            console.log(`🟡 [TurnManager] ${phase} controller not available or not migrated:`, error);
        }
    }
    
    /**
     * Get the next phase in sequence - uses PHASE_ORDER for maintainability
     */
    private getNextPhase(currentPhase: TurnPhase): TurnPhase | null {
        const { PHASE_ORDER } = require('./KingdomState');
        const currentIndex = PHASE_ORDER.indexOf(currentPhase);
        
        if (currentIndex >= 0 && currentIndex < PHASE_ORDER.length - 1) {
            return PHASE_ORDER[currentIndex + 1];
        }
        
        return null; // End of turn
    }
    
    /**
     * End the current turn and start a new one
     */
    async endTurn(): Promise<void> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        console.log(`[TurnManager] Ending turn ${currentKingdom.currentTurn}`);
        
        this.onTurnEnded?.(currentKingdom.currentTurn);
        
        const { updateKingdom } = await import('../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            kingdom.currentTurn++;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.phasesCompleted = [];
            kingdom.phaseStepsCompleted = {};
            kingdom.oncePerTurnActions = [];
            
            // Decrement modifier durations
            kingdom.modifiers = kingdom.modifiers.filter((modifier) => {
                if (typeof modifier.duration === 'number' && modifier.duration > 0) {
                    const remainingTurns = (modifier as any).remainingTurns || modifier.duration;
                    const newRemaining = remainingTurns - 1;
                    (modifier as any).remainingTurns = newRemaining;
                    return newRemaining > 0;
                }
                return true; // Keep permanent and until-resolved modifiers
            });
        });
        
        this.onTurnChanged?.(currentKingdom.currentTurn + 1);
        this.onPhaseChanged?.(TurnPhase.STATUS);
        
        console.log(`[TurnManager] Started turn ${currentKingdom.currentTurn + 1}`);
    }
    
    /**
     * Start a new game/reset turns
     */
    async startNewGame(): Promise<void> {
        console.log('[TurnManager] Starting new game');
        
        const { updateKingdom } = await import('../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            kingdom.currentTurn = 1;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.phasesCompleted = [];
            kingdom.phaseStepsCompleted = {};
            kingdom.oncePerTurnActions = [];
            kingdom.unrest = 0;
            kingdom.fame = 0;
        });
        
        this.onTurnChanged?.(1);
        this.onPhaseChanged?.(TurnPhase.STATUS);
    }
    
    /**
     * Skip to a specific phase (for testing or special events)
     */
    async skipToPhase(phase: TurnPhase): Promise<void> {
        const { updateKingdom } = await import('../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            kingdom.currentPhase = phase;
        });
        
        this.onPhaseChanged?.(phase);
        console.log(`[TurnManager] Skipped to ${phase}`);
    }
    
    /**
     * Check if a once-per-turn action can be performed
     */
    async canPerformAction(actionId: string): Promise<boolean> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        return !currentKingdom.oncePerTurnActions.includes(actionId);
    }
    
    /**
     * Mark an action as used this turn
     */
    async markActionUsed(actionId: string): Promise<void> {
        const { updateKingdom } = await import('../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            if (!kingdom.oncePerTurnActions.includes(actionId)) {
                kingdom.oncePerTurnActions.push(actionId);
            }
        });
    }
    
    /**
     * Get unrest penalty for kingdom checks
     */
    async getUnrestPenalty(): Promise<number> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        const unrest = currentKingdom.unrest;
        
        if (unrest >= 0 && unrest <= 2) {
            return 0;
        } else if (unrest >= 3 && unrest <= 5) {
            return -1;
        } else if (unrest >= 6 && unrest <= 8) {
            return -2;
        } else {
            return -3;
        }
    }
    
    /**
     * Spend fame to reroll
     */
    async spendFameForReroll(): Promise<boolean> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        if (currentKingdom.fame > 0) {
            const { modifyResource } = await import('../stores/KingdomStore');
            await modifyResource('fame', -1);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Get a summary of the current turn state
     */
    async getTurnSummary(): Promise<string> {
        const { kingdomData } = await import('../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        return `Turn ${currentKingdom.currentTurn} - ${currentKingdom.currentPhase}`;
    }
}
