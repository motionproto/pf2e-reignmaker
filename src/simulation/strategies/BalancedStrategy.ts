/**
 * Balanced Strategy - Smarter AI for realistic gameplay
 * 
 * Key improvements:
 * - Prioritize unrest reduction EARLY (at 2+, not 5+)
 * - Build unrest-reducing structures proactively
 * - Balance expansion with stability
 * - Ensure food supply before expanding
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { SimCheck } from '../SimulationData';
import type { Strategy } from './index';
import { pickRandom } from './index';

export class BalancedStrategy implements Strategy {
  name = 'Balanced';
  private rng: () => number;
  
  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }
  
  selectAction(
    kingdom: KingdomData,
    availableActions: SimCheck[],
    canPerform: (action: SimCheck) => boolean
  ): SimCheck | null {
    const available = availableActions.filter(a => canPerform(a));
    if (available.length === 0) return null;
    
    const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    const settlements = kingdom.settlements?.length || 0;
    const gold = kingdom.resources?.gold || 0;
    const food = kingdom.resources?.food || 0;
    const ore = kingdom.resources?.ore || 0;
    const unrest = kingdom.unrest || 0;
    const hasStructures = (kingdom.settlements?.[0]?.structures?.length || 0) > 0;
    const armies = kingdom.armies || [];
    const partyLevel = kingdom.partyLevel || 1;
    
    // =====================================================
    // MILITARY MANAGEMENT: Maintain 1 army per 8 hexes
    // Armies require: food (1/turn) + support capacity
    // Only recruit if we have support capacity!
    // =====================================================
    const requiredArmies = Math.floor(claimedHexes / 8);
    const currentArmies = armies.length;
    
    // Calculate support capacity (1 per settlement tier + structure bonuses)
    let armySupportCapacity = 0;
    for (const settlement of kingdom.settlements || []) {
      // Base support from settlement (1 per tier assumed)
      armySupportCapacity += 1;
      // Structure bonuses (Garrison +1, Fortress +2)
      for (const structure of settlement.structures || []) {
        if (structure.id === 'garrison' || structure.name === 'Garrison') armySupportCapacity += 1;
        if (structure.id === 'fortress' || structure.name === 'Fortress') armySupportCapacity += 2;
        if (structure.id === 'citadel' || structure.name === 'Citadel') armySupportCapacity += 4;
      }
    }
    
    // Only recruit if we have support capacity AND can afford food drain
    const canSupportMoreArmies = currentArmies < armySupportCapacity;
    const canAffordArmyFood = food > (currentArmies + 1) * 3; // Need buffer
    
    if (currentArmies < requiredArmies && canSupportMoreArmies && canAffordArmyFood && gold >= 4) {
      const recruitAction = available.find(a => a.id === 'recruit-unit');
      if (recruitAction) return recruitAction;
    }
    
    // Need more support? Build military structures (only if we need more armies)
    if (currentArmies < requiredArmies && !canSupportMoreArmies && gold >= 4) {
      // This will naturally happen through build-structure priority which favors armySupport
      const buildAction = available.find(a => a.id === 'build-structure');
      if (buildAction && this.rng() < 0.4) return buildAction;
    }
    
    // Train armies to keep half at party level (1 gold cost)
    // Only train when stable (low unrest) and not too often
    if (currentArmies > 0 && unrest <= 4) {
      const underLeveledArmies = armies.filter((a: any) => (a.level || 1) < partyLevel);
      const needTraining = underLeveledArmies.length > currentArmies / 2;
      
      if (needTraining && gold >= 1 && this.rng() < 0.25) {
        const trainAction = available.find(a => a.id === 'train-army');
        if (trainAction) return trainAction;
      }
    }
    
    // Outfit unequipped armies (2 gold + 1 ore cost)
    // Only outfit when stable
    if (currentArmies > 0 && unrest <= 4) {
      const unequippedArmies = armies.filter((a: any) => !a.equipped);
      if (unequippedArmies.length > 0 && gold >= 2 && ore >= 1 && this.rng() < 0.25) {
        const outfitAction = available.find(a => a.id === 'outfit-army');
        if (outfitAction) return outfitAction;
      }
    }
    
    // =====================================================
    // UNREST MANAGEMENT: Act earlier to prevent spirals
    // Territory generates +1 unrest per 8 hexes per turn
    // Must actively reduce to stay sustainable
    // =====================================================
    
    // CRITICAL (7+): Multiple players work on it
    if (unrest >= 7) {
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // DANGEROUS (5-6): One player should address (70% chance)
    if (unrest >= 5 && this.rng() < 0.7) {
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // ELEVATED (4): Address proactively (40% chance)
    if (unrest >= 4 && this.rng() < 0.4) {
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // MODERATE (3): Keep it under control (25% chance)
    if (unrest >= 3 && this.rng() < 0.25) {
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // =====================================================
    // PRIORITY 3: EXPANSION - Scout and claim DIVERSE terrain!
    // More territory = more resources BUT also more unrest (+1 per 8 hexes)
    // Prioritize hills/mountains for stone/ore (rarer than forests)
    // =====================================================
    const maxSustainableHexes = 40; // ~5 unrest/turn from size, manageable with structures
    
    // Check what terrain types we already have worksites on
    const worksiteTerrains = (kingdom.hexes || [])
      .filter(h => h.worksite && h.claimedBy === 'player')
      .map(h => h.terrain);
    const hasQuarry = worksiteTerrains.some(t => t === 'hills' || t === 'mountains');
    const hasMine = worksiteTerrains.some(t => t === 'mountains');
    
    // Prioritize expansion if we need diverse terrain
    const needDiverseTerrain = !hasQuarry || !hasMine;
    const expansionChance = needDiverseTerrain ? 0.8 : 0.5;
    
    if (unrest <= 3 && claimedHexes < maxSustainableHexes) {
      // Scout to reveal new territory
      const scoutAction = available.find(a => a.id === 'send-scouts');
      if (scoutAction && this.rng() < expansionChance) return scoutAction;
      
      // Claim available hexes
      const claimAction = available.find(a => a.id === 'claim-hexes');
      if (claimAction && this.rng() < expansionChance) return claimAction;
    }
    
    // =====================================================
    // PRIORITY 4: WORKSITES - Passive income, but DIVERSIFIED!
    // Don't over-produce one resource - balance lumber/stone/ore/food
    // Target: ~4 lumber, ~4 stone, ~2 ore, ~6 food per turn
    // =====================================================
    const worksites = kingdom.hexes?.filter(h => h.worksite).length || 0;
    const worksiteAction = available.find(a => a.id === 'create-worksite');
    const production = kingdom.worksiteProduction || {};
    
    // Check current production levels
    const lumberProd = production.lumber || 0;
    const stoneProd = production.stone || 0;
    const oreProd = production.ore || 0;
    const foodProd = production.food || 0;
    
    // Only create more worksites if we're under-producing somewhere
    const needMoreLumber = lumberProd < 6;
    const needMoreStone = stoneProd < 4;
    const needMoreOre = oreProd < 2;
    const needMoreFood = foodProd < 8;
    const needAnyResource = needMoreLumber || needMoreStone || needMoreOre || needMoreFood;
    
    // Build worksites if under-diversified (1 per 3 hexes, but only if we need the resources)
    if (worksiteAction && worksites < Math.floor(claimedHexes / 3) && needAnyResource) {
      if (this.rng() < 0.7) return worksiteAction;
    }
    
    // =====================================================
    // PRIORITY 5: TRADE - Convert resources strategically
    // Lumber/stone/ore decay each turn - sell before losing them!
    // Or use gold to buy needed building materials
    // =====================================================
    const lumber = kingdom.resources?.lumber || 0;
    const stone = kingdom.resources?.stone || 0;
    
    // SELL: If we have resources that would decay AND don't need them immediately
    // Sell if > 4 of any resource (they'll decay anyway)
    const queueNeeds = this.calculateQueueNeeds(kingdom);
    const excessLumber = lumber > Math.max(4, queueNeeds.lumber || 0);
    const excessStone = stone > Math.max(4, queueNeeds.stone || 0);
    const excessOre = ore > Math.max(4, queueNeeds.ore || 0);
    
    if ((excessLumber || excessStone || excessOre) && this.rng() < 0.6) {
      const sellAction = available.find(a => a.id === 'sell-surplus');
      if (sellAction) return sellAction;
    }
    
    // PURCHASE: Convert gold to building materials
    // Gold accumulates but resources decay - convert gold to materials before they're needed
    const queueSizeForPurchase = kingdom.buildQueue?.length || 0;
    const needsMaterials = lumber < 3 || stone < 3 || ore < 3;
    const hasGoldToSpare = gold >= 6;
    
    // Always try to convert gold when we have excess and need materials
    if (needsMaterials && hasGoldToSpare && this.rng() < 0.4) {
      const purchaseAction = available.find(a => a.id === 'purchase-resources');
      if (purchaseAction) return purchaseAction;
    }
    
    // Also purchase if build queue is stalled
    if (queueSizeForPurchase > 0 && (lumber < 2 || stone < 2 || ore < 2) && gold >= 4) {
      const purchaseAction = available.find(a => a.id === 'purchase-resources');
      if (purchaseAction && this.rng() < 0.6) return purchaseAction;
    }
    
    // =====================================================
    // PRIORITY 6: LOW FOOD - Need food to survive upkeep
    // Only harvest if worksites aren't sufficient yet
    // =====================================================
    if (food < settlements * 2 && worksites < 2) {
      const harvestAction = available.find(a => a.id === 'harvest-resources');
      if (harvestAction) return harvestAction;
    }
    
    // =====================================================
    // PRIORITY 7: BUILD STRUCTURES (queue as many as you want!)
    // Structures provide ongoing benefits - queue freely, payment happens over time
    // =====================================================
    const queueSize = kingdom.buildQueue?.length || 0;
    
    // First structure is high priority
    if (settlements > 0 && !hasStructures) {
      const buildAction = available.find(a => a.id === 'build-structure');
      if (buildAction) return buildAction;
    }
    
    // Queue more structures - can queue freely, completion depends on resources
    // Higher chance when queue is small, lower when queue is large
    const queueChance = queueSize < 3 ? 0.4 : queueSize < 6 ? 0.2 : 0.1;
    if (settlements > 0 && this.rng() < queueChance) {
      const buildAction = available.find(a => a.id === 'build-structure');
      if (buildAction) return buildAction;
    }
    
    // =====================================================
    // PRIORITY 7: ECONOMIC ACTIONS - Gold is essential
    // =====================================================
    if (gold < 5) {
      const economicActions = available.filter(a => 
        ['collect-stipend', 'sell-surplus', 'request-economic-aid'].includes(a.id)
      );
      if (economicActions.length > 0 && this.rng() < 0.5) {
        return pickRandom(economicActions, this.rng);
      }
    }
    
    // =====================================================
    // PRIORITY 8: NEW SETTLEMENTS - When territory supports it
    // =====================================================
    if (claimedHexes >= 10 && settlements < 2 && gold >= 4 && unrest <= 3) {
      const settlementAction = available.find(a => a.id === 'establish-settlement');
      if (settlementAction && this.rng() < 0.4) return settlementAction;
    }
    
    // =====================================================
    // PRIORITY 9: INFRASTRUCTURE
    // =====================================================
    if (gold >= 3) {
      const roadsAction = available.find(a => a.id === 'build-roads');
      if (roadsAction && this.rng() < 0.15) return roadsAction;
    }
    
    // =====================================================
    // PRIORITY 10: More worksites if we still have eligible hexes
    // =====================================================
    if (worksiteAction && this.rng() < 0.5) return worksiteAction;
    
    // =====================================================
    // FALLBACK: Weighted random selection
    // Note: harvest-resources is LOW priority - worksites are better!
    // =====================================================
    const weights: Record<string, number> = {
      'create-worksite': 20,  // High priority - passive income!
      // deal-with-unrest: NOT in fallback - only triggered by explicit priority checks above
      'build-structure': 18,
      'claim-hexes': 18,       // Expansion is important!
      'send-scouts': 15,       // Need to explore before claiming
      'recruit-unit': 12,      // Military - maintain army
      'train-army': 10,        // Military - level up armies
      'outfit-army': 8,        // Military - equip armies
      'collect-stipend': 10,
      'purchase-resources': 8, // Trade - convert gold to building materials
      'sell-surplus': 8,       // Trade - save resources from decay
      'establish-settlement': 8,
      'harvest-resources': 5,  // Low priority - use worksites instead!
      'build-roads': 5
    };
    
    const weightedPool: SimCheck[] = [];
    for (const action of available) {
      const weight = weights[action.id] || 5;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(action);
      }
    }
    
    return pickRandom(weightedPool, this.rng);
  }
  
  /**
   * Calculate total resources needed by build queue
   */
  private calculateQueueNeeds(kingdom: KingdomData): Record<string, number> {
    const needs: Record<string, number> = { lumber: 0, stone: 0, ore: 0, gold: 0 };
    
    for (const project of kingdom.buildQueue || []) {
      for (const [resource, required] of Object.entries(project.requiredCost || {})) {
        const paid = project.paidCost?.[resource] || 0;
        const remaining = required - paid;
        if (remaining > 0) {
          needs[resource] = (needs[resource] || 0) + remaining;
        }
      }
    }
    
    return needs;
  }
}
