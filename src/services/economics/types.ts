/**
 * Economics Service Types
 * 
 * Type definitions for the kingdom economics system
 */

import type { Settlement, Army } from '../../actors/KingdomActor';
import type { Hex } from '../../models/Hex';

/**
 * Resource production result from all sources
 */
export interface ProductionResult {
  /** Base production from worksites */
  baseProduction: Map<string, number>;
  /** Bonuses from special traits or modifiers */
  bonuses: Map<string, number>;
  /** Total production (base + bonuses) */
  totalProduction: Map<string, number>;
  /** Breakdown by hex for detailed reporting */
  byHex: Array<{
    hex: Hex;
    production: Map<string, number>;
  }>;
}

/**
 * Resource consumption breakdown
 */
export interface ConsumptionResult {
  /** Food consumed by settlements */
  settlementFood: number;
  /** Food consumed by armies */
  armyFood: number;
  /** Total food consumption */
  totalFood: number;
  /** Other resource consumption (future expansion) */
  otherResources: Map<string, number>;
}

/**
 * Net resource calculation after production and consumption
 */
export interface NetResourceResult {
  /** Resources gained this turn */
  gains: Map<string, number>;
  /** Resources consumed this turn */
  losses: Map<string, number>;
  /** Net change (gains - losses) */
  netChange: Map<string, number>;
  /** Any shortages detected */
  shortages: Map<string, number>;
}

/**
 * Economic modifier that affects production or consumption
 */
export interface EconomicModifier {
  /** Name of the modifier */
  name: string;
  /** Type of modification */
  type: 'production' | 'consumption' | 'both';
  /** Resources affected (empty = all resources) */
  affectedResources: string[];
  /** Multiplier (1.0 = no change, 1.5 = +50%, etc.) */
  multiplier?: number;
  /** Flat bonus/penalty */
  flatBonus?: number;
}

/**
 * Leadership bonus configuration
 */
export interface LeadershipBonus {
  /** Skill or ability providing the bonus */
  source: string;
  /** Resource affected */
  resource: string;
  /** Bonus amount */
  amount: number;
}
