/**
 * StatusPhaseController - Shows kingdom status and applies ongoing modifiers
 * This phase auto-completes immediately.
 * 
 * NOTE: Resource decay and fame initialization are now handled by TurnManager.endOfTurnCleanup() 
 * and TurnManager.initializeTurn(), not here.
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
import { TurnPhase, type KingdomData } from '../actors/KingdomActor';
import { StatusPhaseSteps } from './shared/PhaseStepConstants';
import { createDefaultTurnState } from '../models/TurnState';
import { SettlementTier, type Settlement } from '../models/Settlement';
import { logger } from '../utils/Logger';
import type { BuildProject } from '../services/buildQueue/BuildProject';

export async function createStatusPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('StatusPhaseController');
      
      try {
        // Phase guard - prevents initialization when not in Status phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.STATUS, 'StatusPhaseController');
        if (guardResult) return guardResult;
        
        // Clean up any stale base modifiers from displayModifiers (now computed reactively)
        // This handles legacy data from before the reactive refactor
        await this.cleanupStaleDisplayModifiers();
        
        // Check if Status phase was already completed this turn (prevents duplicate processing)
        // This handles the case where user navigates away and back to Status phase
        const actor = getKingdomActor();
        const kingdom = actor?.getKingdomData();
        if (kingdom?.turnState?.statusPhase?.completed) {
          return createPhaseResult(true);
        }
        
        // Initialize single step that handles all status processing
        const steps = [
          { name: 'Status' }
        ];
        
        await initializePhaseSteps(steps);
        
        // Clear applied outcomes from previous turn
        await this.clearAppliedOutcomes();
        
        // Clear previous turn's incident
        await this.clearPreviousIncident();
        
        // Clear completed build projects from previous turn
        await this.clearCompletedProjects();
        
        // NOTE: Resource decay, fame initialization, and turnState reset
        // are now handled by TurnManager.endOfTurnCleanup() and TurnManager.initializeTurn()
        
        // Apply base unrest (size + metropolises)
        await this.applyBaseUnrest();
        
        // Clean up expired modifiers
        await this.cleanupExpiredModifiers();
        
        // Apply permanent modifiers from structures
        await this.applyPermanentModifiers();
        
        // Apply ongoing modifiers (custom events like demand-structure)
        await this.applyOngoingModifiers();
        
        // NOTE: Custom modifiers with turn-based durations are now applied in Resources Phase
        // after income collection (so there are resources to modify)
        
        // Apply automatic structure effects (Donjon converts unrest, etc.)
        await this.applyAutomaticStructureEffects();
        
        // Mark Status phase as completed BEFORE completing the step
        await actor?.updateKingdomData((k: KingdomData) => {
          if (k.turnState?.statusPhase) {
            k.turnState.statusPhase.completed = true;
          }
        });
        
        // Auto-complete the single step immediately (using type-safe constant)
        await completePhaseStepByIndex(StatusPhaseSteps.STATUS);

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

    },

    /**
     * Clear previous turn's incident data
     * Now handled by turnState reset in ensureTurnState()
     */
    async clearPreviousIncident() {
      // This is now automatically handled by turnState reset
      // No need to manually clear - turnState.unrestPhase resets on turn advance

    },

    /**
     * Clean up stale and duplicate modifiers from displayModifiers
     * 
     * This cleanup removes:
     * 1. Legacy stored base modifiers (now computed reactively in UI)
     * 2. Fame conversion modifiers (now handled in Upkeep Phase)
     * 3. Duplicate modifiers with the same ID (legacy data accumulation)
     */
    async cleanupStaleDisplayModifiers() {
      const actor = getKingdomActor();
      if (!actor) return;
      
      await actor.updateKingdomData((k: KingdomData) => {
        if (!k.turnState?.statusPhase?.displayModifiers) return;

        // Filter out modifiers that are no longer displayed in Status Phase:
        // - Base modifiers (now computed reactively in UI)
        // - Fame conversion (moved to Upkeep Phase)
        let filtered = k.turnState.statusPhase.displayModifiers.filter(
          (m: any) => m.id && 
            !m.id.startsWith('status-size') && 
            !m.id.startsWith('status-metropolis') &&
            !m.id.startsWith('fame-conversion')
        );
        
        // Deduplicate by ID - keep only the first occurrence of each ID
        const seen = new Set<string>();
        filtered = filtered.filter((m: any) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        
        k.turnState.statusPhase.displayModifiers = filtered;
      });
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

      await actor.updateKingdomData((k: KingdomData) => {
        if (!k.buildQueue || k.buildQueue.length === 0) return;
        
        const beforeCount = k.buildQueue.length;
        k.buildQueue = k.buildQueue.filter((p: BuildProject) => !p.isCompleted);
        const removed = beforeCount - k.buildQueue.length;
        
        if (removed > 0) {

        }
      });
    },


    /**
     * Apply base unrest from kingdom size, metropolises, and demanded hexes
     * 
     * Base unrest sources (per Reignmaker rules):
     * - Kingdom size: +1 unrest per X hexes (configurable, default 8)
     * - Metropolis complexity: +1 unrest per Metropolis
     * - Citizens Demand Expansion: +1 unrest per unclaimed demanded hex
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
        (s: Settlement) => s.tier === SettlementTier.METROPOLIS
      ).length;
      
      // Count demanded hexes that are NOT claimed by the player
      // These generate +1 unrest per hex until claimed
      const PLAYER_KINGDOM = 'player';
      const demandedHexCount = (kingdom.hexes || []).filter((h: any) => {
        const features = h.features || [];
        const hasDemanded = features.some((f: any) => f.type === 'demanded');
        const notPlayerClaimed = !h.claimedBy || h.claimedBy !== PLAYER_KINGDOM;
        return hasDemanded && notPlayerClaimed;
      }).length;
      
      const totalBaseUnrest = hexUnrest + metropolisCount + demandedHexCount;

      // Note: Base status modifiers (size, metropolis) are now computed REACTIVELY
      // in StatusPhase.svelte, not stored here. This prevents duplicate display issues.
      // Only one-time events (fame conversion, donjon) are stored in displayModifiers.
      
      if (totalBaseUnrest > 0) {
        await actor.updateKingdomData((k: KingdomData) => {
          k.unrest = (k.unrest || 0) + totalBaseUnrest;
          
          // Ensure displayModifiers array exists for one-time events
          if (k.turnState && !k.turnState.statusPhase.displayModifiers) {
            k.turnState.statusPhase.displayModifiers = [];
          }
        });
      } else {
        // Even with 0 unrest, we need to ensure displayModifiers array exists
        await actor.updateKingdomData((k: KingdomData) => {
          if (k.turnState && !k.turnState.statusPhase.displayModifiers) {
            k.turnState.statusPhase.displayModifiers = [];
          }
        });
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

            await actor.updateKingdomData((kingdom: KingdomData) => {
              if (!kingdom.resources) {
                kingdom.resources = {};
              }

              const currentValue = kingdom.resources[resource] || 0;
              const newValue = Math.max(0, currentValue + value);
              kingdom.resources[resource] = newValue;

            });
          }
        }
      }
    },

    /**
     * Apply ongoing modifiers from custom sources (e.g., demand-structure event)
     * 
     * Ongoing modifiers generate their effects each turn until removed.
     * This is different from permanent modifiers (structures) and immediate/turn-based modifiers.
     */
    async applyOngoingModifiers() {
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

      // Find modifiers with ongoing duration
      const ongoingModifiers = (kingdom.activeModifiers || []).filter(
        (mod: any) => mod.modifiers?.some((m: any) => m.duration === 'ongoing')
      );

      if (ongoingModifiers.length === 0) {
        return;
      }

      // Apply each ongoing modifier's effects
      for (const modifier of ongoingModifiers) {
        for (const mod of modifier.modifiers || []) {
          if (mod.duration === 'ongoing') {
            const resource = mod.resource;
            const value = typeof mod.value === 'string' ? parseInt(mod.value, 10) : mod.value;
            
            if (isNaN(value)) {
              continue;
            }

            await actor.updateKingdomData((k: KingdomData) => {
              if (!k.resources) {
                k.resources = {} as any;
              }

              const currentValue = k.resources[resource] || 0;
              const newValue = Math.max(0, currentValue + value);
              k.resources[resource] = newValue;
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
    async ensureTurnState(): Promise<void> {
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

        // Fresh initialization (no migration needed - data is already clean)
        await actor.updateKingdomData((k: KingdomData) => {
          k.turnState = createDefaultTurnState(currentTurn);
          // Clear faction aid tracking for new turn
          k.factionsAidedThisTurn = [];
        });

        return;
      }

      // Case 2: turnState exists but turn number mismatch (turn advanced)
      if (kingdom.turnState.turnNumber !== currentTurn) {


        await actor.updateKingdomData((k: KingdomData) => {
          k.turnState = createDefaultTurnState(currentTurn);
          // Clear faction aid tracking for new turn
          k.factionsAidedThisTurn = [];
        });

        return;
      }

      // Case 3: turnState exists and matches current turn (phase navigation within same turn)

    },

    /**
     * Apply automatic structure effects (Donjon convert unrest, etc.)
     */
    async applyAutomaticStructureEffects() {
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

      const { structuresService } = await import('../services/structures/index');
      const effects = structuresService.processAutomaticEffects(kingdom.settlements);

      // Handle unrest conversion (Donjon)
      if (effects.convertedUnrest > 0 && kingdom.unrest > 0) {
        // Calculate available imprisoned unrest capacity
        let availableCapacity = 0;
        for (const settlement of kingdom.settlements) {
          const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
          const current = settlement.imprisonedUnrest || 0;
          availableCapacity += Math.max(0, capacity - current);
        }
        
        // Only convert if we have capacity available
        if (availableCapacity > 0) {
          const amountToConvert = Math.min(
            effects.convertedUnrest,  // How much Donjon can convert
            kingdom.unrest,           // How much unrest we have
            availableCapacity         // How much capacity we have
          );
          
          // Use GameCommandsService to allocate imprisoned unrest
          const { createGameCommandsService } = await import('../services/GameCommandsService');
          const commandsService = await createGameCommandsService();
          
          // Create result tracker
          const result = {
            success: true,
            applied: { resources: [] }
          };
          
          // Convert regular unrest to imprisoned unrest
          await actor.updateKingdomData((k: KingdomData) => {
            k.unrest = (k.unrest || 0) - amountToConvert;
            
            // Add notification to Status phase display
            if (k.turnState?.statusPhase) {
              if (!k.turnState.statusPhase.displayModifiers) {
                k.turnState.statusPhase.displayModifiers = [];
              }
              k.turnState.statusPhase.displayModifiers.push({
                id: 'donjon-conversion',
                name: 'Donjon Automatic Conversion',
                description: `Your Donjon automatically converted ${amountToConvert} regular unrest to imprisoned unrest`,
                sourceType: 'structure',
                modifiers: [
                  {
                    type: 'static',
                    resource: 'unrest',
                    value: -amountToConvert,
                    duration: 'immediate'
                  },
                  {
                    type: 'static',
                    resource: 'imprisonedUnrest',
                    value: amountToConvert,
                    duration: 'immediate'
                  }
                ]
              });
            }
          });
          
          // Apply imprisoned unrest (auto-allocates to settlements with capacity)
          await commandsService.applyResourceChange(
            'imprisonedUnrest',
            amountToConvert,
            'Donjon Auto-Convert',
            result
          );
        } else {
          // No capacity - add notification
          await actor.updateKingdomData((k: KingdomData) => {
            if (k.turnState?.statusPhase) {
              if (!k.turnState.statusPhase.displayModifiers) {
                k.turnState.statusPhase.displayModifiers = [];
              }
              k.turnState.statusPhase.displayModifiers.push({
                id: 'donjon-capacity-full',
                name: 'Donjon Conversion Failed',
                description: 'Your Donjon could not convert unrest - all prisons are at full capacity',
                sourceType: 'structure',
                modifiers: []
              });
            }
          });
        }
      }
    }
  };
}
