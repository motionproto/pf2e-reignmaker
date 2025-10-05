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
        
        // Clear previous turn's incident
        await this.clearPreviousIncident();
        
        // Process resource decay from previous turn (moved from Upkeep)
        await this.processResourceDecay();
        
        // Set Fame to 1 (initial condition for each turn)
        await this.initializeFame();
        
        // Apply permanent modifiers from structures
        await this.applyPermanentModifiers();
        
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
     * Clear previous turn's incident data
     */
    async clearPreviousIncident() {
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdom((kingdom) => {
          kingdom.currentIncidentId = null;
          kingdom.incidentTriggered = false;
          kingdom.incidentRoll = 0;
        });
        console.log('🧹 [StatusPhaseController] Cleared previous turn incident');
      }
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
    }
  };
}
