// Army model for PF2e Reignmaker
// Represents military units in the kingdom

import type { OwnershipValue } from '../types/ownership';
import { PLAYER_KINGDOM } from '../types/ownership';

/**
 * Represents an army unit in the kingdom
 */
export interface Army {
  id: string;
  name: string;
  level: number;
  type?: string; // Army type (cavalry, engineers, infantry, kobold, wolves)
  
  // Ownership tracking
  // - PLAYER_KINGDOM = Led by player kingdom
  // - string = Led by named faction (e.g., "Pitax", "Brevoy")
  // - null = Neutral/mercenary
  ledBy: OwnershipValue;
  
  // Support tracking
  isSupported: boolean;
  supportedBySettlementId: string | null;
  turnsUnsupported: number;
  
  // NPC actor link
  actorId?: string; // Reference to the NPC actor in Foundry
}

/**
 * Create a new army with defaults
 * @param name Army name
 * @param level Army level
 * @param ledBy Faction leading this army (defaults to PLAYER_KINGDOM)
 */
export function createArmy(
  name: string,
  level: number,
  ledBy: OwnershipValue = PLAYER_KINGDOM
): Army {
  return {
    id: `army-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    level,
    ledBy,
    isSupported: false,
    supportedBySettlementId: null,
    turnsUnsupported: 0
  };
}
