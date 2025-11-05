/**
 * ClaimedByEditorHandlers - Territory claim painting functionality for editor mode
 * Allows painting territory claims onto hexes with click or drag
 * 
 * Supports:
 * - Click mode: Claim single hex
 * - Paint mode: Drag to claim multiple hexes
 * - Ctrl+Click: Remove claims (set to null)
 * - Ctrl+Drag: Remove claims from multiple hexes
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';

export class ClaimedByEditorHandlers {
  /**
   * Claim a hex for a specific faction or player
   * 
   * @param hexId - Hex ID (e.g., "5.8")
   * @param claimedBy - Faction ID ("player" for player kingdom, faction ID, or null for unclaimed)
   */
  async claimHex(hexId: string, claimedBy: string | null): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;

    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;

    const kingdom = getKingdomData();
    const hex = kingdom.hexes?.find(h => h.row === hexI && h.col === hexJ);
    if (!hex) {
      logger.warn(`[ClaimedByEditorHandlers] Hex not found: ${hexId}`);
      return;
    }

    const currentClaim = hex.claimedBy;
    if (currentClaim === claimedBy) {
      return; // Already claimed by this faction
    }

    await updateKingdom(kingdom => {
      const hex = kingdom.hexes?.find(h => h.row === hexI && h.col === hexJ);
      if (!hex) return;
      
      hex.claimedBy = claimedBy;
      
      const claimLabel = claimedBy === null ? 'unclaimed' : claimedBy === 'player' ? 'player kingdom' : `faction ${claimedBy}`;
      const previousLabel = currentClaim === null ? 'unclaimed' : currentClaim === 'player' ? 'player kingdom' : `faction ${currentClaim}`;
      
      logger.info(`[ClaimedByEditorHandlers] 🏴 Hex ${hexId} now claimed by ${claimLabel} (was ${previousLabel})`);
    });
  }

  /**
   * Remove claim from a hex (set to null/wilderness)
   * 
   * @param hexId - Hex ID (e.g., "5.8")
   */
  async removeHexClaim(hexId: string): Promise<void> {
    await this.claimHex(hexId, null);
  }
}
