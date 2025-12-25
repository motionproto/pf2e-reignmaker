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
import { getFortificationTier } from '../data/fortificationTiers';

export async function createUpkeepPhaseController() {
  return {
    async startPhase() {
      reportPhaseStart('UpkeepPhaseController');
      
      try {
        // Phase guard - prevents initialization when not in Upkeep phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.UPKEEP, 'UpkeepPhaseController');
        if (guardResult) return guardResult;
        
        // NOTE: Vote cleanup now handled by TurnManager.endOfTurnCleanup()
        
        // Get current kingdom state
        const { kingdomData } = await import('../stores/KingdomStore');
        const kingdom = get(kingdomData);
        
        // Initialize steps with CORRECT completion state from the start
        // No workarounds needed - steps reflect kingdom state directly
        
        // Check if military support is needed (armies OR fortifications requiring maintenance)
        // Only count player-led, non-exempt armies (allied armies don't require upkeep)
        const { PLAYER_KINGDOM } = await import('../types/ownership');
        const hasArmies = (kingdom.armies || []).filter((a: any) => 
          a.ledBy === PLAYER_KINGDOM && !a.exemptFromUpkeep
        ).length > 0;
        const hexes = kingdom.hexes || [];
        const currentTurn = kingdom.currentTurn;
        // Only check fortifications on player-claimed hexes
        const hasFortifications = hexes.some(hex => 
          hex.claimedBy === PLAYER_KINGDOM &&
          hex.fortification && 
          hex.fortification.tier > 0 && 
          hex.fortification.turnBuilt !== currentTurn  // Skip fortifications built this turn
        );
        
        const steps = [
          { name: 'Feed Settlements', completed: 0 },  // Always manual
          { name: 'Support Military', completed: (!hasArmies && !hasFortifications) ? 1 : 0 },
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

        await this.processBuildProjects();
        
        // Complete process builds step (using type-safe constant)
        await completePhaseStepByIndex(UpkeepPhaseSteps.PROCESS_BUILDS);
        
        return createPhaseResult(true);
      } catch (error) {
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },
    
    /**
     * Process end-of-turn fame tracking
     * Fame is NO LONGER converted to unrest reduction automatically.
     * Fame is now ONLY used for rerolls (player choice during checks).
     * This makes unrest management require active engagement through actions and structures.
     */
    async processFameConversion() {
      const actor = getKingdomActor();
      if (!actor) {
        logger.error('❌ [UpkeepPhaseController] No KingdomActor available');
        return;
      }

      const kingdom = actor.getKingdomData();
      if (!kingdom) {
        logger.error('❌ [UpkeepPhaseController] No kingdom data available');
        return;
      }
      
      // Check if we already processed this turn
      if (kingdom.turnState?.upkeepPhase?.fameConversion) {
        return; // Already processed
      }

      const currentFame = kingdom.fame || 0;
      
      logger.info(`⭐ [UpkeepPhaseController] End of turn: ${currentFame} unspent fame (fame no longer converts to unrest reduction)`);

      // Store result in turnState for UI display (no unrest reduction applied)
      await actor.updateKingdomData((k: any) => {
        // Fame does NOT reduce unrest anymore - must use Deal with Unrest action or structures
        // Just record what happened for the UI
        if (k.turnState?.upkeepPhase) {
          k.turnState.upkeepPhase.fameConversion = {
            fameUsed: currentFame,
            unrestReduced: 0  // No automatic reduction
          };
        }
      });
      
      if (currentFame > 0) {
        logger.info(`⭐ [UpkeepPhaseController] ${currentFame} fame expires unused (save it for rerolls next time!)`);
      } else {
        logger.info(`⭐ [UpkeepPhaseController] No fame accumulated this turn`);
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
      const { kingdomData } = await import('../stores/KingdomStore');
      const { PLAYER_KINGDOM } = await import('../types/ownership');
      const { SettlementTierConfig, SettlementTier } = await import('../models/Settlement');
      const { settlementService } = await import('../services/settlements');
      const kingdom = get(kingdomData);
      const hexes = kingdom.hexes || [];
      
      // IMPORTANT: Always filter for PLAYER_KINGDOM settlements, not the currentFaction view
      // The GM may be viewing a different faction, but upkeep always applies to the player's kingdom
      const settlements = (kingdom.settlements || []).filter(s => {
        const hex = hexes.find(h => h.row === s.location.x && h.col === s.location.y);
        return hex?.claimedBy === PLAYER_KINGDOM;
      });
      
      const armies = kingdom.armies || [];
      const currentFood = kingdom.resources?.food || 0;

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
      
      // Sort settlements by priority: capital first, then by tier (descending: 4 → 3 → 2 → 1)
      const sortedSettlements = [...settlements].sort((a, b) => {
        // Capital always comes first
        if (a.isCapital && !b.isCapital) return -1;
        if (!a.isCapital && b.isCapital) return 1;
        
        // Otherwise sort by tier (highest first)
        return tierToNumber(b.tier) - tierToNumber(a.tier);
      });
      
      let availableFood = currentFood;
      let totalUnrest = 0;
      const fedSettlements: string[] = [];
      const unfedSettlements: Array<{name: string, tier: string, tierNum: number, unrest: number}> = [];
      
      // Feed settlements in priority order
      // Always consume available food even if not enough to fully feed
      for (const settlement of sortedSettlements) {
        const config = SettlementTierConfig[settlement.tier];
        const required = config ? config.foodConsumption : 0;
        const tierNum = tierToNumber(settlement.tier);
        
        if (availableFood >= required) {
          // Fully fed - consume food and mark as fed
          availableFood -= required;
          settlement.wasFedLastTurn = true;
          fedSettlements.push(`${settlement.name} (${settlement.tier})`);

        } else {
          // Not enough food - consume what's available and mark as unfed
          availableFood = 0;  // Consume all remaining food
          settlement.wasFedLastTurn = false;
          totalUnrest += tierNum;
          unfedSettlements.push({ name: settlement.name, tier: settlement.tier, tierNum, unrest: tierNum });

        }
      }
      
      // NOTE: Food storage enforcement moved to TurnManager.endOfTurnCleanup()
      // This allows the UI to show the correct food amount after feeding,
      // with decay happening when "End Turn" is clicked.

      // Update kingdom state
      await actor.updateKingdomData((kingdom: any) => {
        kingdom.resources.food = availableFood;
        kingdom.unrest += totalUnrest;
        
        // Update settlement fed status
        sortedSettlements.forEach((sorted, index) => {
          const original = kingdom.settlements.find((s: any) => s.name === sorted.name);
          if (original) {
            original.wasFedLastTurn = sorted.wasFedLastTurn;
          }
        });
      });
      
      // Summary logging

      if (totalUnrest > 0) {

      }
      if (unfedSettlements.length > 0) {

      }
    },

    /**
     * Process military support - Feed armies, pay gold costs, and maintain fortifications
     */
    async processMilitarySupport() {
      const { kingdomData } = await import('../stores/KingdomStore');
      const { PLAYER_KINGDOM } = await import('../types/ownership');
      const kingdom = get(kingdomData);
      
      // Count only player-led, non-exempt armies for upkeep
      // Allied armies and armies led by other factions don't require player upkeep
      const armyCount = (kingdom.armies || []).filter((a: any) => 
        a.ledBy === PLAYER_KINGDOM && !a.exemptFromUpkeep
      ).length;
      const hexes = kingdom.hexes || [];
      
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
      
      if (armyCount > 0) {
        if (currentFood >= armyFood) {
          foodAfterArmies = currentFood - armyFood;

        } else {
          armyFoodUnrest = armyFood - currentFood;
          foodAfterArmies = 0;

        }
      }
      
      // Calculate fortification maintenance costs
      // Only include fortifications on player-claimed hexes
      // Skip maintenance for fortifications built/upgraded this turn
      const currentTurn = kingdom.currentTurn;
      let totalFortificationCost = 0;
      const fortificationDetails: Array<{hexId: string, tier: number, cost: number}> = [];
      const skippedNewFortifications: string[] = [];
      
      for (const hex of hexes) {
        // Only maintain fortifications on player-claimed hexes
        if (hex.claimedBy !== PLAYER_KINGDOM) continue;
        
        if (hex.fortification && hex.fortification.tier > 0) {
          // Skip maintenance if built/upgraded this turn
          if (hex.fortification.turnBuilt === currentTurn) {
            skippedNewFortifications.push(hex.id);

            continue;
          }
          
          const tierConfig = getFortificationTier(hex.fortification.tier);
          const cost = tierConfig?.maintenance || 0;
          totalFortificationCost += cost;
          if (cost > 0) {
            fortificationDetails.push({
              hexId: hex.id,
              tier: hex.fortification.tier,
              cost
            });
          }
        }
      }
      
      // Pay gold support costs (armies + fortifications)
      const armySupportCost = armyCount;
      const totalGoldCost = armySupportCost + totalFortificationCost;
      const currentGold = kingdom.resources?.gold || 0;
      let goldUnrest = 0;
      let availableForFortifications = 0;
      
      // Prioritize army upkeep first, then fortifications
      if (currentGold >= totalGoldCost) {
        // Can afford everything
        await actor.updateKingdomData((kingdom: any) => {
          kingdom.resources.food = foodAfterArmies;
          kingdom.resources.gold = currentGold - totalGoldCost;
          kingdom.unrest += armyFoodUnrest;
          
          // Mark all fortifications as paid
          for (const hex of kingdom.hexes) {
            if (hex.fortification) {
              hex.fortification.maintenancePaid = true;
            }
          }
        });

      } else if (currentGold >= armySupportCost) {
        // Can afford armies but not all fortifications
        availableForFortifications = currentGold - armySupportCost;
        await actor.updateKingdomData((kingdom: any) => {
          kingdom.resources.food = foodAfterArmies;
          kingdom.resources.gold = 0;
          kingdom.unrest += armyFoodUnrest;
          
          // Mark fortifications as unpaid (effectiveness reduced by 1 tier)
          for (const hex of kingdom.hexes) {
            if (hex.fortification) {
              hex.fortification.maintenancePaid = false;
            }
          }
        });


      } else {
        // Can't afford army support - generate unrest
        goldUnrest = armySupportCost - currentGold;
        
        // Each army generates MAX 1 unrest (even if both unfed AND unpaid)
        // Use Math.max() to prevent stacking penalties
        const armyUnrest = Math.max(armyFoodUnrest, goldUnrest);
        
        await actor.updateKingdomData((kingdom: any) => {
          kingdom.resources.food = foodAfterArmies;
          kingdom.resources.gold = 0;
          kingdom.unrest += armyUnrest;
          
          // Mark fortifications as unpaid
          for (const hex of kingdom.hexes) {
            if (hex.fortification) {
              hex.fortification.maintenancePaid = false;
            }
          }
        });


      }
      
      // Summary - use Math.max to reflect actual unrest applied
      const totalUnrest = Math.max(armyFoodUnrest, goldUnrest);
      if (totalUnrest > 0) {

      }
      
      // Check for unsupported armies and trigger morale checks
      await this.processUnsupportedArmies();
    },
    
    /**
     * Process unsupported armies - increment turnsUnsupported and trigger morale checks
     * Called at the end of processMilitarySupport
     */
    async processUnsupportedArmies() {
      const { kingdomData, updateKingdom } = await import('../stores/KingdomStore');
      const { PLAYER_KINGDOM } = await import('../types/ownership');
      const kingdom = get(kingdomData);
      
      // Find player armies that are unsupported and not exempt from upkeep
      const playerArmies = (kingdom.armies || []).filter((a: any) => 
        a.ledBy === PLAYER_KINGDOM && !a.exemptFromUpkeep
      );
      
      const unsupportedArmies = playerArmies.filter((a: any) => !a.isSupported);
      
      if (unsupportedArmies.length === 0) {
        logger.info('✅ [UpkeepPhaseController] All armies are supported');
        return;
      }
      
      logger.warn(`⚠️ [UpkeepPhaseController] ${unsupportedArmies.length} unsupported armies found`);
      
      // Increment turnsUnsupported for each unsupported army
      await updateKingdom((k: any) => {
        for (const unsupported of unsupportedArmies) {
          const army = k.armies.find((a: any) => a.id === unsupported.id);
          if (army) {
            army.turnsUnsupported = (army.turnsUnsupported || 0) + 1;
            logger.info(`📉 [UpkeepPhaseController] ${army.name} now unsupported for ${army.turnsUnsupported} turn(s)`);
          }
        }
      });
      
      // Trigger morale checks for unsupported armies
      const armyIds = unsupportedArmies.map((a: any) => a.id);
      
      try {
        const { armyService } = await import('../services/army');
        
        // Show notification before opening morale panel
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn(`${unsupportedArmies.length} unsupported ${unsupportedArmies.length === 1 ? 'army requires' : 'armies require'} morale check!`);
        
        // Open morale check panel with custom title for unsupported armies
        const results = await armyService.checkArmyMorale(armyIds, { title: 'Unsupported Armies' });
        
        // Log results
        const disbanded = results.filter(r => r.disbanded).length;
        const survived = results.filter(r => !r.disbanded).length;
        
        if (disbanded > 0) {
          logger.warn(`💀 [UpkeepPhaseController] ${disbanded} army/armies disbanded from failed morale checks`);
        }
        if (survived > 0) {
          logger.info(`✅ [UpkeepPhaseController] ${survived} army/armies passed morale checks`);
        }
      } catch (error) {
        logger.error('❌ [UpkeepPhaseController] Failed to process morale checks:', error);
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
          await actor.updateKingdomData((k: any) => {
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

          } else {
            partiallyPaid.push(`${project.structureName}: ${paidSummary}`);

          }
        } else {

        }
      }

      if (completed.length > 0) {

      }
      if (partiallyPaid.length > 0) {
        logger.debug(`💰 Partial payments: ${partiallyPaid.join('; ')}`);
      }
    },

    /**
     * Get display data for the UI
     *
     * This function reads actual values from the data store rather than simulating.
     * The store is the source of truth - as steps complete, values update automatically.
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
      const { PLAYER_KINGDOM } = await import('../types/ownership');

      // Get step completion status
      const feedSettlementsCompleted = await isStepCompletedByIndex(UpkeepPhaseSteps.FEED_SETTLEMENTS);
      const supportMilitaryCompleted = await isStepCompletedByIndex(UpkeepPhaseSteps.SUPPORT_MILITARY);

      const settlements = kingdomData.settlements || [];
      const allArmies = kingdomData.armies || [];
      // Filter for player-led, non-exempt armies for consumption calculations
      const armies = allArmies.filter((a: any) =>
        a.ledBy === PLAYER_KINGDOM && !a.exemptFromUpkeep
      );
      const hexes = kingdomData.hexes || [];
      const consumption = calculateConsumption(settlements, armies, hexes);
      const armySupport = calculateArmySupportCapacity(settlements, hexes);
      const unsupportedCount = calculateUnsupportedArmies(armies, settlements, hexes);

      // Read actual values from the store - this is the source of truth
      const currentFood = kingdomData.resources?.food || 0;
      const armyCount = armies.length;
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

      // Filter for player settlements
      const playerSettlements = (kingdomData.settlements || []).filter((s: any) => {
        const hex = hexes.find(h => h.row === s.location.x && h.col === s.location.y);
        return hex?.claimedBy === PLAYER_KINGDOM;
      });

      // Sort by priority: capital first, then by tier (descending)
      const sortedSettlements = [...playerSettlements].sort((a, b) => {
        if (a.isCapital && !b.isCapital) return -1;
        if (!a.isCapital && b.isCapital) return 1;
        return tierToNumber(b.tier) - tierToNumber(a.tier);
      });

      // Calculate unfed settlements preview (only if step not yet completed)
      const unfedSettlements: Array<{name: string, tier: string, tierNum: number, unrest: number}> = [];
      let unfedUnrest = 0;

      if (!feedSettlementsCompleted) {
        // Preview which settlements would be unfed with current food
        let previewFood = currentFood;
        for (const settlement of sortedSettlements) {
          const config = SettlementTierConfig[settlement.tier as keyof typeof SettlementTierConfig];
          const required = config ? config.foodConsumption : 0;
          const tierNum = tierToNumber(settlement.tier);

          if (previewFood >= required) {
            previewFood -= required;
          } else {
            previewFood = 0;
            unfedSettlements.push({
              name: settlement.name,
              tier: settlement.tier,
              tierNum,
              unrest: tierNum
            });
            unfedUnrest += tierNum;
          }
        }
      }

      // Food available for armies = current food in store
      // After settlements are fed, this reflects post-settlement food
      // After military is processed, this reflects final food
      const foodRemainingForArmies = currentFood;

      // Calculate shortages based on current food vs requirements
      const settlementFoodShortage = feedSettlementsCompleted ? 0 : Math.max(0, consumption.settlementFood - currentFood);
      const armyFoodShortage = supportMilitaryCompleted ? 0 : Math.max(0, consumption.armyFood - currentFood);

      // Calculate excess food beyond storage capacity
      const excessFood = Math.max(0, currentFood - foodStorageCapacity);
      
      // Calculate fortification maintenance costs (skip fortifications built this turn)
      // Only include fortifications on player-claimed hexes
      const currentTurn = kingdomData.currentTurn;
      let totalFortificationCost = 0;
      let fortificationCount = 0;
      
      for (const hex of hexes) {
        // Only maintain fortifications on player-claimed hexes
        if (hex.claimedBy !== PLAYER_KINGDOM) continue;
        
        if (hex.fortification && hex.fortification.tier > 0) {
          // Skip maintenance if built/upgraded this turn
          if (hex.fortification.turnBuilt === currentTurn) {
            continue;
          }
          
          // Count ALL fortifications requiring processing, regardless of cost
          // This matches the logic in startPhase() for step auto-completion
          fortificationCount++;
          
          const tierConfig = getFortificationTier(hex.fortification.tier);
          const cost = tierConfig?.maintenance || 0;
          totalFortificationCost += cost;
        }
      }
      
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
        fortificationMaintenanceCost: totalFortificationCost,
        fortificationCount: fortificationCount,
        stepsCompleted: {
          feedSettlements: await isStepCompletedByIndex(UpkeepPhaseSteps.FEED_SETTLEMENTS),
          supportMilitary: await isStepCompletedByIndex(UpkeepPhaseSteps.SUPPORT_MILITARY),
          processBuilds: await isStepCompletedByIndex(UpkeepPhaseSteps.PROCESS_BUILDS)
        }
      };
    }
  };
}
