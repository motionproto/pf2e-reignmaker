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
  checkPhaseGuard,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers';
import { TurnPhase } from '../actors/KingdomActor';
import { UpkeepPhaseSteps } from './shared/PhaseStepConstants';
import { logger } from '../utils/Logger';

export async function createUpkeepPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('UpkeepPhaseController');
      
      try {
        // Phase guard - prevents initialization when not in Upkeep phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.UPKEEP, 'UpkeepPhaseController');
        if (guardResult) return guardResult;
        
        // Get current kingdom state
        const { kingdomData } = await import('../stores/KingdomStore');
        const kingdom = get(kingdomData);
        
        // Initialize steps with CORRECT completion state from the start
        // No workarounds needed - steps reflect kingdom state directly
        const steps = [
          { name: 'Feed Settlements', completed: 0 },  // Always manual
          { name: 'Support Military', completed: (kingdom.armies?.length || 0) === 0 ? 1 : 0 },
          { name: 'Build Queue', completed: (kingdom.buildQueue?.length || 0) === 0 ? 1 : 0 }
        ];
        
        await initializePhaseSteps(steps);
        
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
      if (await isStepCompletedByIndex(UpkeepPhaseSteps.FEED_SETTLEMENTS)) {
        return createPhaseResult(false, 'Settlements already fed this turn');
      }

      try {
        logger.debug('🍞 [UpkeepPhaseController] Processing settlement feeding...');
        await this.processFoodConsumption();
        
        // Complete feed settlements step (using type-safe constant)
        await completePhaseStepByIndex(UpkeepPhaseSteps.FEED_SETTLEMENTS);
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Support military step
     */
    async supportMilitary() {
      if (await isStepCompletedByIndex(UpkeepPhaseSteps.SUPPORT_MILITARY)) {
        return createPhaseResult(false, 'Military already supported this turn');
      }

      try {
        logger.debug('⚔️ [UpkeepPhaseController] Processing military support...');
        await this.processMilitarySupport();
        
        // Complete support military step (using type-safe constant)
        await completePhaseStepByIndex(UpkeepPhaseSteps.SUPPORT_MILITARY);
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Process build queue step
     */
    async processBuilds() {
      if (await isStepCompletedByIndex(UpkeepPhaseSteps.PROCESS_BUILDS)) {
        return createPhaseResult(false, 'Build queue already processed this turn');
      }

      try {
        logger.debug('🏗️ [UpkeepPhaseController] Processing build queue...');
        await this.processBuildProjects();
        
        // Complete process builds step (using type-safe constant)
        await completePhaseStepByIndex(UpkeepPhaseSteps.PROCESS_BUILDS);
        
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
     * Excess food beyond storage capacity is automatically lost
     */
    async processFoodConsumption() {
      const { kingdomData, claimedSettlements } = await import('../stores/KingdomStore');
      const { SettlementTierConfig, SettlementTier } = await import('../models/Settlement');
      const { settlementService } = await import('../services/settlements');
      const kingdom = get(kingdomData);
      
      // Use centralized claimedSettlements store (filters by claimed territory)
      const settlements = get(claimedSettlements);
      const allSettlements = kingdom.settlements || [];
      
      const armies = kingdom.armies || [];
      const currentFood = kingdom.resources?.food || 0;
      
      logger.debug(`🍞 [UpkeepPhaseController] Processing ${settlements.length} settlements in claimed territory (${allSettlements.length} total on map)`);
      
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UpkeepPhaseController] No KingdomActor available');
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
          logger.debug(`🍞 [UpkeepPhaseController] Fed: ${settlement.name} (${settlement.tier}, ${required} food)`);
        } else {
          settlement.wasFedLastTurn = false;
          totalUnrest += tierNum;
          unfedSettlements.push({ name: settlement.name, tier: settlement.tier, tierNum, unrest: tierNum });
          logger.debug(`❌ [UpkeepPhaseController] Unfed: ${settlement.name} (${settlement.tier}) → +${tierNum} Unrest`);
        }
      }
      
      // Get food storage capacity from stored resource
      const foodStorageCapacity = kingdom.resources?.foodCapacity || 0;
      let excessFood = 0;
      
      // Enforce storage capacity - excess food is lost
      if (availableFood > foodStorageCapacity) {
        excessFood = availableFood - foodStorageCapacity;
        availableFood = foodStorageCapacity;
        logger.debug(`📦 [UpkeepPhaseController] Storage capacity exceeded: ${excessFood} excess food lost (capacity: ${foodStorageCapacity})`);
      }
      
      // Update kingdom state
      await actor.updateKingdomData((kingdom) => {
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
      logger.debug(`✅ [UpkeepPhaseController] Settlement feeding complete: ${fedSettlements.length} fed, ${unfedSettlements.length} unfed`);
      if (totalUnrest > 0) {
        logger.debug(`⚠️ [UpkeepPhaseController] Total unrest from unfed settlements: +${totalUnrest}`);
      }
      if (unfedSettlements.length > 0) {
        logger.debug(`📋 [UpkeepPhaseController] Unfed settlements will not generate gold next turn`);
      }
      if (excessFood > 0) {
        logger.debug(`⚠️ [UpkeepPhaseController] ${excessFood} excess food lost due to storage capacity`);
      }
    },

    /**
     * Process military support - Feed armies and pay gold costs
     */
    async processMilitarySupport() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const kingdom = get(kingdomData);
      
      const armyCount = kingdom.armies?.length || 0;
      if (armyCount === 0) {
        logger.debug('🛡️ [UpkeepPhaseController] No armies to support');
        return;
      }
      
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UpkeepPhaseController] No KingdomActor available');
        return;
      }
      
      // Feed armies first
      const armyFood = armyCount;
      const currentFood = kingdom.resources?.food || 0;
      let armyFoodUnrest = 0;
      let foodAfterArmies = currentFood;
      
      if (currentFood >= armyFood) {
        foodAfterArmies = currentFood - armyFood;
        logger.debug(`⚔️ [UpkeepPhaseController] Fed ${armyCount} armies (${armyFood} food)`);
      } else {
        armyFoodUnrest = armyFood - currentFood;
        foodAfterArmies = 0;
        logger.debug(`❌ [UpkeepPhaseController] Army food shortage: ${armyFoodUnrest} missing → +${armyFoodUnrest} Unrest`);
      }
      
      // Pay gold support costs
      const supportCost = armyCount;
      const currentGold = kingdom.resources?.gold || 0;
      let goldUnrest = 0;
      
      if (currentGold >= supportCost) {
        await actor.updateKingdomData((kingdom) => {
          kingdom.resources.food = foodAfterArmies;
          kingdom.resources.gold = currentGold - supportCost;
          kingdom.unrest += armyFoodUnrest;
        });
        logger.debug(`💰 [UpkeepPhaseController] Paid ${supportCost} gold for military support`);
      } else {
        // Can't afford support - generate unrest
        goldUnrest = supportCost - currentGold;
        await actor.updateKingdomData((kingdom) => {
          kingdom.resources.food = foodAfterArmies;
          kingdom.resources.gold = 0;
          kingdom.unrest += armyFoodUnrest + goldUnrest;
        });
        logger.debug(`⚠️ [UpkeepPhaseController] Military gold shortage: ${goldUnrest} unrest generated`);
      }
      
      // Summary
      const totalUnrest = armyFoodUnrest + goldUnrest;
      if (totalUnrest > 0) {
        logger.debug(`⚠️ [UpkeepPhaseController] Total military unrest: +${totalUnrest} (food: ${armyFoodUnrest}, gold: ${goldUnrest})`);
      }
    },

    /**
     * Process build queue projects
     * Supports partial payments - pays what's affordable each turn
     */
    async processBuildProjects() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const { buildQueueService } = await import('../services/buildQueue');
      const kingdom = get(kingdomData);
      
      const buildQueue = kingdom.buildQueue || [];
      if (buildQueue.length === 0) {
        logger.debug('🏗️ [UpkeepPhaseController] No build projects to process');
        return;
      }
      
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UpkeepPhaseController] No KingdomActor available');
        return;
      }
      
      const completed: string[] = [];
      const partiallyPaid: string[] = [];
      
      // Track available resources as we process projects
      const availableResources = { ...kingdom.resources };
      
      // Process each project through the service
      for (const project of buildQueue) {
        logger.debug(`🔍 [UpkeepPhaseController] Processing project: ${project.structureName}`);
        
        // Service handles partial payment & persistence using CURRENT available resources
        const result = await buildQueueService.processPartialPayment(
          project.id,
          availableResources
        );
        
        if (result.paid && Object.keys(result.paid).length > 0) {
          // Update running total of available resources
          for (const [resource, amount] of Object.entries(result.paid)) {
            availableResources[resource] = (availableResources[resource] || 0) - amount;
          }
          
          // Deduct paid resources from kingdom
          await actor.updateKingdomData(k => {
            for (const [resource, amount] of Object.entries(result.paid)) {
              k.resources[resource] = Math.max(0, (k.resources[resource] || 0) - amount);
            }
          });
          
          const paidSummary = Object.entries(result.paid)
            .map(([r, a]) => `${r}: ${a}`)
            .join(', ');
          
          if (result.isComplete) {
            // Complete the project via service
            await buildQueueService.completeProject(project.id);
            completed.push(`${project.structureName} in ${project.settlementName}`);
            logger.debug(`✅ [UpkeepPhaseController] Completed: ${project.structureName} (paid: ${paidSummary})`);
          } else {
            partiallyPaid.push(`${project.structureName}: ${paidSummary}`);
            logger.debug(`💰 [UpkeepPhaseController] Partial payment: ${project.structureName} (paid: ${paidSummary})`);
          }
        } else {
          logger.debug(`⏭️ [UpkeepPhaseController] No payment: ${project.structureName} (insufficient resources)`);
        }
      }
      
      logger.debug(`🏗️ [UpkeepPhaseController] Build queue processed: ${completed.length} completed, ${partiallyPaid.length} partial payments`);
      if (completed.length > 0) {
        logger.debug(`✅ Built: ${completed.join(', ')}`);
      }
      if (partiallyPaid.length > 0) {
        logger.debug(`💰 Partial payments: ${partiallyPaid.join('; ')}`);
      }
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
          foodStorageCapacity: 0,
          excessFood: 0,
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
      const hexes = kingdomData.hexes || [];
      const consumption = calculateConsumption(settlements, armies, hexes);
      const armySupport = calculateArmySupportCapacity(settlements, hexes);
      const unsupportedCount = calculateUnsupportedArmies(armies, settlements, hexes);
      
      const currentFood = kingdomData.resources?.food || 0;
      const armyCount = armies.length;
      
      // Get food storage capacity from stored resource
      const foodStorageCapacity = kingdomData.resources?.foodCapacity || 0;
      
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
      // Use centralized claimedSettlements store (already filtered by claimed territory)
      const { claimedSettlements: claimedSettlementsStore } = await import('../stores/KingdomStore');
      const claimedSettlementsData = get(claimedSettlementsStore);
      
      const sortedSettlements = [...claimedSettlementsData].sort((a, b) => tierToNumber(b.tier) - tierToNumber(a.tier));
      let availableFood = currentFood;
      const unfedSettlements: Array<{name: string, tier: string, tierNum: number, unrest: number}> = [];
      let unfedUnrest = 0;
      
      for (const settlement of sortedSettlements) {
        const config = SettlementTierConfig[settlement.tier as keyof typeof SettlementTierConfig];
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
      
      // Calculate excess food (what would be lost after feeding)
      const excessFood = Math.max(0, availableFood - foodStorageCapacity);
      
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
        foodStorageCapacity,
        excessFood,
        stepsCompleted: {
          feedSettlements: await isStepCompletedByIndex(UpkeepPhaseSteps.FEED_SETTLEMENTS),
          supportMilitary: await isStepCompletedByIndex(UpkeepPhaseSteps.SUPPORT_MILITARY),
          processBuilds: await isStepCompletedByIndex(UpkeepPhaseSteps.PROCESS_BUILDS)
        }
      };
    }
  };
}
