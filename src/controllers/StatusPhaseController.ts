/**
 * StatusPhaseController - Simple status phase business logic
 * 
 * Handles the business logic for status phase operations:
 * - Reset fame to 1
 * - Apply active modifiers
 * - Notify TurnManager when complete
 */

import { markPhaseStepCompleted, setResource, modifyResource } from '../stores/KingdomStore';
import { get } from 'svelte/store';

export async function createStatusPhaseController() {
  return {
    async startPhase() {
      console.log('🟡 [StatusPhaseController] Starting status phase...');
      
      try {
        // Step 1: Reset fame to 1
        await this.resetFame();
        await markPhaseStepCompleted('gain-fame');
        console.log('✅ [StatusPhaseController] Fame reset to 1');
        
        // Step 2: Apply modifiers
        await this.applyModifiers();
        await markPhaseStepCompleted('apply-modifiers');
        console.log('✅ [StatusPhaseController] Modifiers applied');
        
        // Step 3: Tell TurnManager we're done
        await this.notifyPhaseComplete();
        console.log('✅ [StatusPhaseController] Status phase complete');
        
        return { success: true };
      } catch (error) {
        console.error('❌ [StatusPhaseController] Status phase failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    
    async resetFame() {
      await setResource('fame', 1);
      console.log('🟡 [StatusPhaseController] Fame set to 1');
    },
    
    async applyModifiers() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      const modifiers = kingdom.modifiers || [];
      console.log(`🟡 [StatusPhaseController] Applying ${modifiers.length} modifiers`);
      
      for (const modifier of modifiers) {
        if (modifier.effects) {
          console.log(`🟡 [StatusPhaseController] Applying modifier: ${modifier.name}`);
          
          // Apply each effect
          for (const [resource, amount] of Object.entries(modifier.effects)) {
            if (amount && typeof amount === 'number') {
              await modifyResource(resource, amount);
              console.log(`🟡 [StatusPhaseController] Applied ${amount} ${resource} from ${modifier.name}`);
            }
          }
        }
      }
    },
    
    async notifyPhaseComplete() {
      const { getTurnManager } = await import('../stores/KingdomStore');
      const manager = getTurnManager();
      
      if (manager) {
        await manager.markCurrentPhaseComplete();
        console.log('🟡 [StatusPhaseController] Notified TurnManager that StatusPhase is complete');
      } else {
        throw new Error('No TurnManager available');
      }
    }
  };
}
