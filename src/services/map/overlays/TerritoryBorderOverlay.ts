/**
 * Territory Border Overlay - Shows outline of kingdom territory
 */

import { claimedHexes } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createTerritoryBorderOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'territory-border',
    name: 'Border',
    icon: 'fa-vector-square',
    layerIds: ['kingdom-territory-outline'],
    store: claimedHexes,
    render: (hexes) => {
      const hexIds = hexes.map((h: any) => h.id);
      
      if (hexIds.length === 0) {
        mapLayer.clearLayer('kingdom-territory-outline');
        return;
      }

      mapLayer.drawTerritoryOutline(hexIds);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territory-border')
  };
}
