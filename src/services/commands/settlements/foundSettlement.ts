/**
 * Settlement Founding Commands
 * 
 * Handles creation of new settlements:
 * - foundSettlement: Create a new village (Level 1) with prepare/commit pattern
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { PreparedCommand } from '../../../services/GameCommandsResolver';

/**
 * Found Settlement - Create a new village (Level 1)
 * REFACTORED: Uses prepare/commit pattern
 * 
 * @param name - Settlement name
 * @param location - Hex coordinates {x, y}
 * @param grantFreeStructure - Whether to grant a free structure slot (critical success)
 * @returns PreparedCommand with preview + commit function
 */
export async function foundSettlement(
  name: string,
  location: { x: number; y: number } = { x: 0, y: 0 },
  grantFreeStructure: boolean = false
): Promise<PreparedCommand> {
  logger.info(`🏘️ [foundSettlement] PREPARING to found ${name}`);
  
  // PHASE 1: PREPARE - Validate everything needed for preview (NO state changes)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('Settlement name is required');
  }

  const { createSettlement, SettlementTier } = await import('../../../models/Settlement');
  const trimmedName = name.trim();
  
  // Create settlement object for commit (but don't add to kingdom yet)
  const newSettlement = createSettlement(trimmedName, location, SettlementTier.VILLAGE);

  const message = grantFreeStructure
    ? `Founded ${trimmedName} (Village, Level 1) with 1 free structure slot!`
    : `Founded ${trimmedName} (Village, Level 1)`;

  logger.info(`🏘️ [foundSettlement] PREPARED: Will found ${trimmedName} at ${location.x},${location.y}`);

  // PHASE 2: RETURN - Preview data + commit function
  return {
    specialEffect: {
      type: 'hex',
      message: message,
      icon: 'fa-home',
      variant: 'positive'
    },
    commit: async () => {
      logger.info(`🏘️ [foundSettlement] COMMITTING: Creating ${trimmedName}`);
      
      await updateKingdom(kingdom => {
        if (!kingdom.settlements) {
          kingdom.settlements = [];
        }
        kingdom.settlements.push(newSettlement);
      });

      logger.info(`✅ [foundSettlement] Successfully founded ${trimmedName}`);
    }
  };
}
