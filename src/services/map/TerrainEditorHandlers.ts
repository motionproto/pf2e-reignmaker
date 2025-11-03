/**
 * TerrainEditorHandlers - Terrain painting functionality for editor mode
 * Allows painting terrain types onto hexes with click or drag
 */

import { getKingdomData, updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import type { TerrainType } from '../../types/terrain';

export class TerrainEditorHandlers {
  /**
   * Paint terrain onto a hex
   */
  async paintTerrain(hexId: string, terrainType: TerrainType): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;

    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;

    const kingdom = getKingdomData();
    const hex = kingdom.hexes?.find(h => h.row === hexI && h.col === hexJ);
    if (!hex) {
      logger.warn(`[TerrainEditorHandlers] Hex not found: ${hexId}`);
      return;
    }

    const currentTerrain = hex.terrain;
    if (currentTerrain === terrainType) {
      return; // Already this terrain type
    }

    await updateKingdom(kingdom => {
      const hex = kingdom.hexes?.find(h => h.row === hexI && h.col === hexJ);
      if (!hex) return;
      
      hex.terrain = terrainType;
      
      logger.info(`[TerrainEditorHandlers] 🎨 Painted ${terrainType} at ${hexId} (was ${currentTerrain})`);
    });
  }
}
