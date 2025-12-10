/**
 * Expansion Strategy - Aggressive kingdom building
 * 
 * Goal: Build a thriving, expansive kingdom
 * - Rapid territory expansion (claim all available land)
 * - Build worksites everywhere for resources
 * - Establish multiple settlements
 * - Keep unrest under control with structures
 * - Dynamic phase-based weights that adapt as kingdom grows
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { CheckPipeline } from '../../types/CheckPipeline';
import type { Strategy, KingdomPhase } from './index';
import { pickRandom, getKingdomPhase } from './index';

export class ExpansionStrategy implements Strategy {
  name = 'Expansion';
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
    const exploredHexes = kingdom.hexes?.filter(h => h.explored).length || 0;
    const settlements = kingdom.settlements?.length || 0;
    const gold = kingdom.resources?.gold || 0;
    const food = kingdom.resources?.food || 0;
    const lumber = kingdom.resources?.lumber || 0;
    const stone = kingdom.resources?.stone || 0;
    const ore = kingdom.resources?.ore || 0;
    const unrest = kingdom.unrest || 0;
    const worksites = kingdom.hexes?.filter(h => h.worksite && h.claimedBy === 'player').length || 0;
    const queueSize = kingdom.buildQueue?.length || 0;
    
    // =====================================================
    // PRIORITY 1: UNREST CONTROL (AGGRESSIVE - prevent collapse!)
    // Target: Keep unrest < 7 at all times
    // =====================================================
    if (unrest >= 8) {
      // CRITICAL - ALL players work on it
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    if (unrest >= 6) {
      // DANGEROUS - high priority (100% chance)
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    if (unrest >= 5 && this.rng() < 0.8) {
      // ELEVATED - very high priority
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    if (unrest >= 4 && this.rng() < 0.6) {
      // MODERATE - high priority
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    if (unrest >= 3 && this.rng() < 0.4) {
      // PROACTIVE - catch it early
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // =====================================================
    // PRIORITY 2: BUILD UNREST-REDUCING STRUCTURES
    // Build structures EARLY and OFTEN
    // Queue 1-4 structures at a time, prioritize when unrest is elevated
    // =====================================================
    if (queueSize < 4 && settlements > 0) {
      let buildChance = 0.6; // Base chance
      
      // Increase chance when unrest is elevated
      if (unrest >= 5) buildChance = 0.9;
      else if (unrest >= 3) buildChance = 0.75;
      
      const buildAction = available.find(a => a.id === 'build-structure');
      if (buildAction && this.rng() < buildChance) return buildAction;
    }
    
    // =====================================================
    // PRIORITY 3: AGGRESSIVE EXPANSION (but only when stable)
    // Phase-aware: reduce expansion drive as kingdom matures
    // =====================================================
    const phase = getKingdomPhase(kingdom);
    
    // Adjust expansion thresholds based on phase
    const claimThreshold = phase === 'early' ? 0.9 : phase === 'mid' ? 0.6 : 0.3;
    const maxHexes = phase === 'early' ? 100 : phase === 'mid' ? 60 : 30;
    
    // Count visible unclaimed hexes (adjacent to claimed territory)
    const claimedHexIds = new Set((kingdom.hexes || []).filter(h => h.claimedBy === 'player').map(h => h.id));
    const visibleUnclaimedHexes = (kingdom.hexes || []).filter(h => 
      !h.claimedBy && this.isAdjacentToClaimed(h.id, claimedHexIds)
    ).length;
    
    // Only scout if we have less than 6 visible unclaimed hexes
    if (visibleUnclaimedHexes < 6 && unrest <= 5 && phase !== 'late') {
      const scoutAction = available.find(a => a.id === 'send-scouts');
      if (scoutAction && this.rng() < 0.7) return scoutAction;
    }
    
    // Claim available adjacent hexes (only when unrest <= 5)
    if (claimedHexes < maxHexes && unrest <= 5) {
      const claimAction = available.find(a => a.id === 'claim-hexes');
      if (claimAction && this.rng() < claimThreshold) return claimAction;
    }
    
    // =====================================================
    // PRIORITY 4: WORKSITE EVERYWHERE (only when stable)
    // Target: 1 worksite per 2 claimed hexes
    // =====================================================
    const worksiteTarget = Math.floor(claimedHexes / 2);
    if (worksites < worksiteTarget && worksites < 40 && unrest <= 6) {
      const worksiteAction = available.find(a => a.id === 'create-worksite');
      if (worksiteAction && this.rng() < 0.8) return worksiteAction;
    }
    
    // =====================================================
    // PRIORITY 5: SETTLEMENTS (every 15-20 hexes)
    // =====================================================
    const settlementTarget = Math.floor(claimedHexes / 18);
    if (settlements < settlementTarget && settlements < 6 && gold >= 4 && food >= (settlements + 1) * 3 && unrest <= 4) {
      const settlementAction = available.find(a => a.id === 'establish-settlement');
      if (settlementAction && this.rng() < 0.7) return settlementAction;
    }
    
    // =====================================================
    // PRIORITY 6: UPGRADE SETTLEMENTS
    // =====================================================
    if (settlements > 0 && gold >= 12 && unrest <= 4) {
      const upgradeAction = available.find(a => a.id === 'upgrade-settlement');
      if (upgradeAction && this.rng() < 0.6) return upgradeAction;
    }
    
    // =====================================================
    // PRIORITY 7: RESOURCE MANAGEMENT
    // =====================================================
    
    // Sell excess resources to prevent decay (keep buffer for building)
    const excessLumber = lumber > 6;
    const excessStone = stone > 6;
    const excessOre = ore > 4;
    
    if ((excessLumber || excessStone || excessOre) && this.rng() < 0.5) {
      const sellAction = available.find(a => a.id === 'sell-surplus');
      if (sellAction) return sellAction;
    }
    
    // Purchase resources if low and have gold
    const needsResources = (lumber < 3 || stone < 3 || ore < 2) && queueSize > 0;
    if (needsResources && gold >= 6) {
      const purchaseAction = available.find(a => a.id === 'purchase-resources');
      if (purchaseAction && this.rng() < 0.6) return purchaseAction;
    }
    
    // Harvest food if critically low
    if (food < settlements * 2) {
      const harvestAction = available.find(a => a.id === 'harvest-resources');
      if (harvestAction && this.rng() < 0.7) return harvestAction;
    }
    
    // Collect stipend for gold
    if (gold < 6) {
      const stipendAction = available.find(a => a.id === 'collect-stipend');
      if (stipendAction && this.rng() < 0.6) return stipendAction;
    }
    
    // Request economic aid if desperate
    if (gold < 3) {
      const aidAction = available.find(a => a.id === 'request-economic-aid');
      if (aidAction && this.rng() < 0.5) return aidAction;
    }
    
    // =====================================================
    // PRIORITY 8: INFRASTRUCTURE
    // =====================================================
    if (gold >= 4 && this.rng() < 0.2) {
      const roadsAction = available.find(a => a.id === 'build-roads');
      if (roadsAction) return roadsAction;
    }
    
    // Diplomatic relations for long-term benefits
    if (gold >= 3 && unrest <= 3 && this.rng() < 0.15) {
      const diplomacyAction = available.find(a => a.id === 'establish-diplomatic-relations');
      if (diplomacyAction) return diplomacyAction;
    }
    
    // =====================================================
    // PRIORITY 9: MILITARY (maintain minimum force)
    // =====================================================
    const armies = kingdom.armies || [];
    const minArmies = Math.floor(claimedHexes / 12); // 1 army per 12 hexes (lighter than balanced)
    
    if (armies.length < minArmies && gold >= 4 && food >= armies.length * 2) {
      const recruitAction = available.find(a => a.id === 'recruit-unit');
      if (recruitAction && this.rng() < 0.3) return recruitAction;
    }
    
    // Train armies occasionally
    if (armies.length > 0 && gold >= 2 && unrest <= 4 && this.rng() < 0.15) {
      const trainAction = available.find(a => a.id === 'train-army');
      if (trainAction) return trainAction;
    }
    
    // =====================================================
    // FALLBACK: Dynamic phase-based weighted expansion focus
    // =====================================================
    const weights = this.getDynamicWeights(kingdom);
    
    const weightedPool: CheckPipeline[] = [];
    for (const action of available) {
      const weight = weights[action.id] || 3;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(action);
      }
    }
    
    return pickRandom(weightedPool, this.rng);
  }
  
  /**
   * Get dynamic weights based on kingdom phase
   * Expansion strategy is aggressive early, but adapts as kingdom matures
   */
  private getDynamicWeights(kingdom: KingdomData): Record<string, number> {
    const phase = getKingdomPhase(kingdom);
    const hexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    const explored = kingdom.hexes?.filter(h => h.explored).length || 0;
    
    const weights: Record<string, number> = {};
    
    // =====================================================
    // EARLY PHASE: Maximum expansion
    // =====================================================
    if (phase === 'early') {
      weights['send-scouts'] = 28;        // Explore aggressively
      weights['claim-hexes'] = 28;        // Claim aggressively
      weights['create-worksite'] = 22;    // Build worksites everywhere
      weights['build-structure'] = 14;
      weights['establish-settlement'] = 12;
      weights['harvest-resources'] = 10;
      weights['collect-stipend'] = 8;
      weights['sell-surplus'] = 6;
      weights['purchase-resources'] = 6;
      weights['recruit-unit'] = 6;
      weights['build-roads'] = 4;
    }
    // =====================================================
    // MID PHASE: Balanced expansion with infrastructure
    // =====================================================
    else if (phase === 'mid') {
      weights['send-scouts'] = 15;
      weights['claim-hexes'] = 18;
      weights['create-worksite'] = 18;
      weights['build-structure'] = 20;    // More structures
      weights['establish-settlement'] = 14;
      weights['upgrade-settlement'] = 10;
      weights['build-roads'] = 10;
      weights['collect-stipend'] = 8;
      weights['purchase-resources'] = 8;
      weights['sell-surplus'] = 8;
      weights['harvest-resources'] = 6;
      weights['recruit-unit'] = 8;
      weights['train-army'] = 6;
      weights['establish-diplomatic-relations'] = 6;
    }
    // =====================================================
    // LATE PHASE: Development and optimization
    // =====================================================
    else {
      weights['send-scouts'] = 6;         // Much less scouting
      weights['claim-hexes'] = 10;
      weights['build-structure'] = 25;
      weights['upgrade-settlement'] = 15;
      weights['build-roads'] = 14;
      weights['create-worksite'] = 10;
      weights['establish-diplomatic-relations'] = 12;
      weights['diplomatic-mission'] = 10;
      weights['recruit-unit'] = 10;
      weights['train-army'] = 10;
      weights['outfit-army'] = 8;
      weights['collect-stipend'] = 8;
      weights['purchase-resources'] = 8;
      weights['sell-surplus'] = 8;
      weights['fortify-hex'] = 8;
      weights['request-economic-aid'] = 6;
      weights['request-military-aid'] = 6;
    }
    
    // Context-aware reductions
    if (explored > 80) weights['send-scouts'] = 3;
    if (hexes > 60) weights['claim-hexes'] = 6;
    
    return weights;
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
