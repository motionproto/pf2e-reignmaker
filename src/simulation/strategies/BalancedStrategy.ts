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
    // PRIORITY 3: EXPANSION - Scout and claim, but carefully!
    // More territory = more resources BUT also more unrest (+1 per 8 hexes)
    // Balance expansion with sustainability
    // =====================================================
    // Only expand when unrest is well under control
    // And limit total size to prevent unrest death spiral
    const maxSustainableHexes = 40; // ~5 unrest/turn from size, manageable with structures
    if (unrest <= 3 && claimedHexes < maxSustainableHexes) {
      // Scout to reveal new territory (60% chance)
      const scoutAction = available.find(a => a.id === 'send-scouts');
      if (scoutAction && this.rng() < 0.6) return scoutAction;
      
      // Claim available hexes (70% chance)
      const claimAction = available.find(a => a.id === 'claim-hexes');
      if (claimAction && this.rng() < 0.7) return claimAction;
    }
    
    // =====================================================
    // PRIORITY 4: WORKSITES - Passive income is king!
    // Each worksite produces 1-2 resources EVERY turn.
    // Creating 4 worksites early = 120-240 free resources over 120 turns
    // =====================================================
    const worksites = kingdom.hexes?.filter(h => h.worksite).length || 0;
    const worksiteAction = available.find(a => a.id === 'create-worksite');
    
    // Aggressively build worksites until we have a good base (1 per 2 hexes claimed)
    if (worksiteAction && worksites < Math.floor(claimedHexes / 2)) {
      if (this.rng() < 0.8) return worksiteAction;
    }
    
    // =====================================================
    // PRIORITY 5: LOW FOOD - Need food to survive upkeep
    // Only harvest if worksites aren't sufficient yet
    // =====================================================
    if (food < settlements * 2 && worksites < 2) {
      const harvestAction = available.find(a => a.id === 'harvest-resources');
      if (harvestAction) return harvestAction;
    }
    
    // =====================================================
    // PRIORITY 6: BUILD STRUCTURES (limited - queue handles payment)
    // Structures provide ongoing benefits but shouldn't dominate
    // =====================================================
    const queueSize = kingdom.buildQueue?.length || 0;
    if (settlements > 0 && !hasStructures && queueSize === 0) {
      const buildAction = available.find(a => a.id === 'build-structure');
      if (buildAction) return buildAction;
    }
    
    // Only queue more if queue is empty (15% chance)
    if (settlements > 0 && queueSize === 0 && this.rng() < 0.15) {
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
      'establish-settlement': 8,
      'harvest-resources': 5,  // Low priority - use worksites instead!
      'sell-surplus': 5,
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
}
