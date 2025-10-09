/**
 * TurnManager - Central coordinator for all turn-scoped state
 * 
 * Handles:
 * - Turn and phase progression 
 * - Player action management across phases
 * - Turn-scoped state management
 * 
 * This is the single source of truth for turn/phase/player state.
 */

import { TurnPhase, type PhaseStep } from '../../actors/KingdomActor';

// Player action state (turn-scoped)
interface PlayerAction {
    playerId: string;
    playerName: string;
    playerColor: string;
    actionSpent: boolean;
    spentInPhase?: TurnPhase;
}

/**
 * Central turn and player action coordinator (Singleton)
 */
export class TurnManager {
    // Singleton instance
    private static instance: TurnManager | null = null;
    
    // Turn progression callbacks for UI updates
    onTurnChanged?: (turn: number) => void;
    onPhaseChanged?: (phase: TurnPhase) => void;
    onTurnEnded?: (turn: number) => void;
    
    private constructor() {
        console.log('[TurnManager] Initialized - central turn and player coordinator (singleton)');
    }
    
    /**
     * Get the singleton instance
     */
    static getInstance(): TurnManager {
        if (!TurnManager.instance) {
            TurnManager.instance = new TurnManager();
        }
        return TurnManager.instance;
    }
    
    /**
     * Reset the singleton instance (for testing/cleanup)
     */
    static resetInstance(): void {
        TurnManager.instance = null;
    }
    
    // === PLAYER ACTION MANAGEMENT ===
    // Removed: Player action tracking now uses turnState.actionLog instead
    
    // === PHASE STEP MANAGEMENT ===
    
    /**
     * Initialize phase steps - delegates to PhaseHandler
     */
    async initializePhaseSteps(steps: Array<{ name: string; completed?: 0 | 1 }>): Promise<void> {
        // Use existing PhaseHandler implementation
        const { PhaseHandler } = await import('./phase-handler');
        await PhaseHandler.initializePhaseSteps(steps);
        
        console.log(`✅ [TurnManager] Delegated phase step initialization to PhaseHandler`);
    }

    /**
     * Complete a step by index and handle progression logic - delegates to PhaseHandler
     */
    async completePhaseStepByIndex(stepIndex: number): Promise<{ phaseComplete: boolean }> {
        // Use existing PhaseHandler implementation
        const { PhaseHandler } = await import('./phase-handler');
        return await PhaseHandler.completePhaseStepByIndex(stepIndex);
    }

    /**
     * Check if a specific step is completed by index - delegates to PhaseHandler
     */
    async isStepCompletedByIndex(stepIndex: number): Promise<boolean> {
        // Use existing PhaseHandler implementation
        const { PhaseHandler } = await import('./phase-handler');
        return await PhaseHandler.isStepCompletedByIndex(stepIndex);
    }

    /**
     * Check if current phase is complete
     */
    async isCurrentPhaseComplete(): Promise<boolean> {
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const kingdom = get(kingdomData);
        if (!kingdom) return false;

        const totalSteps = kingdom.currentPhaseSteps.length;
        const completedCount = kingdom.currentPhaseSteps.filter(s => s.completed === 1).length;
        const allComplete = totalSteps > 0 && completedCount === totalSteps;

        console.log(`[TurnManager] Phase ${kingdom.currentPhase} completion: ${completedCount}/${totalSteps} steps`);
        return allComplete;
    }

    // === TURN MANAGEMENT ===
    
