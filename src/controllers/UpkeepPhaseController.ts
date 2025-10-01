/**
 * UpkeepPhaseController - Self-executing upkeep phase controller
 * 
 * Follows the new architecture pattern with startPhase() method.
 * Handles resource decay, project processing, and end-of-turn cleanup.
 */

import { markPhaseStepCompleted, setResource, modifyResource } from '../stores/KingdomStore';
import { get } from 'svelte/store';

export async function createUpkeepPhaseController() {
  return {
    async startPhase() {
      console.log('🟡 [UpkeepPhaseController] Starting upkeep phase...');
      
      try {
        // Execute upkeep phase business logic
        await this.executeUpkeepLogic();
        
        // Mark phase as completed
        await markPhaseStepCompleted('upkeep-complete');
        
        // Notify phase complete
        await this.notifyPhaseComplete();
        console.log('✅ [UpkeepPhaseController] Upkeep phase complete');
        return { success: true };
      } catch (error) {
        console.error('❌ [UpkeepPhaseController] Upkeep phase failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    async executeUpkeepLogic() {
      console.log('🔄 [UpkeepPhaseController] Executing upkeep calculations...');
      
      // Step 1: Process food consumption
      await this.processFoodConsumption();
      await markPhaseStepCompleted('upkeep-food');
      
      // Step 2: Process military support
      await this.processMilitarySupport();
      await markPhaseStepCompleted('upkeep-military');
      
      // Step 3: Process build projects
      await this.processBuildProjects();
      await markPhaseStepCompleted('upkeep-build');
      
      // Step 4: Process resource decay
      await this.processResourceDecay();
    },

    async processFoodConsumption() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      // Simple food consumption logic
      const settlementCount = kingdom.settlements?.length || 0;
      const armyCount = kingdom.armies?.length || 0;
      const totalConsumption = settlementCount + armyCount;
      const currentFood = kingdom.resources?.food || 0;
      
      if (currentFood >= totalConsumption) {
        // Sufficient food
        await setResource('food', currentFood - totalConsumption);
        console.log(`🍞 [UpkeepPhaseController] Consumed ${totalConsumption} food`);
      } else {
        // Food shortage - generate unrest
        const shortage = totalConsumption - currentFood;
        await setResource('food', 0);
        await modifyResource('unrest', shortage);
        console.log(`⚠️ [UpkeepPhaseController] Food shortage: ${shortage} unrest generated`);
      }
    },

    async processMilitarySupport() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      const armyCount = kingdom.armies?.length || 0;
      if (armyCount === 0) {
        console.log('🛡️ [UpkeepPhaseController] No armies to support');
        return;
      }
      
      // Simple military support cost
      const supportCost = armyCount;
      const currentGold = kingdom.resources?.gold || 0;
      
      if (currentGold >= supportCost) {
        await modifyResource('gold', -supportCost);
        console.log(`💰 [UpkeepPhaseController] Paid ${supportCost} gold for military support`);
      } else {
        // Can't afford support - generate unrest
        const shortage = supportCost - currentGold;
        await setResource('gold', 0);
        await modifyResource('unrest', shortage);
        console.log(`⚠️ [UpkeepPhaseController] Military support shortage: ${shortage} unrest generated`);
      }
    },

    async processBuildProjects() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      const buildQueue = kingdom.buildQueue || [];
      if (buildQueue.length === 0) {
        console.log('🏗️ [UpkeepPhaseController] No build projects to process');
        return;
      }
      
      let projectsCompleted = 0;
      for (const project of buildQueue) {
        // Simple project progress logic
        projectsCompleted++;
        console.log(`🏗️ [UpkeepPhaseController] Processed project: ${project.structureId}`);
      }
      
      console.log(`✅ [UpkeepPhaseController] Processed ${projectsCompleted} build projects`);
    },

    async processResourceDecay() {
      // Clear non-storable resources (lumber, stone, ore)
      await setResource('lumber', 0);
      await setResource('stone', 0);
      await setResource('ore', 0);
      console.log('♻️ [UpkeepPhaseController] Cleared non-storable resources');
    },

    async notifyPhaseComplete() {
      const { getTurnManager } = await import('../stores/KingdomStore');
      const manager = getTurnManager();
      
      if (manager) {
        await manager.markCurrentPhaseComplete();
        console.log('🟡 [UpkeepPhaseController] Notified TurnManager that UpkeepPhase is complete');
      } else {
        throw new Error('No TurnManager available');
      }
    }
  };
}
