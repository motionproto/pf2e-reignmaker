/**
 * Strategy System
 * 
 * Defines how simulated players choose actions based on kingdom state.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { SimCheck } from '../SimulationData';

/**
 * Strategy interface - defines how a simulated player chooses actions
 */
export interface Strategy {
  name: string;
  
  /**
   * Select an action to perform
   * @param kingdom - Current kingdom state
   * @param availableActions - List of all action definitions
   * @param canPerform - Function to check if action requirements are met
   * @returns Selected action or null if no action available
   */
  selectAction(
    kingdom: KingdomData,
    availableActions: SimCheck[],
    canPerform: (action: SimCheck) => boolean
  ): SimCheck | null;
}

/**
 * Action priority categories
 */
export type ActionCategory = 
  | 'unrest-reduction'
  | 'food-production'
  | 'resource-generation'
  | 'territory-expansion'
  | 'military'
  | 'infrastructure'
  | 'economic';

/**
 * Categorize actions by their primary effect
 */
export function categorizeAction(actionId: string): ActionCategory {
  switch (actionId) {
    case 'deal-with-unrest':
    case 'arrest-dissidents':
      return 'unrest-reduction';
      
    case 'harvest-resources':
      return 'resource-generation';
      
    case 'create-worksite':
      return 'food-production';
      
    case 'sell-surplus':
    case 'purchase-resources':
    case 'collect-stipend':
    case 'request-economic-aid':
      return 'economic';
      
    case 'claim-hexes':
    case 'send-scouts':
    case 'establish-settlement':
      return 'territory-expansion';
      
    case 'recruit-unit':
    case 'train-army':
    case 'deploy-army':
    case 'outfit-army':
    case 'request-military-aid':
      return 'military';
      
    case 'build-roads':
    case 'fortify-hex':
    case 'build-structure':
    case 'upgrade-settlement':
    case 'repair-structure':
      return 'infrastructure';
      
    default:
      return 'resource-generation';
  }
}

/**
 * Helper to filter available actions
 */
export function getAvailableActions(
  actions: SimCheck[],
  canPerform: (action: SimCheck) => boolean,
  categories?: ActionCategory[]
): SimCheck[] {
  let filtered = actions.filter(a => canPerform(a));
  
  if (categories && categories.length > 0) {
    filtered = filtered.filter(a => a.category && categories.includes(a.category as ActionCategory));
  }
  
  return filtered;
}

/**
 * Pick a random action from a list
 */
export function pickRandom<T>(items: T[], rng: () => number = Math.random): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(rng() * items.length);
  return items[index];
}

// Re-export strategies
export { BalancedStrategy } from './BalancedStrategy';
export { EconomicStrategy } from './EconomicStrategy';
export { MilitaryStrategy } from './MilitaryStrategy';
export { ExpansionStrategy } from './ExpansionStrategy';
