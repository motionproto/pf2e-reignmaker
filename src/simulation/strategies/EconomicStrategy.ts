/**
 * Economic Strategy
 * 
 * Focuses on resource generation and economic stability:
 * - Prioritize gold and resource accumulation
 * - Build infrastructure for economic bonuses
 * - Expand only when economically stable
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { CheckPipeline } from '../../types/CheckPipeline';
import type { Strategy } from './index';
import { categorizeAction, pickRandom } from './index';

export class EconomicStrategy implements Strategy {
  name = 'Economic';
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
    
    // Priority 1: Critical unrest (>= 6) - Must address
    if ((kingdom.unrest || 0) >= 6) {
      const unrestActions = available.filter(a => 
        categorizeAction(a.id) === 'unrest-reduction'
      );
      if (unrestActions.length > 0) {
        return pickRandom(unrestActions, this.rng);
      }
    }
    
    // Priority 2: Need food urgently
    if ((kingdom.resources?.food || 0) < 2) {
      const foodAction = available.find(a => a.id === 'harvest-resources');
      if (foodAction) return foodAction;
    }
    
    // Priority 3: Economic actions (high priority)
    const economicActions = available.filter(a =>
      categorizeAction(a.id) === 'economic' ||
      categorizeAction(a.id) === 'resource-generation' ||
      categorizeAction(a.id) === 'food-production'
    );
    
    if (economicActions.length > 0 && this.rng() < 0.7) {
      // Prefer specific actions based on state
      const gold = kingdom.resources?.gold || 0;
      const food = kingdom.resources?.food || 0;
      
      // Prefer selling surplus if we have excess resources
      if (food > 10 || (kingdom.resources?.lumber || 0) > 10) {
        const sellAction = economicActions.find(a => a.id === 'sell-surplus');
        if (sellAction) return sellAction;
      }
      
      // Prefer collect stipend if gold is low
      if (gold < 10) {
        const stipendAction = economicActions.find(a => a.id === 'collect-stipend');
        if (stipendAction) return stipendAction;
      }
      
      // Prefer creating worksites for long-term production
      const worksiteAction = economicActions.find(a => a.id === 'create-worksite');
      if (worksiteAction && this.rng() < 0.4) {
        return worksiteAction;
      }
      
      return pickRandom(economicActions, this.rng);
    }
    
    // Priority 4: Infrastructure for economic bonuses
    const infraActions = available.filter(a =>
      categorizeAction(a.id) === 'infrastructure'
    );
    if (infraActions.length > 0 && this.rng() < 0.3) {
      return pickRandom(infraActions, this.rng);
    }
    
    // Priority 5: Moderate unrest handling
    if ((kingdom.unrest || 0) >= 3) {
      const unrestActions = available.filter(a => 
        categorizeAction(a.id) === 'unrest-reduction'
      );
      if (unrestActions.length > 0 && this.rng() < 0.5) {
        return pickRandom(unrestActions, this.rng);
      }
    }
    
    // Fallback: Any available action
    return pickRandom(available, this.rng);
  }
}
