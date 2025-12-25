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
import { logger } from '../../utils/Logger';

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
      logger.warn('[TurnManager] Could not access kingdom data, falling back to STATUS phase');
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
     * End-of-turn cleanup - runs BEFORE turn increments
     * Processes everything that "closes out" the current turn
     */
    private async endOfTurnCleanup(): Promise<void> {
        logger.info('🧹 [TurnManager] Running end-of-turn cleanup...');
        
        const { updateKingdom, kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const kingdom = get(kingdomData);
        
        // 1. Resource decay (moved from StatusPhaseController)
        await updateKingdom(k => {
            const decayed = {
                lumber: k.resources.lumber || 0,
                stone: k.resources.stone || 0,
                ore: k.resources.ore || 0
            };
            k.resources.lumber = 0;
            k.resources.stone = 0;
            k.resources.ore = 0;

            if (decayed.lumber > 0 || decayed.stone > 0 || decayed.ore > 0) {
                logger.info(`📦 [TurnManager] Resource decay: lumber=${decayed.lumber}, stone=${decayed.stone}, ore=${decayed.ore}`);
            }

            // Food decay - excess food beyond storage capacity is lost
            const currentFood = k.resources?.food || 0;
            const foodCapacity = k.resources?.foodCapacity || 0;
            if (currentFood > foodCapacity) {
                const excessFood = currentFood - foodCapacity;
                k.resources.food = foodCapacity;
                logger.info(`🍞 [TurnManager] Food decay: ${excessFood} food lost (exceeded storage capacity of ${foodCapacity})`);
            }
        });
        
        // 2. Fame conversion (moved from UpkeepPhaseController)
        // NOTE: Fame conversion is currently disabled per game rules
        // Fame is now ONLY used for rerolls, not automatic unrest reduction
        const currentFame = kingdom.fame || 0;
        if (currentFame > 0) {
            logger.info(`⭐ [TurnManager] ${currentFame} fame expires unused (save it for rerolls next time!)`);
        }
        
        // 3. Vote cleanup (moved from UpkeepPhaseController)
        const { VoteService } = await import('../../services/VoteService');
        await VoteService.cleanupOldVotes();
        logger.info('🗳️ [TurnManager] Cleaned up old votes');
        
        // 4. Remove expired turn-based custom modifiers
        // Modifiers with numeric duration calculate their expiry turn when created
        await updateKingdom(k => {
            if (!k.activeModifiers || k.activeModifiers.length === 0) return;
            
            const customModifiers = k.activeModifiers.filter(m => m.sourceType === 'custom');
            if (customModifiers.length === 0) return;
            
            const modifiersToRemove: string[] = [];
            const currentTurn = k.currentTurn || 1;
            
            for (const modifier of customModifiers) {
                let shouldRemove = true;
                
                for (const mod of modifier.modifiers) {
                    if (typeof mod.duration === 'number') {
                        // Calculate expiry turn: startTurn + duration
                        // Example: Added on turn 5 with duration 2 → expires after turn 6 (5+2-1)
                        const expiryTurn = modifier.startTurn + mod.duration;
                        
                        if (currentTurn < expiryTurn) {
                            shouldRemove = false;
                            const turnsRemaining = expiryTurn - currentTurn;
                            logger.info(`⏰ [TurnManager] ${modifier.name}: ${turnsRemaining} turn(s) remaining (expires after turn ${expiryTurn})`);
                        } else {
                            logger.info(`⏰ [TurnManager] ${modifier.name}: Expired (was active turns ${modifier.startTurn}-${expiryTurn})`);
                        }
                    } else {
                        shouldRemove = false; // ongoing/permanent modifiers never expire
                    }
                }
                
                // Mark modifier for removal if all its effects are expired
                if (shouldRemove) {
                    modifiersToRemove.push(modifier.id);
                }
            }
            
            // Remove expired modifiers
            if (modifiersToRemove.length > 0) {
                logger.info(`🗑️ [TurnManager] Removing ${modifiersToRemove.length} expired custom modifier(s)`);
                k.activeModifiers = k.activeModifiers.filter(m => !modifiersToRemove.includes(m.id));
            }
        });
        
        logger.info('✅ [TurnManager] End-of-turn cleanup complete');
    }

    /**
     * Ensure the current turn is properly initialized
     * Called at the start of Status phase to handle Turn 1 and any edge cases
     *
     * This is idempotent - safe to call multiple times per turn
     */
    async ensureTurnInitialized(): Promise<void> {
        const { createDefaultTurnState } = await import('../TurnState');
        const { updateKingdom, kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);

        const currentTurn = currentKingdom.currentTurn || 1;
        const turnState = currentKingdom.turnState;

        // Check if this turn has already been initialized
        // (turnState exists and matches current turn number)
        if (turnState && turnState.turnNumber === currentTurn) {
            return; // Already initialized
        }

        logger.info(`🎬 [TurnManager] Initializing turn ${currentTurn}...`);

        // Note: Testing mode "acted" status is derived from actionLog, which is
        // reset via createDefaultTurnState() below - no separate reset needed

        await updateKingdom(kingdom => {
            // Initialize turnState for this turn
            kingdom.turnState = createDefaultTurnState(currentTurn);

            // Clear faction aid tracking for new turn
            kingdom.factionsAidedThisTurn = [];

            // Reset turn-scoped penalties
            kingdom.leadershipPenalty = 0;

            // Reset once-per-turn actions
            kingdom.oncePerTurnActions = [];

            // Initialize fame for this turn
            kingdom.fame = 1;
        });

        logger.info(`✅ [TurnManager] Turn ${currentTurn} initialized`);
    }

    /**
     * End the current turn and start a new one
     */
    async endTurn(): Promise<void> {
        const { updateKingdom, kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const currentKingdom = get(kingdomData);
        const nextTurn = (currentKingdom.currentTurn || 1) + 1;

        this.onTurnEnded?.(currentKingdom.currentTurn);

        // 1. Run end-of-turn cleanup (resource decay, expired modifiers, etc.)
        await this.endOfTurnCleanup();

        // 2. Increment turn number and reset phase
        logger.info(`🎬 [TurnManager] Advancing to turn ${nextTurn}...`);
        await updateKingdom(kingdom => {
            kingdom.currentTurn = nextTurn;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
        });

        // 3. Initialize the new turn's state (fame, turnState, etc.)
        await this.ensureTurnInitialized();

        // 4. Notify UI of changes
        this.onTurnChanged?.(nextTurn);
        this.onPhaseChanged?.(TurnPhase.STATUS);

        logger.info(`✅ [TurnManager] Turn ${nextTurn} started`);
    }
    
    /**
     * Start a new game/reset turns
     */
    async startNewGame(): Promise<void> {
        logger.info('🎮 [TurnManager] Starting new game...');

        const { updateKingdom } = await import('../../stores/KingdomStore');

        // Set up fresh game state
        await updateKingdom((kingdom) => {
            kingdom.currentTurn = 1;
            kingdom.currentPhase = TurnPhase.STATUS;
            kingdom.currentPhaseSteps = [];
            kingdom.currentPhaseStepIndex = 0;
            kingdom.unrest = 0;
            // Clear turnState so ensureTurnInitialized() will run
            kingdom.turnState = undefined as any;
        });

        // Initialize Turn 1 state (fame, turnState, etc.)
        await this.ensureTurnInitialized();

        this.onTurnChanged?.(1);
        this.onPhaseChanged?.(TurnPhase.STATUS);

        logger.info('✅ [TurnManager] New game started');
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
