/**
 * Balanced Strategy - Smarter AI for realistic gameplay
 * 
 * Key improvements:
 * - Dynamic phase-based weights (early/mid/late game)
 * - Prioritize unrest reduction EARLY (at 2+, not 5+)
 * - Build unrest-reducing structures proactively
 * - Balance expansion with stability
 * - Ensure food supply before expanding
 * - Context-aware reductions (stop scouting when >80 explored)
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { CheckPipeline } from '../../types/CheckPipeline';
import type { Strategy, KingdomPhase } from './index';
import { pickRandom, getKingdomPhase } from './index';

export class BalancedStrategy implements Strategy {
  name = 'Balanced';
  private rng: () => number;
  
  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }
  
  selectAction(
    kingdom: KingdomData,
    availableActions: CheckPipeline[],
    canPerform: (action: CheckPipeline) => boolean
  ): CheckPipeline | null {
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
    
    // Count unclaimed hexes we can see (approximation: hexes adjacent to claimed territory)
    const claimedHexIds = new Set((kingdom.hexes || []).filter(h => h.claimedBy === 'player').map(h => h.id));
    const visibleUnclaimedHexes = (kingdom.hexes || []).filter(h => 
      !h.claimedBy && this.isAdjacentToClaimed(h.id, claimedHexIds)
    ).length;
    
    if (unrest <= 3 && claimedHexes < maxSustainableHexes) {
      // Only scout if we have less than 6 visible unclaimed hexes
      if (visibleUnclaimedHexes < 6) {
        const scoutAction = available.find(a => a.id === 'send-scouts');
        if (scoutAction && this.rng() < expansionChance) return scoutAction;
      }
      
      // Claim available hexes (always try if available)
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
    // Use economic aid and diplomatic relations when struggling
    // =====================================================
    
    // Request economic aid if very low on gold (can be done once every few turns)
    if (gold < 3 && this.rng() < 0.4) {
      const economicAidAction = available.find(a => a.id === 'request-economic-aid');
      if (economicAidAction) return economicAidAction;
    }
    
    // Establish diplomatic relations early (benefits for trade, aid, etc.)
    // Only do this occasionally and when stable
    if (unrest <= 3 && gold >= 2 && this.rng() < 0.15) {
      const diplomaticAction = available.find(a => a.id === 'establish-diplomatic-relations');
      if (diplomaticAction) return diplomaticAction;
    }
    
    // Collect stipend from counting house
    if (gold < 5) {
      const economicActions = available.filter(a => 
        ['collect-stipend', 'sell-surplus'].includes(a.id)
      );
      if (economicActions.length > 0 && this.rng() < 0.5) {
        return pickRandom(economicActions, this.rng);
      }
    }
    
    // =====================================================
    // PRIORITY 8: NEW SETTLEMENTS - When territory supports it
    // Each settlement requires 1 food/turn, but provides gold + support
    // Target: 1 settlement per 15-20 hexes
    // =====================================================
    const settlementsNeeded = Math.floor(claimedHexes / 15);
    
    if (settlements < settlementsNeeded && settlements < 4 && gold >= 4 && unrest <= 3 && food >= (settlements + 1) * 3) {
      const settlementAction = available.find(a => a.id === 'establish-settlement');
      if (settlementAction && this.rng() < 0.5) return settlementAction;
    }
    
    // =====================================================
    // PRIORITY 8.5: UPGRADE SETTLEMENTS - Grow your kingdom!
    // Upgrade Village -> Town -> City as soon as requirements are met
    // Higher tier = more structures, better economy
    // =====================================================
    if (settlements > 0 && gold >= 10 && unrest <= 4) {
      const firstSettlement = kingdom.settlements?.[0];
      
      // Check if we can upgrade (need lots available and resources)
      const canUpgrade = firstSettlement && (
        (firstSettlement.level === 1 && firstSettlement.tier === 'Village') ||
        (firstSettlement.level >= 4 && firstSettlement.tier === 'Town')
      );
      
      if (canUpgrade) {
        const upgradeAction = available.find(a => a.id === 'upgrade-settlement');
        if (upgradeAction && this.rng() < 0.6) return upgradeAction;
      }
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
    // FALLBACK: Dynamic phase-based weighted random selection
    // Weights adapt based on kingdom phase and current state
    // =====================================================
    const weights = this.getDynamicWeights(kingdom);
    
    const weightedPool: CheckPipeline[] = [];
    for (const action of available) {
      const weight = weights[action.id] || 5;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(action);
      }
    }
    
    return pickRandom(weightedPool, this.rng);
  }
  
  /**
   * Get dynamic weights based on kingdom phase and current state
   */
  private getDynamicWeights(kingdom: KingdomData): Record<string, number> {
    const phase = getKingdomPhase(kingdom);
    const hexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    const explored = kingdom.hexes?.filter(h => h.explored).length || 0;
    const worksites = kingdom.hexes?.filter(h => h.worksite).length || 0;
    const settlements = kingdom.settlements?.length || 0;
    
    const weights: Record<string, number> = {};
    
    // =====================================================
    // EARLY PHASE: Focus on expansion and basic infrastructure
    // =====================================================
    if (phase === 'early') {
      weights['send-scouts'] = 18;
      weights['claim-hexes'] = 18;
      weights['create-worksite'] = 16;
      weights['harvest-resources'] = 12;  // Important early before worksites
      weights['build-structure'] = 14;
      weights['collect-stipend'] = 10;
      weights['establish-settlement'] = 10;
      weights['sell-surplus'] = 8;
      weights['purchase-resources'] = 6;
      weights['recruit-unit'] = 6;
      weights['build-roads'] = 4;
    }
    // =====================================================
    // MID PHASE: Balanced growth across all areas
    // =====================================================
    else if (phase === 'mid') {
      weights['send-scouts'] = 10;
      weights['claim-hexes'] = 12;
      weights['create-worksite'] = 14;
      weights['build-structure'] = 20;    // Higher priority - develop settlements
      weights['establish-settlement'] = 12;
      weights['upgrade-settlement'] = 10;
      weights['build-roads'] = 8;
      weights['purchase-resources'] = 10;
      weights['sell-surplus'] = 10;
      weights['collect-stipend'] = 8;
      weights['harvest-resources'] = 6;
      weights['recruit-unit'] = 10;
      weights['train-army'] = 8;
      weights['outfit-army'] = 6;
      weights['establish-diplomatic-relations'] = 8;
      weights['request-economic-aid'] = 6;
    }
    // =====================================================
    // LATE PHASE: Optimization and advanced development
    // =====================================================
    else {
      weights['send-scouts'] = 5;         // Much lower - most territory explored
      weights['claim-hexes'] = 8;
      weights['build-structure'] = 25;    // Focus on development
      weights['build-roads'] = 12;
      weights['upgrade-settlement'] = 15;
      weights['establish-diplomatic-relations'] = 12;
      weights['diplomatic-mission'] = 10;
      weights['recruit-unit'] = 10;
      weights['train-army'] = 10;
      weights['outfit-army'] = 8;
      weights['collect-stipend'] = 8;
      weights['purchase-resources'] = 8;
      weights['sell-surplus'] = 8;
      weights['create-worksite'] = 8;
      weights['fortify-hex'] = 8;
      weights['repair-structure'] = 6;
      weights['request-economic-aid'] = 6;
      weights['request-military-aid'] = 6;
    }
    
    // =====================================================
    // Context-aware adjustments (apply on top of phase weights)
    // =====================================================
    
    // Reduce scouting when already explored a lot
    if (explored > 80) {
      weights['send-scouts'] = 2;
    } else if (explored > 50) {
      weights['send-scouts'] = Math.min(weights['send-scouts'] || 10, 6);
    }
    
    // Reduce claiming when territory is large
    if (hexes > 60) {
      weights['claim-hexes'] = 5;
    } else if (hexes > 40) {
      weights['claim-hexes'] = Math.min(weights['claim-hexes'] || 12, 8);
    }
    
    // Increase harvest when worksites are few
    if (worksites < 3) {
      weights['harvest-resources'] = 15;
    }
    
    // Increase road building when multiple settlements exist
    if (settlements >= 2) {
      weights['build-roads'] = Math.max(weights['build-roads'] || 5, 10);
    }
    
    return weights;
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
  
  /**
   * Get prioritized structure types based on kingdom needs
   * Returns structure names in priority order for prepareResolutionData
   * Now with category diversity tracking
   */
  getPriorityStructures(kingdom: KingdomData): string[] {
    const unrest = kingdom.unrest || 0;
    const armies = kingdom.armies || [];
    const settlements = kingdom.settlements || [];
    
    // Count existing structures to avoid duplicates
    const existingStructures = new Set<string>();
    const categoryCount: Record<string, number> = {};
    
    for (const settlement of settlements) {
      for (const structure of settlement.structures || []) {
        const id = structure.id || structure.name.toLowerCase();
        existingStructures.add(id);
        
        // Track by category
        const category = structure.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    }
    
    const priorities: string[] = [];
    
    // =====================================================
    // CRITICAL: Unrest reduction (if unrest >= 3)
    // =====================================================
    if (unrest >= 3) {
      if (!existingStructures.has('tavern')) priorities.push('Tavern');
      if (!existingStructures.has('shrine')) priorities.push('Shrine');
      if (!existingStructures.has('temple')) priorities.push('Temple');
      if (!existingStructures.has('theater')) priorities.push('Theater');
      if (!existingStructures.has('arena')) priorities.push('Arena');
    }
    
    // =====================================================
    // HIGH: Army support (if armies >= support capacity)
    // =====================================================
    const currentArmies = armies.length;
    let armySupportCapacity = 0;
    for (const settlement of settlements) {
      armySupportCapacity += 1;
      for (const structure of settlement.structures || []) {
        if (structure.id === 'garrison') armySupportCapacity += 1;
        if (structure.id === 'fortress') armySupportCapacity += 2;
      }
    }
    
    if (currentArmies >= armySupportCapacity - 1) {
      if (!existingStructures.has('garrison')) priorities.push('Garrison');
      if (!existingStructures.has('fortress')) priorities.push('Fortress');
    }
    
    // =====================================================
    // CATEGORY DIVERSITY: Rotate through under-represented categories
    // =====================================================
    
    // Define category rotation with example structures
    const categoryStructures: Record<string, string[]> = {
      'commercial': ['Counting House', 'Market', 'Trade Shop', 'Bank'],
      'entertainment': ['Tavern', 'Inn', 'Theater', 'Arena'],
      'religious': ['Shrine', 'Temple', 'Cathedral', 'Graveyard'],
      'residential': ['Houses', 'Tenement', 'Mansion'],
      'military': ['Garrison', 'Barracks', 'Fortress', 'Watchtower'],
      'storage': ['Granary', 'Storehouses', 'Warehouse'],
      'crafting': ['Smithy', 'Foundry', 'Mill']
    };
    
    // Sort categories by count (least first)
    const sortedCategories = Object.keys(categoryStructures)
      .sort((a, b) => (categoryCount[a] || 0) - (categoryCount[b] || 0));
    
    // Add structures from under-represented categories
    for (const category of sortedCategories.slice(0, 3)) {
      for (const structureName of categoryStructures[category] || []) {
        const structureId = structureName.toLowerCase().replace(/\s+/g, '-');
        if (!existingStructures.has(structureId) && !priorities.includes(structureName)) {
          priorities.push(structureName);
          break; // Only one per category to encourage diversity
        }
      }
    }
    
    // =====================================================
    // BASELINE: Essential structures every kingdom should have
    // =====================================================
    if (!existingStructures.has('counting-house')) {
      priorities.push('Counting House');
    }
    if (!existingStructures.has('market') && !existingStructures.has('marketplace')) {
      priorities.push('Marketplace');
    }
    if (!existingStructures.has('jail')) {
      priorities.push('Jail');
    }
    if (!existingStructures.has('granary')) {
      priorities.push('Granary');
    }
    
    // =====================================================
    // ADVANCED: Later-game structures
    // =====================================================
    if (unrest >= 4 && !existingStructures.has('cathedral')) {
      priorities.push('Cathedral');
    }
    if (!existingStructures.has('library')) {
      priorities.push('Library');
    }
    
    // FALLBACK: Generic useful structures
    if (!existingStructures.has('smithy')) priorities.push('Smithy');
    if (!existingStructures.has('watchtower')) priorities.push('Watchtower');
    
    return priorities;
  }
  
  /**
   * Check if a hex is adjacent to any claimed hex
   */
  private isAdjacentToClaimed(hexId: string, claimedHexIds: Set<string>): boolean {
    const [rowStr, colStr] = hexId.split('.');
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);
    
    // Offset coordinate neighbors (odd-q vertical layout)
    const adjacentOffsets = col % 2 === 0
      ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]   // Even column
      : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]; // Odd column
    
    for (const [dr, dc] of adjacentOffsets) {
      const neighborId = `${row + dr}.${col + dc}`;
      if (claimedHexIds.has(neighborId)) return true;
    }
    return false;
  }
}
