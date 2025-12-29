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

  // Support tracking (upkeep provider)
  // 'playerKingdom' for player armies, faction ID for allied armies (e.g., "default-swordlords-restov")
  supportedBy: string;

  // Settlement support tracking (only for player-controlled armies)
  isSupported: boolean;
  supportedBySettlementId: string | null;
  turnsUnsupported: number;

  // NPC actor link
  actorId?: string; // Reference to the NPC actor in Foundry

  // Navigation grid position (for pathfinding through river hexes)
  // These track the army's exact position on the 8x8 pixel navigation grid.
  // When an army moves, this is updated to the final cell position.
  // This allows armies to enter hexes with rivers from the non-river side.
  navCellX?: number;
  navCellY?: number;

  // Equipment upgrades (each can only be applied once)
  equipment?: {
    armor?: boolean;      // +1 AC (+2 on critical success)
    runes?: boolean;      // +1 to hit (+2 on critical success)
    weapons?: boolean;    // +1 damage dice (+2 on critical success)
    equipment?: boolean;  // +1 saves (+2 on critical success)
  };

  // Allied army support (exempt from upkeep)
  exemptFromUpkeep?: boolean; // Allied armies don't count toward upkeep costs
}

/**
 * Create a new army with defaults
 * @param name Army name
 * @param level Army level
 * @param ledBy Faction leading this army (defaults to PLAYER_KINGDOM)
 * @param supportedBy Faction providing upkeep (defaults to PLAYER_KINGDOM)
 */
export function createArmy(
  name: string,
  level: number,
  ledBy: OwnershipValue = PLAYER_KINGDOM,
  supportedBy: string = PLAYER_KINGDOM
): Army {
  return {
    id: `army-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    level,
    ledBy,
    supportedBy,
    isSupported: false,
    supportedBySettlementId: null,
    turnsUnsupported: 0
  };
}
