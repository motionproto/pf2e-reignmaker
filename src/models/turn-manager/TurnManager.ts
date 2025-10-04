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
    
    // Player action state (in-memory, turn-scoped)
    private playerActions: Map<string, PlayerAction> = new Map();
    
    private constructor() {
        console.log('[TurnManager] Initialized - central turn and player coordinator (singleton)');
        this.initializePlayers();
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
    
    /**
     * Initialize all current players in the game
     */
    private initializePlayers(): void {
        const game = (window as any).game;
        if (!game?.users) {
            console.warn('[TurnManager] Game not available, cannot initialize players');
            return;
        }

        const initializedPlayers: string[] = [];
        
        // Clear existing actions for fresh start
        this.playerActions.clear();
        
        // Initialize all users
        for (const user of game.users) {
            const playerAction: PlayerAction = {
                playerId: user.id,
                playerName: user.name || 'Unknown Player',
                actionSpent: false,
                spentInPhase: undefined
            };
            
            this.playerActions.set(user.id, playerAction);
            initializedPlayers.push(user.name);
        }
        
        console.log(`[TurnManager] Initialized player actions for: ${initializedPlayers.join(', ')}`);
    }
    
    /**
     * Spend a player action in a specific phase
     */
    spendPlayerAction(playerId: string, phase: TurnPhase): boolean {
        const playerAction = this.playerActions.get(playerId) || {
            playerId,
            playerName: (window as any).game?.users?.get(playerId)?.name || 'Unknown',
            actionSpent: false,
            spentInPhase: undefined
        };
        
        if (!playerAction.actionSpent) {
            playerAction.actionSpent = true;
            playerAction.spentInPhase = phase;
            this.playerActions.set(playerId, playerAction);
            console.log(`[TurnManager] Player ${playerAction.playerName} spent action in ${phase}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Reset a player's action for the turn
     */
    resetPlayerAction(playerId: string): void {
        const playerAction = this.playerActions.get(playerId);
        if (playerAction) {
            playerAction.actionSpent = false;
            playerAction.spentInPhase = undefined;
            this.playerActions.set(playerId, playerAction);
            console.log(`[TurnManager] Reset action for player ${playerAction.playerName}`);
        }
    }
    
    /**
     * Get a player's action state
     */
    getPlayerAction(playerId: string): PlayerAction | undefined {
        return this.playerActions.get(playerId);
    }
    
    /**
     * Reset all player actions (called at turn end)
     */
    private resetAllPlayerActions(): void {
        for (const [playerId, playerAction] of this.playerActions) {
            playerAction.actionSpent = false;
            playerAction.spentInPhase = undefined;
        }
        console.log('[TurnManager] Reset all player actions for new turn');
    }
    
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
        
        // Reset player actions for new turn
        this.resetAllPlayerActions();
        
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom((kingdom) => {
            kingdom.currentTurn++;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
            kingdom.oncePerTurnActions = [];
            
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
     * Get unrest penalty for kingdom checks
     */
    async getUnrestPenalty(): Promise<number> {
        const { kingdomData } = await import('../../stores/KingdomStore');
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
