/**
 * Territory Commands - Border Hex Management
 * 
 * Handles:
 * - Calculating border hexes (hexes adjacent to unclaimed territory)
 * - Removing border hexes from kingdom (incidents, raids, etc.)
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { ResolveResult } from '../types';

/**
 * Get border hexes (hexes with at least one unclaimed adjacent hex)
 * 
 * @param kingdom - Kingdom data
 * @returns Array of border hex IDs
 */
export async function getBorderHexes(kingdom: any): Promise<string[]> {
  const { getAdjacentHexIds } = await import('../../../pipelines/shared/hexValidation');
  const { PLAYER_KINGDOM } = await import('../../../types/ownership');
  
  // Get all claimed hexes
  const claimedHexes = kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM);
  
  // Filter to only border hexes
  return claimedHexes.filter((hex: any) => {
    const adjacentHexIds = getAdjacentHexIds(hex.id);
    
    // Check if any adjacent hex is unclaimed
    return adjacentHexIds.some((adjId: string) => {
      const adjHex = kingdom.hexes.find((h: any) => h.id === adjId);
      return !adjHex || adjHex.claimedBy === null || adjHex.claimedBy === undefined;
    });
  }).map((h: any) => h.id);
}

/**
 * Remove Border Hexes - Player selects border hexes to remove from kingdom
 * Used by incidents like border raids that cause loss of territory
 * 
 * @param count - Number of hexes to remove (or 'dice' for rolled value)
 * @param dice - Dice formula (e.g., '1d3') if count is 'dice'
 * @returns ResolveResult with removed hex details
 */
export async function removeBorderHexes(count: number | 'dice', dice?: string): Promise<ResolveResult> {
  logger.info(`🏴 [removeBorderHexes] Removing border hexes: count=${count}, dice=${dice}`);
  
  try {
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      return { success: false, error: 'No kingdom data available' };
    }

    // 1. Handle dice rolling if needed
    let hexCount: number;
    if (count === 'dice') {
      if (!dice) {
        return { success: false, error: 'Dice formula required when count is "dice"' };
      }
      
      const roll = new Roll(dice);
      await roll.evaluate();
      hexCount = roll.total || 1;
      
      // Show dice roll in chat
      await roll.toMessage({
        flavor: 'Border Hexes Lost',
        speaker: { alias: 'Kingdom' }
      });
      
      logger.info(`🎲 [removeBorderHexes] Rolled ${dice} = ${hexCount}`);
    } else {
      hexCount = count;
    }

    // 2. Calculate border hexes
    const borderHexes = await getBorderHexes(kingdom);
    
    if (borderHexes.length === 0) {
      return {
        success: false,
        error: 'No border hexes available to remove'
      };
    }

    logger.info(`🏴 [removeBorderHexes] Found ${borderHexes.length} border hexes:`, borderHexes);

    // Cap hexCount to available border hexes
    const actualCount = Math.min(hexCount, borderHexes.length);
    if (actualCount < hexCount) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn(`Only ${actualCount} border hexes available (requested ${hexCount})`);
    }

    // 3. Open hex selector
    const { hexSelectorService } = await import('../../../services/hex-selector');
    
    const selectedHexes = await hexSelectorService.selectHexes({
      title: `Remove ${actualCount} Border Hex${actualCount !== 1 ? 'es' : ''}`,
      count: actualCount,
      colorType: 'unclaim',
      validationFn: (hexId) => borderHexes.includes(hexId)
    });

    if (!selectedHexes || selectedHexes.length === 0) {
      return {
        success: false,
        error: 'Hex selection cancelled'
      };
    }

    // 4. Remove hexes from kingdom
    await updateKingdom(k => {
      selectedHexes.forEach(hexId => {
        const hex = k.hexes.find(h => h.id === hexId);
        if (hex) {
          hex.claimedBy = null;
          logger.info(`  🏴 Removed hex ${hexId} from kingdom`);
        }
      });
    });

    logger.info(`✅ [removeBorderHexes] Removed ${selectedHexes.length} border hexes`);

    return {
      success: true,
      data: {
        removedHexes: selectedHexes,
        count: selectedHexes.length,
        message: `Removed ${selectedHexes.length} border hex${selectedHexes.length !== 1 ? 'es' : ''} from kingdom: ${selectedHexes.join(', ')}`
      }
    };

  } catch (error) {
    logger.error('❌ [removeBorderHexes] Failed to remove border hexes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