    /**
     * Set current phase directly
     */
    async setCurrentPhase(phase: TurnPhase): Promise<void> {
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
            kingdom.currentPhase = phase;
        });
        
        this.onPhaseChanged?.(phase);
        console.log(`[TurnManager] Set current phase to ${phase}`);
    }
    
    /**
     * Reset phase steps for new phase
     */
    async resetPhaseSteps(): Promise<void> {
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
            kingdom.phaseComplete = false;
        });
        
        console.log('[TurnManager] Reset phase steps');
    }

    /**
     * Force reset current phase steps (for testing/debugging)
     */
    async forceResetCurrentPhaseSteps(): Promise<void> {
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
            kingdom.phaseComplete = false;
        });
        
        console.log('[TurnManager] Force reset current phase steps for testing');
    }
    
    /**
     * Increment turn manually
     */
    async incrementTurn(): Promise<void> {
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
            kingdom.currentTurn = (kingdom.currentTurn || 1) + 1;
        });
        
        this.onTurnChanged?.(currentKingdom.currentTurn + 1);
        console.log(`[TurnManager] Incremented to turn ${currentKingdom.currentTurn + 1}`);
    }
    
  /**
   * Get the current phase
   */
  async getCurrentPhase(): Promise<string> {
    try {
      const { kingdomData } = await import('../../stores/KingdomStore');
      const { get } = await import('svelte/store');
      const currentKingdom = get(kingdomData);
      return currentKingdom.currentPhase;
    } catch (error) {
      // Fallback - return a default phase if stores aren't available yet
      console.warn('[TurnManager] Could not access kingdom data, falling back to STATUS phase');
      return 'status';
    }
  }

    /**
     * Mark the current phase as complete (called directly by phase controllers)
     */
    async markPhaseComplete(): Promise<void> {
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        console.log(`[TurnManager] Phase ${currentKingdom.currentPhase} marked as complete`);
        
        // Notify UI of phase completion
        this.onPhaseChanged?.(currentKingdom.currentPhase);
    }
    
    /**
     * Progress to the next phase
     */
    async nextPhase(): Promise<void> {
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        const next = await this.getNextPhase(currentKingdom.currentPhase);
        if (next !== null) {
            // ✅ RESET STEPS BEFORE ADVANCING - ensures each phase starts fresh
            await this.resetPhaseSteps();
            
            const { updateKingdom } = await import('../../stores/KingdomStore');
            await updateKingdom((kingdom) => {
                kingdom.currentPhase = next;
            });
            
            this.onPhaseChanged?.(next);
            console.log(`[TurnManager] Advanced to ${next} with fresh step state`);
        } else {
            // End of turn reached
            await this.endTurn();
        }
    }
    
    /**
     * Get the next phase in sequence - uses PHASE_ORDER for maintainability
     */
    private async getNextPhase(currentPhase: TurnPhase): Promise<TurnPhase | null> {
        const { PHASE_ORDER } = await import('../../actors/KingdomActor');
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
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        console.log(`[TurnManager] Ending turn ${currentKingdom.currentTurn}`);
        
        this.onTurnEnded?.(currentKingdom.currentTurn);
        
        // Player actions are automatically reset via turnState reset below
        
        // Import TurnState utilities
        const { createDefaultTurnState } = await import('../TurnState');
        
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            kingdom.currentTurn++;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
            kingdom.oncePerTurnActions = [];
            
            // ✅ Reset turnState for new turn - clears all phase-specific data
            // including completionsByAction, activeAids, appliedOutcomes, etc.
            kingdom.turnState = createDefaultTurnState(kingdom.currentTurn);
            
            // Active modifiers are now managed by ModifierService
            // Duration is handled in the EventModifier format within each modifier's modifiers array
            // Cleanup is handled by ModifierService.cleanupExpiredModifiers() during Status phase
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
        
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            kingdom.currentTurn = 1;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
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
        const { updateKingdom } = await import('../../stores/KingdomStore');
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
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        return !currentKingdom.oncePerTurnActions.includes(actionId);
    }
    
    /**
     * Mark an action as used this turn
     */
    async markActionUsed(actionId: string): Promise<void> {
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            if (!kingdom.oncePerTurnActions.includes(actionId)) {
                kingdom.oncePerTurnActions.push(actionId);
            }
        });
    }
    
    /**
     * Spend fame to reroll
     */
    async spendFameForReroll(): Promise<boolean> {
        const { kingdomData, updateKingdom } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        if (currentKingdom.fame > 0) {
            await updateKingdom((kingdom) => {
                kingdom.fame = kingdom.fame - 1;
            });
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Get a summary of the current turn state
     */
    async getTurnSummary(): Promise<string> {
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        
        return `Turn ${currentKingdom.currentTurn} - ${currentKingdom.currentPhase}`;
    }
}
