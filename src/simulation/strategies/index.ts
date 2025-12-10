/**
 * Strategy System
 * 
 * Defines how simulated players choose actions based on kingdom state.
 * Now uses CheckPipeline directly from PipelineRegistry (single source of truth).
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { CheckPipeline } from '../../types/CheckPipeline';
import { ExpansionStrategy } from './ExpansionStrategy';

// Re-export for backward compatibility
export type { CheckPipeline };

/**
 * Strategy interface - defines how a simulated player chooses actions
 */
export interface Strategy {
  name: string;
  
  /**
   * Select an action to perform
   * @param kingdom - Current kingdom state
   * @param availableActions - List of all action pipelines from registry
   * @param canPerform - Function to check if action requirements are met
   * @returns Selected action pipeline or null if no action available
   */
  selectAction(
    kingdom: KingdomData,
    availableActions: CheckPipeline[],
    canPerform: (action: CheckPipeline) => boolean
  ): CheckPipeline | null;
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
  | 'economic'
  | 'diplomatic';

/**
 * Categorize actions by their primary effect
 */
export function categorizeAction(actionId: string): ActionCategory {
  switch (actionId) {
    case 'deal-with-unrest':
    case 'arrest-dissidents':
    case 'execute-or-pardon-prisoners':
    case 'infiltration':
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
    case 'disband-army':
    case 'request-military-aid':
    case 'tend-wounded':
      return 'military';
      
    case 'build-roads':
    case 'fortify-hex':
    case 'build-structure':
    case 'upgrade-settlement':
    case 'repair-structure':
      return 'infrastructure';
      
    case 'establish-diplomatic-relations':
    case 'diplomatic-mission':
      return 'diplomatic';
      
    default:
      return 'resource-generation';
  }
}

/**
 * Helper to filter available actions
 */
export function getAvailableActions(
  actions: CheckPipeline[],
  canPerform: (action: CheckPipeline) => boolean,
  categories?: ActionCategory[]
): CheckPipeline[] {
  let filtered = actions.filter(a => canPerform(a));
  
  if (categories && categories.length > 0) {
    filtered = filtered.filter(a => a.category && categories.includes(categorizeAction(a.id)));
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

/**
 * Kingdom phases for dynamic weight calculation
 */
export type KingdomPhase = 'early' | 'mid' | 'late';

/**
 * Determine current kingdom phase based on development
 */
export function getKingdomPhase(kingdom: KingdomData): KingdomPhase {
  const hexes = kingdom.hexes?.filter(h => h.claimedBy === 'player').length || 0;
  const settlements = kingdom.settlements?.length || 0;
  
  if (hexes < 15 || settlements < 2) return 'early';
  if (hexes < 40 || settlements < 4) return 'mid';
  return 'late';
}

// Re-export strategies
export { BalancedStrategy } from './BalancedStrategy';
export { EconomicStrategy } from './EconomicStrategy';
export { MilitaryStrategy } from './MilitaryStrategy';
export { ExpansionStrategy } from './ExpansionStrategy';
