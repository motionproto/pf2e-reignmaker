/**
 * WorksiteEditorHandlers - Handles worksite placement and removal on map hexes
 * Validates terrain compatibility before placing worksites
 */

import { updateKingdom } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { TerrainType } from '../../../types/terrain';

export type WorksiteType = 'Farmstead' | 'Logging Camp' | 'Mine' | 'Quarry';

/**
 * Terrain compatibility rules for worksites
 * Based on production.ts worksite production logic
 */
const WORKSITE_TERRAIN_RULES: Record<WorksiteType, TerrainType[]> = {
  'Farmstead': ['plains', 'forest', 'hills', 'swamp', 'desert', 'water'], // Universal - works on any terrain
  'Logging Camp': ['forest'], // Forest only
  'Quarry': ['hills', 'mountains'], // Hills or Mountains only
  'Mine': ['mountains', 'swamp'] // Mountains or Swamp only (auto-converts to Bog Mine on swamp)
};

export class WorksiteEditorHandlers {
  /**
   * Place a worksite on a hex
   * - Validates terrain compatibility
   * - Auto-converts Mine to Bog Mine on swamp terrain
   * - Shows error if placement is invalid
   */
  async placeWorksite(hexId: string, worksiteType: WorksiteType): Promise<void> {
    logger.info(`[WorksiteEditorHandlers] Placing ${worksiteType} on hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      
      if (!hex) {
        logger.warn(`[WorksiteEditorHandlers] Hex ${hexId} not found`);
        return;
      }
      
      // Validate terrain compatibility
      const isValid = this.validateWorksitePlacement(hex.terrain as TerrainType, worksiteType);
      
      if (!isValid) {
        const terrainName = hex.terrain || 'unknown';
        const errorMsg = this.getInvalidPlacementMessage(worksiteType, terrainName);
        logger.warn(`[WorksiteEditorHandlers] ${errorMsg}`);
        ui.notifications?.warn(errorMsg);
        return;
      }
      
      // Check if hex already has a worksite
      if (hex.worksite) {
        logger.info(`[WorksiteEditorHandlers] Replacing existing ${hex.worksite.type} with ${worksiteType}`);
      }
      
      // Auto-convert Mine to Bog Mine on swamp terrain
      let finalWorksiteType = worksiteType;
      if (worksiteType === 'Mine' && hex.terrain === 'swamp') {
        finalWorksiteType = 'Bog Mine' as WorksiteType;
        logger.info(`[WorksiteEditorHandlers] Auto-converted to Bog Mine on swamp terrain`);
      }
      
      // Place the worksite - create new array reference for Svelte reactivity
      kingdom.hexes = kingdom.hexes.map(h => {
        if (h.id === hexId) {
          return { ...h, worksite: { type: finalWorksiteType } };
        }
        return h;
      });
      logger.info(`[WorksiteEditorHandlers] Placed ${finalWorksiteType} on hex ${hexId}`);
    });
  }
  
  /**
   * Remove worksite from a hex
   * - Works regardless of which tool is active
   * - Removes any worksite type
   */
  async removeWorksite(hexId: string): Promise<void> {
    logger.info(`[WorksiteEditorHandlers] Removing worksite from hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      
      if (!hex) {
        logger.warn(`[WorksiteEditorHandlers] Hex ${hexId} not found`);
        return;
      }
      
      if (!hex.worksite) {
        logger.warn(`[WorksiteEditorHandlers] No worksite to remove from hex ${hexId}`);
        return;
      }
      
      const removedType = hex.worksite.type;
      
      // Remove the worksite - create new array reference for Svelte reactivity
      kingdom.hexes = kingdom.hexes.map(h => {
        if (h.id === hexId) {
          return { ...h, worksite: null };
        }
        return h;
      });
      logger.info(`[WorksiteEditorHandlers] Removed ${removedType} from hex ${hexId}`);
    });
  }
  
  /**
   * Validate if a worksite type can be placed on specific terrain
   * 
   * @param terrain - Terrain type of the hex
   * @param worksiteType - Type of worksite to place
   * @returns True if placement is valid
   */
  validateWorksitePlacement(terrain: TerrainType, worksiteType: WorksiteType): boolean {
    const allowedTerrains = WORKSITE_TERRAIN_RULES[worksiteType];
    return allowedTerrains.includes(terrain);
  }
  
  /**
   * Get user-friendly error message for invalid placement
   * 
   * @param worksiteType - Type of worksite
   * @param terrain - Terrain type
   * @returns Error message string
   */
  private getInvalidPlacementMessage(worksiteType: WorksiteType, terrain: string): string {
    switch (worksiteType) {
      case 'Logging Camp':
        return `Logging camps require forest terrain (this hex is ${terrain})`;
      case 'Quarry':
        return `Quarries require hills or mountains (this hex is ${terrain})`;
      case 'Mine':
        return `Mines require mountains or swamp terrain (this hex is ${terrain})`;
      case 'Farmstead':
        // Farmsteads work on any terrain, so this should never happen
        return `Cannot place farmstead on ${terrain} terrain`;
      default:
        return `Cannot place ${worksiteType} on ${terrain} terrain`;
    }
  }
}
