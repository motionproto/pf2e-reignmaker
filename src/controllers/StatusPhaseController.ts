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
  checkPhaseGuard,
  initializePhaseSteps,
  completePhaseStepByIndex
} from './shared/PhaseControllerHelpers';
import { TurnPhase } from '../actors/KingdomActor';
import { StatusPhaseSteps } from './shared/PhaseStepConstants';
import { createDefaultTurnState } from '../models/TurnState';
import { SettlementTier } from '../models/Settlement';
import { logger } from '../utils/Logger';

export async function createStatusPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('StatusPhaseController');
      
      try {
        // Phase guard - prevents initialization when not in Status phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.STATUS, 'StatusPhaseController');
        if (guardResult) return guardResult;
        
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
        
        // Clear completed build projects from previous turn
        await this.clearCompletedProjects();
        
        // ✅ ONE-TIME turn initialization (runs at START of every turn, including Turn 1)
        // Process resource decay from previous turn
        await this.processResourceDecay();
        
        // Initialize Fame to 1 for this turn
        await this.initializeFame();
        
        // Apply base unrest (size + metropolises)
        await this.applyBaseUnrest();
        
        // Clean up expired modifiers
        await this.cleanupExpiredModifiers();
        
        // Apply permanent modifiers from structures
        await this.applyPermanentModifiers();
        
        // Auto-complete the single step immediately (using type-safe constant)
        await completePhaseStepByIndex(StatusPhaseSteps.STATUS);
        
        logger.debug('✅ [StatusPhaseController] Status step auto-completed');
        
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
      
      const kingdom = actor.getKingdomData();
      if (!kingdom || !kingdom.turnState) return;
      
      // Clear applied outcomes from turnState (automatically cleared by turnState reset)
      // This is now handled by TurnManager.endTurn() which resets turnState
      logger.debug('🧹 [StatusPhaseController] Applied outcomes cleared (handled by TurnManager.endTurn())');
    },

    /**
     * Clear previous turn's incident data
     * Now handled by turnState reset in ensureTurnState()
     */
    async clearPreviousIncident() {
      // This is now automatically handled by turnState reset
      // No need to manually clear - turnState.unrestPhase resets on turn advance
      logger.debug('🧹 [StatusPhaseController] Previous turn incident cleared (handled by turnState reset)');
    },

    /**
     * Clear completed build projects from previous turn
     */
    async clearCompletedProjects() {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }

      await actor.updateKingdomData(k => {
        if (!k.buildQueue || k.buildQueue.length === 0) return;
        
        const beforeCount = k.buildQueue.length;
        k.buildQueue = k.buildQueue.filter(p => !p.isCompleted);
        const removed = beforeCount - k.buildQueue.length;
        
        if (removed > 0) {
          logger.debug(`🧹 [StatusPhaseController] Cleared ${removed} completed project${removed > 1 ? 's' : ''} from previous turn`);
        }
      });
    },

    /**
     * NEW: Process resource decay from previous turn
     * Moved from UpkeepPhaseController to start of new turn
     */
    async processResourceDecay() {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }
      
      // Clear non-storable resources (lumber, stone, ore)
      await actor.updateKingdomData((kingdom) => {
        const decayedLumber = kingdom.resources.lumber || 0;
        const decayedStone = kingdom.resources.stone || 0;
        const decayedOre = kingdom.resources.ore || 0;
        
        kingdom.resources.lumber = 0;
        kingdom.resources.stone = 0;
        kingdom.resources.ore = 0;
        
        if (decayedLumber > 0 || decayedStone > 0 || decayedOre > 0) {
          logger.debug(`♻️ [StatusPhaseController] Resource decay: -${decayedLumber} lumber, -${decayedStone} stone, -${decayedOre} ore`);
        }
      });
    },

    /**
     * Initialize Fame to 1 for the turn
     */
    async initializeFame() {
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdomData((kingdom) => {
          kingdom.fame = 1;
        });
        logger.debug('✨ [StatusPhaseController] Fame initialized to 1');
      }
    },

    /**
     * Apply base unrest from kingdom size and metropolises
     * 
     * Base unrest sources (per Reignmaker rules):
     * - Kingdom size: +1 unrest per X hexes (configurable, default 8)
     * - Metropolis complexity: +1 unrest per Metropolis
     */
    async applyBaseUnrest() {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }

      const kingdom = actor.getKingdomData();
      if (!kingdom) {
        logger.error('❌ [StatusPhaseController] No kingdom data available');
        return;
      }

      // Get setting value (with fallback to 8)
      // @ts-ignore - Foundry globals
      let hexesPerUnrest = 8; // default
      try {
        hexesPerUnrest = (game.settings.get('pf2e-reignmaker', 'hexesPerUnrest') as number) || 8;
      } catch (error) {
        logger.warn('⚠️ [StatusPhaseController] Setting not available yet, using default (8)');
      }
      
      // Calculate base unrest sources
      const hexUnrest = Math.floor(kingdom.size / hexesPerUnrest);
      const metropolisCount = kingdom.settlements.filter(
        s => s.tier === SettlementTier.METROPOLIS
      ).length;
      
      const totalBaseUnrest = hexUnrest + metropolisCount;

      if (totalBaseUnrest > 0) {
        // Create display-only modifiers for Status phase UI
        const displayModifiers: any[] = [];
        
        if (hexUnrest > 0) {
          displayModifiers.push({
            id: 'status-size-unrest',
            name: 'Kingdom Size',
            description: `Your kingdom's ${kingdom.size} hexes generate unrest as it becomes harder to govern`,
            sourceType: 'structure',
            modifiers: [{
              resource: 'unrest',
              value: hexUnrest,
              duration: 'permanent'
            }]
          });
        }
        
        if (metropolisCount > 0) {
          displayModifiers.push({
            id: 'status-metropolis-unrest',
            name: 'Metropolis Complexity',
            description: `${metropolisCount} ${metropolisCount === 1 ? 'metropolis' : 'metropolises'} create additional governance complexity`,
            sourceType: 'structure',
            modifiers: [{
              resource: 'unrest',
              value: metropolisCount,
              duration: 'permanent'
            }]
          });
        }
        
        await actor.updateKingdomData((k) => {
          k.unrest = (k.unrest || 0) + totalBaseUnrest;
          
          // Store display modifiers in turnState for Status phase UI
          if (k.turnState) {
            k.turnState.statusPhase.displayModifiers = displayModifiers;
          }
        });
        
        logger.debug(`📊 [StatusPhaseController] Base unrest applied: +${hexUnrest} (${kingdom.size} hexes ÷ ${hexesPerUnrest}), +${metropolisCount} (metropolises) = +${totalBaseUnrest} total`);
      }
    },

    /**
     * Clean up expired modifiers
     */
    async cleanupExpiredModifiers() {
      const { createModifierService } = await import('../services/ModifierService');
      const modifierService = await createModifierService();
      await modifierService.cleanupExpiredModifiers();
    },

    /**
     * Apply permanent modifiers from structures
     * 
     * Permanent modifiers come from built structures and are applied each turn.
     * This is different from immediate/ongoing/turn-based modifiers from events/incidents.
     * 
     * Note: These use a legacy format with duration: 'permanent' (not part of typed EventModifier system)
     */
    async applyPermanentModifiers() {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }

      // Get active modifiers with permanent duration
      const kingdom = actor.getKingdomData();
      if (!kingdom) {
        logger.error('❌ [StatusPhaseController] No kingdom data available');
        return;
      }

      // Legacy permanent modifiers use a simplified structure (not typed EventModifier)
      interface LegacyPermanentModifier {
        resource: string;
        value: number | string;
        duration: 'permanent';
      }

      const permanentModifiers = (kingdom.activeModifiers || []).filter(
        (mod: any) => mod.modifiers?.some((m: any) => m.duration === 'permanent')
      );

      if (permanentModifiers.length === 0) {
        return;
      }

      logger.debug(`🏛️ [StatusPhaseController] Applying ${permanentModifiers.length} permanent modifiers`);

      // Apply each permanent modifier's effects
      for (const modifier of permanentModifiers) {
        for (const mod of modifier.modifiers || []) {
          const legacyMod = mod as unknown as LegacyPermanentModifier;
          if (legacyMod.duration === 'permanent') {
            const resource = legacyMod.resource;
            const value = typeof legacyMod.value === 'string' ? parseInt(legacyMod.value, 10) : legacyMod.value;
            
            if (isNaN(value)) {
              logger.warn(`⚠️ [StatusPhaseController] Invalid permanent modifier value: ${legacyMod.value} for ${resource} (source: ${modifier.sourceType})`);
              continue;
            }

            await actor.updateKingdomData((kingdom) => {
              if (!kingdom.resources) {
                kingdom.resources = {};
              }

              const currentValue = kingdom.resources[resource] || 0;
              const newValue = Math.max(0, currentValue + value);
              kingdom.resources[resource] = newValue;

              logger.debug(`  ✓ Permanent modifier: ${value > 0 ? '+' : ''}${value} ${resource} (${currentValue} → ${newValue})`);
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
        logger.error('❌ [StatusPhaseController] No KingdomActor available');
        return;
      }

      const kingdom = actor.getKingdomData();
      if (!kingdom) {
        logger.error('❌ [StatusPhaseController] No kingdom data available');
        return;
      }

      const currentTurn = kingdom.currentTurn || 1;

      // Case 1: No turnState exists (first run or legacy save)
      if (!kingdom.turnState) {
        logger.debug('🔄 [StatusPhaseController] No turnState found, initializing...');
        
        // Fresh initialization (no migration needed - data is already clean)
        await actor.updateKingdomData((k) => {
          k.turnState = createDefaultTurnState(currentTurn);
        });
        
        logger.debug('✅ [StatusPhaseController] turnState initialized for turn', currentTurn);
        return;
      }

      // Case 2: turnState exists but turn number mismatch (turn advanced)
      if (kingdom.turnState.turnNumber !== currentTurn) {
        logger.debug('🔄 [StatusPhaseController] Turn advanced, resetting turnState...');
        logger.debug(`   Previous turn: ${kingdom.turnState.turnNumber}, Current turn: ${currentTurn}`);
        
        await actor.updateKingdomData((k) => {
          k.turnState = createDefaultTurnState(currentTurn);
        });
        
        logger.debug('✅ [StatusPhaseController] turnState reset for turn', currentTurn);
        return;
      }

      // Case 3: turnState exists and matches current turn (phase navigation within same turn)
      logger.debug('✅ [StatusPhaseController] turnState already initialized for turn', currentTurn);
    }
  };
}
