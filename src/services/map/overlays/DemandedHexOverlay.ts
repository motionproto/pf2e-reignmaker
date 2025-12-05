/**
 * Demanded Hex Overlay - Shows visual indicator for demand-expansion target hex
 * 
 * Displays:
 * 1. A green hex outline around demanded hexes
 * 2. A ClaimArrow icon on hexes that citizens are demanding the kingdom claim
 * 
 * Derives from hex features (type: 'demanded') instead of pendingOutcomes.
 * This provides a single source of truth on the hex itself.
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { LayerId } from '../types';
import { renderDemandedHexIndicators } from '../renderers/DemandedHexRenderer';
import { logger } from '../../../utils/Logger';

/**
 * Create demanded hex overlay
 * Shows green hex outline + claim arrow icon on hexes being demanded by citizens
 */
export function createDemandedHexOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  // Define layer IDs for this overlay
  const outlineLayerId: LayerId = 'demanded-hex-outline';
  const indicatorLayerId: LayerId = 'demanded-hex-indicator';
  
  return {
    id: 'demanded-hex',
    name: 'Demanded Expansion',
    icon: 'fa-bullseye',
    layerIds: [outlineLayerId, indicatorLayerId],
    
    // Derive from hex features - find hexes with 'demanded' feature that are NOT claimed
    store: derived(kingdomData, $data => {
      const demandedHexes = $data.hexes?.filter(
        (hex: any) => 
          hex.features?.some((f: any) => f.type === 'demanded') &&
          !hex.claimedBy  // Only show on unclaimed hexes
      ) || [];
      
      return demandedHexes.map((hex: any) => ({
        hexId: hex.id,
        terrain: hex.terrain || 'unknown'
      }));
    }),
    
    render: async (demandedHexes) => {
      // Clear layers first
      mapLayer.clearLayer(outlineLayerId);
      mapLayer.clearLayer(indicatorLayerId);
      
      if (demandedHexes.length === 0) {
        return;
      }
      
      const hexIds = demandedHexes.map((h: any) => h.hexId);
      
      logger.info(`[DemandedHexOverlay] Rendering ${hexIds.length} demanded hex(es):`, hexIds);
      
      // 1. Draw green hex outlines (no fill, just border)
      mapLayer.drawHexes(
        hexIds,
        {
          fillColor: 0x90EE90,  // Light green
          fillAlpha: 0.15,      // Very subtle fill
          borderColor: 0x90EE90, // Light green border
          borderWidth: 4,        // Thick border for visibility
          borderAlpha: 0.8       // Slightly transparent border
        },
        outlineLayerId,
        155  // z-index below the indicator
      );
      
      // 2. Draw claim arrow indicators on top
      const canvas = (globalThis as any).canvas;
      if (canvas?.grid) {
        // Get or create the indicator layer
        const layer = (mapLayer as any).createLayer(indicatorLayerId, 160);
        
        // Render the claim arrow icons
        await renderDemandedHexIndicators(layer, hexIds, canvas);
        
        // Show the layer
        (mapLayer as any).showLayer(indicatorLayerId);
      }
    },
    
    hide: () => {
      mapLayer.clearLayer(outlineLayerId);
      mapLayer.clearLayer(indicatorLayerId);
    },
    
    isActive: () => isOverlayActive('demanded-hex')
  };
}
