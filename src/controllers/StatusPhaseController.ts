/**
 * StatusPhaseController - Shows kingdom status and processes resource decay
 * 
 * NEW: Uses simplified step array system with predefined steps.
 * This phase auto-completes immediately and processes resource decay from previous turn.
 */

import { getKingdomActor } from '../stores/KingdomStore';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStep
} from './shared/PhaseControllerHelpers';

// Define steps for Status Phase
const STATUS_PHASE_STEPS = [
  { id: 'show-status', name: 'Show Kingdom Status' }
];

export async function createStatusPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('StatusPhaseController');
      
      try {
        // Initialize phase with predefined steps
        await initializePhaseSteps(STATUS_PHASE_STEPS);
        
        // Process resource decay from previous turn (moved from Upkeep)
        await this.processResourceDecay();
        
        // Set Fame to 1 (initial condition for each turn)
        await this.initializeFame();
        
        // Auto-complete the show-status step
        await completePhaseStep('show-status');
        
        reportPhaseComplete('StatusPhaseController');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('StatusPhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
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
    }
  };
}
