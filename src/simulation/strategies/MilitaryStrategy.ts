/**
 * Military Strategy
 * 
 * Focuses on army building and military strength:
 * - Prioritize recruiting and training armies
 * - Build fortifications
 * - Maintain enough economy to support military
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { SimCheck } from '../SimulationData';
import type { Strategy } from './index';
import { categorizeAction, pickRandom } from './index';

export class MilitaryStrategy implements Strategy {
  name = 'Military';
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
    
    const armyCount = kingdom.armies?.length || 0;
    
    // Priority 1: Critical needs (unrest or food)
    if ((kingdom.unrest || 0) >= 5) {
      const unrestActions = available.filter(a => 
        categorizeAction(a.id) === 'unrest-reduction'
      );
      if (unrestActions.length > 0) {
        return pickRandom(unrestActions, this.rng);
      }
    }
    
    if ((kingdom.resources?.food || 0) < 2) {
      const foodAction = available.find(a => a.id === 'harvest-resources');
      if (foodAction) return foodAction;
    }
    
    // Priority 2: Military actions when we can afford them
    const militaryActions = available.filter(a =>
      categorizeAction(a.id) === 'military'
    );
    
    if (militaryActions.length > 0) {
      // Recruit if we have no armies
      if (armyCount === 0) {
        const recruitAction = militaryActions.find(a => a.id === 'recruit-unit');
        if (recruitAction) return recruitAction;
      }
      
      // Train existing armies
      if (armyCount > 0 && this.rng() < 0.5) {
        const trainAction = militaryActions.find(a => a.id === 'train-army');
        if (trainAction) return trainAction;
      }
      
      // General military action
      if (this.rng() < 0.6) {
        return pickRandom(militaryActions, this.rng);
      }
    }
    
    // Priority 3: Fortifications
    const fortifyAction = available.find(a => a.id === 'fortify-hex');
    if (fortifyAction && this.rng() < 0.3) {
      return fortifyAction;
    }
    
    // Priority 4: Territory expansion (need land for armies)
    const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
    if (claimedHexes < 15) {
      const expansionActions = available.filter(a =>
        categorizeAction(a.id) === 'territory-expansion'
      );
      if (expansionActions.length > 0 && this.rng() < 0.4) {
        return pickRandom(expansionActions, this.rng);
      }
    }
    
    // Priority 5: Economy to support military
    const economicActions = available.filter(a =>
      categorizeAction(a.id) === 'economic' ||
      categorizeAction(a.id) === 'resource-generation'
    );
    if (economicActions.length > 0 && this.rng() < 0.5) {
      return pickRandom(economicActions, this.rng);
    }
    
    // Fallback: Any available action
    return pickRandom(available, this.rng);
  }
}
