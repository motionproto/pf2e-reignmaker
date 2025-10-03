/**
 * UpkeepPhaseController - Handles settlement feeding, military support, and build processing
 * 
 * NEW: Uses simplified step array system with feed-settlements, support-military, and process-builds steps.
 * Resource decay has been moved to StatusPhaseController (beginning of turn).
 */

import { getKingdomActor } from '../stores/KingdomStore';
import { get } from 'svelte/store';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers';

// Define steps for Upkeep Phase - FIXED structure
const UPKEEP_PHASE_STEPS = [
  { name: 'Feed Settlements' },     // Step 0 - MANUAL (always requires user interaction)
  { name: 'Support Military' },    // Step 1 - CONDITIONAL (auto if no armies)
  { name: 'Build Queue' }  // Step 2 - CONDITIONAL (auto if no projects)
];

export async function createUpkeepPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('UpkeepPhaseController');
      
      try {
        // Initialize phase with predefined steps
        await initializePhaseSteps(UPKEEP_PHASE_STEPS);
        
        // Auto-mark skipped steps as complete (only when there's nothing to process)
        const { kingdomData } = await import('../stores/KingdomStore');
        const kingdom = get(kingdomData);
        
        // Auto-complete military support ONLY if no armies
        const armyCount = kingdom.armies?.length || 0;
        if (armyCount === 0) {
          await completePhaseStepByIndex(1); // Step 1 = support-military
          console.log('✅ [UpkeepPhaseController] Military support auto-completed (no armies)');
        }
        
        // Auto-complete build queue ONLY if no projects
        const buildQueueCount = kingdom.buildQueue?.length || 0;
        if (buildQueueCount === 0) {
          await completePhaseStepByIndex(2); // Step 2 = process-builds
          console.log('✅ [UpkeepPhaseController] Build queue auto-completed (no projects)');
        }
        
        // Settlement feeding is NEVER auto-completed - always requires user interaction
        console.log('🟡 [UpkeepPhaseController] Settlement feeding requires manual completion');
        
        reportPhaseComplete('UpkeepPhaseController');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('UpkeepPhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Feed settlements step
     */
    async feedSettlements() {
      if (await isStepCompletedByIndex(0)) { // Step 0 = feed-settlements
        return createPhaseResult(false, 'Settlements already fed this turn');
      }

      try {
        console.log('🍞 [UpkeepPhaseController] Processing settlement feeding...');
        await this.processFoodConsumption();
        
        // Complete step 0 (feed-settlements)
        await completePhaseStepByIndex(0);
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Support military step
     */
    async supportMilitary() {
      if (await isStepCompletedByIndex(1)) { // Step 1 = support-military
        return createPhaseResult(false, 'Military already supported this turn');
      }

      try {
        console.log('⚔️ [UpkeepPhaseController] Processing military support...');
        await this.processMilitarySupport();
        
        // Complete step 1 (support-military)
        await completePhaseStepByIndex(1);
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Process build queue step
     */
    async processBuilds() {
      if (await isStepCompletedByIndex(2)) { // Step 2 = process-builds
        return createPhaseResult(false, 'Build queue already processed this turn');
      }

      try {
        console.log('🏗️ [UpkeepPhaseController] Processing build queue...');
        await this.processBuildProjects();
        
        // Complete step 2 (process-builds)
        await completePhaseStepByIndex(2);
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Process food consumption for settlements
     * 
     * NEW: Settlements fed by tier priority (highest first: Metropolis → City → Town → Village)
     * Unfed settlements generate unrest equal to their tier level
     */
    async processFoodConsumption() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const { SettlementTierConfig, SettlementTier } = await import('../models/Settlement');
      const kingdom = get(kingdomData);
      
      const settlements = kingdom.settlements || [];
      const armies = kingdom.armies || [];
      const currentFood = kingdom.resources?.food || 0;
      
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UpkeepPhaseController] No KingdomActor available');
        return;
      }
      
      // Map settlement tier enum to numeric values for sorting and unrest calculation
      const tierToNumber = (tier: typeof SettlementTier[keyof typeof SettlementTier]): number => {
        switch (tier) {
          case SettlementTier.VILLAGE: return 1;
          case SettlementTier.TOWN: return 2;
          case SettlementTier.CITY: return 3;
          case SettlementTier.METROPOLIS: return 4;
          default: return 1;
        }
      };
      
      // Sort settlements by tier (descending: 4 → 3 → 2 → 1)
      const sortedSettlements = [...settlements].sort((a, b) => tierToNumber(b.tier) - tierToNumber(a.tier));
      
      let availableFood = currentFood;
      let totalUnrest = 0;
      const fedSettlements: string[] = [];
      const unfedSettlements: Array<{name: string, tier: string, tierNum: number, unrest: number}> = [];
      
      // Feed settlements in priority order
      for (const settlement of sortedSettlements) {
        const config = SettlementTierConfig[settlement.tier];
        const required = config ? config.foodConsumption : 0;
        const tierNum = tierToNumber(settlement.tier);
        
        if (availableFood >= required) {
          availableFood -= required;
          settlement.wasFedLastTurn = true;
          fedSettlements.push(`${settlement.name} (${settlement.tier})`);
          console.log(`🍞 [UpkeepPhaseController] Fed: ${settlement.name} (${settlement.tier}, ${required} food)`);
        } else {
          settlement.wasFedLastTurn = false;
          totalUnrest += tierNum;
          unfedSettlements.push({ name: settlement.name, tier: settlement.tier, tierNum, unrest: tierNum });
          console.log(`❌ [UpkeepPhaseController] Unfed: ${settlement.name} (${settlement.tier}) → +${tierNum} Unrest`);
        }
      }
      
      // Feed armies with remaining food
      const armyFood = armies.length;
      let armyUnrest = 0;
      
      if (availableFood >= armyFood) {
        availableFood -= armyFood;
        console.log(`⚔️ [UpkeepPhaseController] Fed ${armies.length} armies (${armyFood} food)`);
      } else {
        armyUnrest = armyFood - availableFood;
        totalUnrest += armyUnrest;
        availableFood = 0;
        console.log(`❌ [UpkeepPhaseController] Army food shortage: ${armyUnrest} missing → +${armyUnrest} Unrest`);
      }
      
      // Update kingdom state
      await actor.updateKingdom((kingdom) => {
        kingdom.resources.food = availableFood;
        kingdom.unrest += totalUnrest;
        
        // Update settlement fed status
        sortedSettlements.forEach((sorted, index) => {
          const original = kingdom.settlements.find(s => s.name === sorted.name);
          if (original) {
            original.wasFedLastTurn = sorted.wasFedLastTurn;
          }
        });
      });
      
      // Summary logging
      console.log(`✅ [UpkeepPhaseController] Feeding complete: ${fedSettlements.length} fed, ${unfedSettlements.length} unfed`);
      if (totalUnrest > 0) {
        console.log(`⚠️ [UpkeepPhaseController] Total unrest generated: +${totalUnrest} (${unfedSettlements.length} settlements + ${armyUnrest} army shortage)`);
      }
      if (unfedSettlements.length > 0) {
        console.log(`📋 [UpkeepPhaseController] Unfed settlements will not generate gold next turn`);
      }
    },

    /**
     * Process military support costs
     */
    async processMilitarySupport() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      const armyCount = kingdom.armies?.length || 0;
      if (armyCount === 0) {
        console.log('🛡️ [UpkeepPhaseController] No armies to support');
        return;
      }
      
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UpkeepPhaseController] No KingdomActor available');
        return;
      }
      
      // Simple military support cost
      const supportCost = armyCount;
      const currentGold = kingdom.resources?.gold || 0;
      
      if (currentGold >= supportCost) {
        await actor.updateKingdom((kingdom) => {
          kingdom.resources.gold = currentGold - supportCost;
        });
        console.log(`💰 [UpkeepPhaseController] Paid ${supportCost} gold for military support`);
      } else {
        // Can't afford support - generate unrest
        const shortage = supportCost - currentGold;
        await actor.updateKingdom((kingdom) => {
          kingdom.resources.gold = 0;
          kingdom.unrest += shortage;
        });
        console.log(`⚠️ [UpkeepPhaseController] Military support shortage: ${shortage} unrest generated`);
      }
    },

    /**
     * Process build queue projects
     */
    async processBuildProjects() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      const buildQueue = kingdom.buildQueue || [];
      if (buildQueue.length === 0) {
        console.log('🏗️ [UpkeepPhaseController] No build projects to process');
        return;
      }
      
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [UpkeepPhaseController] No KingdomActor available');
        return;
      }
      
      // Actually process and remove completed projects from the queue
      await actor.updateKingdom((kingdom) => {
        const completedProjects = [...kingdom.buildQueue];
        kingdom.buildQueue = []; // Clear the queue - projects are completed
        
        console.log(`🏗️ [UpkeepPhaseController] Completed ${completedProjects.length} build projects:`, 
          completedProjects.map(p => p.structureId));
      });
      
      console.log(`✅ [UpkeepPhaseController] Processed ${buildQueue.length} build projects`);
    },

    /**
     * Get display data for the UI
     */
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
          settlementFoodShortage: 0,
          unfedSettlements: [],
          unfedUnrest: 0,
          stepsCompleted: {
            feedSettlements: false,
            supportMilitary: false,
            processBuilds: false
          }
        };
      }

      // Use proper consumption service
      const { calculateConsumption, calculateArmySupportCapacity, calculateUnsupportedArmies } = await import('../services/economics/consumption');
      const { SettlementTierConfig, SettlementTier } = await import('../models/Settlement');
      
      const settlements = kingdomData.settlements || [];
      const armies = kingdomData.armies || [];
      const consumption = calculateConsumption(settlements, armies);
      const armySupport = calculateArmySupportCapacity(settlements);
      const unsupportedCount = calculateUnsupportedArmies(armies, settlements);
      
      const currentFood = kingdomData.resources?.food || 0;
      const armyCount = armies.length;
      
      // Map settlement tier enum to numeric values
      const tierToNumber = (tier: typeof SettlementTier[keyof typeof SettlementTier]): number => {
        switch (tier) {
          case SettlementTier.VILLAGE: return 1;
          case SettlementTier.TOWN: return 2;
          case SettlementTier.CITY: return 3;
          case SettlementTier.METROPOLIS: return 4;
          default: return 1;
        }
      };
      
      // Calculate which settlements would be fed/unfed based on current food (simulation)
      const sortedSettlements = [...settlements].sort((a, b) => tierToNumber(b.tier) - tierToNumber(a.tier));
      let availableFood = currentFood;
      const unfedSettlements: Array<{name: string, tier: string, tierNum: number, unrest: number}> = [];
      let unfedUnrest = 0;
      
      for (const settlement of sortedSettlements) {
        const config = SettlementTierConfig[settlement.tier];
        const required = config ? config.foodConsumption : 0;
        const tierNum = tierToNumber(settlement.tier);
        
        if (availableFood >= required) {
          availableFood -= required;
        } else {
          unfedSettlements.push({ 
            name: settlement.name, 
            tier: settlement.tier, 
            tierNum,
            unrest: tierNum 
          });
          unfedUnrest += tierNum;
        }
      }
      
      const foodRemainingForArmies = Math.max(0, availableFood);
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
        settlementFoodShortage,
        unfedSettlements,
        unfedUnrest,
        stepsCompleted: {
          feedSettlements: await isStepCompletedByIndex(0), // Step 0 = feed-settlements
          supportMilitary: await isStepCompletedByIndex(1), // Step 1 = support-military
          processBuilds: await isStepCompletedByIndex(2)    // Step 2 = process-builds
        }
      };
    }
  };
}
