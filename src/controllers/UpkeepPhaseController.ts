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
      console.log('🟡 [UpkeepPhaseController] Starting upkeep phase (manual mode)...');
      
      try {
        // Auto-mark skipped steps as complete
        const { kingdomData } = await import('../stores/KingdomStore');
        const kingdom = get(kingdomData);
        
        // Auto-complete military support if no armies
        const armyCount = kingdom.armies?.length || 0;
        if (armyCount === 0) {
          await markPhaseStepCompleted('upkeep-military');
          console.log('✅ [UpkeepPhaseController] Military support auto-completed (no armies)');
        }
        
        // Auto-complete build queue if no projects
        const buildQueueCount = kingdom.buildQueue?.length || 0;
        if (buildQueueCount === 0) {
          await markPhaseStepCompleted('upkeep-build');
          console.log('✅ [UpkeepPhaseController] Build queue auto-completed (no projects)');
        }
        
        console.log('✅ [UpkeepPhaseController] Upkeep phase ready for manual operations');
        return { success: true };
      } catch (error) {
        console.error('❌ [UpkeepPhaseController] Upkeep phase failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    // Individual manual operation methods
    async processFeedSettlements() {
      console.log('🔄 [UpkeepPhaseController] Manually processing settlement food...');
      await this.processFoodConsumption();
      await markPhaseStepCompleted('upkeep-food');
      return { success: true };
    },

    async processMilitarySupportManual() {
      console.log('🔄 [UpkeepPhaseController] Manually processing military support...');
      await this.processMilitarySupport();
      await markPhaseStepCompleted('upkeep-military');
      return { success: true };
    },

    async processBuildQueueManual() {
      console.log('🔄 [UpkeepPhaseController] Manually processing build queue...');
      await this.processBuildProjects();
      await markPhaseStepCompleted('upkeep-build');
      return { success: true };
    },

    async completePhase() {
      console.log('🔄 [UpkeepPhaseController] Completing upkeep phase...');
      
      // Process resource decay
      await this.processResourceDecay();
      
      // Mark phase as completed
      await markPhaseStepCompleted('upkeep-complete');
      
      // Notify phase complete
      await this.notifyPhaseComplete();
      console.log('✅ [UpkeepPhaseController] Upkeep phase complete');
      return { success: true };
    },

    async processFoodConsumption() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const { calculateConsumption } = await import('../services/economics/consumption');
      const kingdom = get(kingdomData);
      
      // Use proper consumption service with settlement tier-based calculations
      const settlements = kingdom.settlements || [];
      const armies = kingdom.armies || [];
      const consumption = calculateConsumption(settlements, armies);
      const currentFood = kingdom.resources?.food || 0;
      
      if (currentFood >= consumption.totalFood) {
        // Sufficient food
        await setResource('food', currentFood - consumption.totalFood);
        console.log(`🍞 [UpkeepPhaseController] Consumed ${consumption.totalFood} food (${consumption.settlementFood} settlements + ${consumption.armyFood} armies)`);
      } else {
        // Food shortage - generate unrest
        const shortage = consumption.totalFood - currentFood;
        await setResource('food', 0);
        await modifyResource('unrest', shortage);
        console.log(`⚠️ [UpkeepPhaseController] Food shortage: ${shortage} unrest generated (needed ${consumption.totalFood}, had ${currentFood})`);
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

    async getDisplayData(kingdomData: any) {
      if (!kingdomData) {
        return {
          currentFood: 0,
          foodConsumption: 0,
          foodShortage: 0,
          settlementConsumption: 0,
          armyConsumption: 0,
          armyCount: 0,
          armySupport: 0,
          unsupportedCount: 0,
          foodRemainingForArmies: 0,
          armyFoodShortage: 0,
          settlementFoodShortage: 0
        };
      }

      // Use proper consumption service
      const { calculateConsumption, calculateArmySupportCapacity, calculateUnsupportedArmies } = await import('../services/economics/consumption');
      
      const settlements = kingdomData.settlements || [];
      const armies = kingdomData.armies || [];
      const consumption = calculateConsumption(settlements, armies);
      const armySupport = calculateArmySupportCapacity(settlements);
      const unsupportedCount = calculateUnsupportedArmies(armies, settlements);
      
      const currentFood = kingdomData.resources?.food || 0;
      const armyCount = armies.length;
      
      const foodRemainingForArmies = Math.max(0, currentFood - consumption.settlementFood);
      const settlementFoodShortage = Math.max(0, consumption.settlementFood - currentFood);
      const armyFoodShortage = Math.max(0, consumption.armyFood - foodRemainingForArmies);
      
      return {
        currentFood,
        foodConsumption: consumption.totalFood,
        foodShortage: Math.max(0, consumption.totalFood - currentFood),
        settlementConsumption: consumption.settlementFood,
        armyConsumption: consumption.armyFood,
        armyCount,
        armySupport,
        unsupportedCount,
        foodRemainingForArmies,
        armyFoodShortage,
        settlementFoodShortage
      };
    },

    async notifyPhaseComplete() {
      const { getTurnManager } = await import('../stores/KingdomStore');
      const manager = getTurnManager();
      
      if (manager) {
        await manager.markPhaseComplete();
        console.log('🟡 [UpkeepPhaseController] Notified TurnManager that UpkeepPhase is complete');
      } else {
        throw new Error('No TurnManager available');
      }
    }
  };
}
