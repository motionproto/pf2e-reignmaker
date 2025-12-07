/**
 * Expansion Strategy - Territory-focused but not reckless
 * 
 * Prioritizes expansion BUT:
 * - Must manage unrest to avoid collapse
 * - Needs economic foundation to support growth
 * - Builds worksites on new territory
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { SimCheck } from '../SimulationData';
import type { Strategy } from './index';
import { pickRandom } from './index';

export class ExpansionStrategy implements Strategy {
  name = 'Expansion';
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
    const unrest = kingdom.unrest || 0;
    
    // =====================================================
    // PRIORITY 1: CRITICAL UNREST - Even expansion needs stability
    // =====================================================
    if (unrest >= 4) {
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // =====================================================
    // PRIORITY 2: MODERATE UNREST - 50% chance to address
    // =====================================================
    if (unrest >= 2 && this.rng() < 0.5) {
      const unrestAction = available.find(a => a.id === 'deal-with-unrest');
      if (unrestAction) return unrestAction;
    }
    
    // =====================================================
    // PRIORITY 3: MINIMUM FOOD FOR SURVIVAL
    // =====================================================
    if (food < settlements) {
      const harvestAction = available.find(a => a.id === 'harvest-resources');
      if (harvestAction) return harvestAction;
    }
    
    // =====================================================
    // PRIORITY 4: EXPANSION (if stable enough)
    // =====================================================
    if (unrest <= 3) {
      // Scout to reveal territory (high priority for expansion)
      const scoutAction = available.find(a => a.id === 'send-scouts');
      if (scoutAction && this.rng() < 0.5) return scoutAction;
      
      // Claim hexes aggressively
      const claimAction = available.find(a => a.id === 'claim-hexes');
      if (claimAction && this.rng() < 0.7) return claimAction;
    }
    
    // =====================================================
    // PRIORITY 5: ESTABLISH SETTLEMENTS
    // =====================================================
    const targetSettlements = Math.floor(claimedHexes / 8);
    if (settlements < targetSettlements && gold >= 6 && unrest <= 2) {
      const settlementAction = available.find(a => a.id === 'establish-settlement');
      if (settlementAction && this.rng() < 0.5) return settlementAction;
    }
    
    // =====================================================
    // PRIORITY 6: WORKSITES ON NEW TERRITORY
    // =====================================================
    const worksiteAction = available.find(a => a.id === 'create-worksite');
    if (worksiteAction && this.rng() < 0.4) return worksiteAction;
    
    // =====================================================
    // PRIORITY 7: BUILD STRUCTURES FOR BONUSES
    // =====================================================
    if (settlements > 0 && gold >= 2 && this.rng() < 0.3) {
      const buildAction = available.find(a => a.id === 'build-structure');
      if (buildAction) return buildAction;
    }
    
    // =====================================================
    // PRIORITY 8: ECONOMIC ACTIONS
    // =====================================================
    if (gold < 4) {
      const economicActions = available.filter(a => 
        ['collect-stipend', 'harvest-resources', 'request-economic-aid'].includes(a.id)
      );
      if (economicActions.length > 0 && this.rng() < 0.5) {
        return pickRandom(economicActions, this.rng);
      }
    }
    
    // =====================================================
    // PRIORITY 9: ROADS FOR TERRITORY CONNECTION
    // =====================================================
    if (claimedHexes > 10) {
      const roadsAction = available.find(a => a.id === 'build-roads');
      if (roadsAction && this.rng() < 0.2) return roadsAction;
    }
    
    // =====================================================
    // FALLBACK: Expansion-weighted random
    // =====================================================
    const weights: Record<string, number> = {
      'claim-hexes': 30,
      'send-scouts': 25,
      'deal-with-unrest': 20,
      'create-worksite': 15,
      'harvest-resources': 15,
      'establish-settlement': 10,
      'build-structure': 10,
      'collect-stipend': 10,
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
