/**
 * StatusPhaseController - Shows kingdom status and processes resource decay
 * This phase auto-completes immediately and processes resource decay from previous turn.
 */

import { getKingdomActor } from '../stores/KingdomStore';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStepByIndex
} from './shared/PhaseControllerHelpers';
import { createDefaultTurnState } from '../models/TurnState';
import { createModifierService } from '../services/ModifierService';

export async function createStatusPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('StatusPhaseController');
      
      try {
        // Initialize single step that handles all status processing
        const steps = [
          { name: 'Status' }
        ];
        
        await initializePhaseSteps(steps);
        
        // Initialize or reset turnState (Phase 1 of TurnState Migration)
        await this.ensureTurnState();
        
        // Clear applied outcomes from previous turn
        await this.clearAppliedOutcomes();
        
        // Clear previous turn's incident
        await this.clearPreviousIncident();
        
        // Process resource decay from previous turn (moved from Upkeep)
        await this.processResourceDecay();
        
        // Set Fame to 1 (initial condition for each turn)
        await this.initializeFame();
        
        // Apply permanent modifiers from structures
        await this.applyPermanentModifiers();
        
        // Apply ongoing modifiers (both system and custom)
        await this.applyOngoingModifiers();
        
        // Auto-complete the single step immediately
        await completePhaseStepByIndex(0);
        
        console.log('✅ [StatusPhaseController] Status step auto-completed');
        
        reportPhaseComplete('StatusPhaseController');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('StatusPhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Clear applied outcomes from previous turn
     * Only clears when starting a NEW turn, not during phase navigation
     */
    async clearAppliedOutcomes() {
      const actor = getKingdomActor();
      if (!actor) return;
      
      const kingdom = actor.getKingdom();
      if (!kingdom || !kingdom.turnState) return;
      
      // Clear applied outcomes from turnState (automatically cleared by turnState reset)
      // This is now handled by TurnManager.endTurn() which resets turnState
      console.log('🧹 [StatusPhaseController] Applied outcomes cleared (handled by TurnManager.endTurn())');
    },

    /**
     * Clear previous turn's incident data
     * Now handled by turnState reset in ensureTurnState()
     */
    async clearPreviousIncident() {
      // This is now automatically handled by turnState reset
      // No need to manually clear - turnState.unrestPhase resets on turn advance
      console.log('🧹 [StatusPhaseController] Previous turn incident cleared (handled by turnState reset)');
    },

    /**
     * NEW: Process resource decay from previous turn
     * Moved from UpkeepPhaseController to start of new turn
     */
    async processResourceDecay() {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }
      
      // Clear non-storable resources (lumber, stone, ore)
      await actor.updateKingdom((kingdom) => {
        const decayedLumber = kingdom.resources.lumber || 0;
        const decayedStone = kingdom.resources.stone || 0;
        const decayedOre = kingdom.resources.ore || 0;
        
        kingdom.resources.lumber = 0;
        kingdom.resources.stone = 0;
        kingdom.resources.ore = 0;
        
        if (decayedLumber > 0 || decayedStone > 0 || decayedOre > 0) {
          console.log(`♻️ [StatusPhaseController] Resource decay: -${decayedLumber} lumber, -${decayedStone} stone, -${decayedOre} ore`);
        }
      });
    },

    /**
     * Initialize Fame to 1 for the turn
     */
    async initializeFame() {
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdom((kingdom) => {
          kingdom.fame = 1;
        });
        console.log('✨ [StatusPhaseController] Fame initialized to 1');
      }
    },

    /**
     * Apply ongoing modifiers using ModifierService
     * 
     * This applies ALL ongoing modifiers (both system and custom) each turn.
     * System modifiers come from events/incidents/structures.
     * Custom modifiers are created by the user in the ModifiersTab.
     */
    async applyOngoingModifiers() {
      const modifierService = await createModifierService();
      await modifierService.applyOngoingModifiers();
    },

    /**
     * Apply permanent modifiers from structures
     * 
     * Permanent modifiers come from built structures and are applied each turn.
     * This is different from immediate/ongoing/turn-based modifiers from events/incidents.
     */
    async applyPermanentModifiers() {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }

      // Get active modifiers with permanent duration
      const kingdom = actor.getKingdom();
      if (!kingdom) {
        console.error('❌ [StatusPhaseController] No kingdom data available');
        return;
      }

      const permanentModifiers = (kingdom.activeModifiers || []).filter(
        (mod: any) => mod.modifiers?.some((m: any) => m.duration === 'permanent')
      );

      if (permanentModifiers.length === 0) {
        return;
      }

      console.log(`🏛️ [StatusPhaseController] Applying ${permanentModifiers.length} permanent modifiers`);

      // Apply each permanent modifier's effects
      for (const modifier of permanentModifiers) {
        for (const mod of modifier.modifiers || []) {
          if (mod.duration === 'permanent') {
            const resource = mod.resource;
            const value = typeof mod.value === 'string' ? parseInt(mod.value, 10) : mod.value;
            
            if (isNaN(value)) {
              console.warn(`⚠️ [StatusPhaseController] Invalid value for ${modifier.name}: ${mod.value}`);
              continue;
            }

            await actor.updateKingdom((kingdom) => {
              if (!kingdom.resources) {
                kingdom.resources = {};
              }

              const currentValue = kingdom.resources[resource] || 0;
              const newValue = Math.max(0, currentValue + value);
              kingdom.resources[resource] = newValue;

              console.log(`  ✓ ${modifier.name}: ${value > 0 ? '+' : ''}${value} ${resource} (${currentValue} → ${newValue})`);
            });
          }
        }
      }
    },

    /**
     * Ensures turnState exists and is properly initialized/reset.
     * Phase 1 of TurnState Migration:
     * - Initialize turnState if missing (first turn or legacy save)
     * - Reset turnState when advancing turns (detect via turnNumber mismatch)
     * - Migrate legacy fields if needed
     */
    async ensureTurnState() {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }

      const kingdom = actor.getKingdom();
      if (!kingdom) {
        console.error('❌ [StatusPhaseController] No kingdom data available');
        return;
      }

      const currentTurn = kingdom.currentTurn || 1;

      // Case 1: No turnState exists (first run or legacy save)
      if (!kingdom.turnState) {
        console.log('🔄 [StatusPhaseController] No turnState found, initializing...');
        
        // Fresh initialization (no migration needed - data is already clean)
        await actor.updateKingdom((k) => {
          k.turnState = createDefaultTurnState(currentTurn);
        });
        
        console.log('✅ [StatusPhaseController] turnState initialized for turn', currentTurn);
        return;
      }

      // Case 2: turnState exists but turn number mismatch (turn advanced)
      if (kingdom.turnState.turnNumber !== currentTurn) {
        console.log('🔄 [StatusPhaseController] Turn advanced, resetting turnState...');
        console.log(`   Previous turn: ${kingdom.turnState.turnNumber}, Current turn: ${currentTurn}`);
        
        await actor.updateKingdom((k) => {
          k.turnState = createDefaultTurnState(currentTurn);
        });
        
        console.log('✅ [StatusPhaseController] turnState reset for turn', currentTurn);
        return;
      }

      // Case 3: turnState exists and matches current turn (phase navigation within same turn)
      console.log('✅ [StatusPhaseController] turnState already initialized for turn', currentTurn);
    }
  };
}
