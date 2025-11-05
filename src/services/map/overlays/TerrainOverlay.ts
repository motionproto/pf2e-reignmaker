/**
 * Terrain Overlay - Shows terrain types with colored hex fills
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createTerrainOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'terrain',
    name: 'Terrain',
    icon: 'fa-mountain',
    layerIds: ['terrain-overlay'],
    exclusiveGroup: 'terrain-display',  // Mutually exclusive with terrain-difficulty
    store: derived(kingdomData, $data => 
      $data.hexes.filter((h: any) => h.terrain)
    ),
    render: (hexes) => {
      const hexData = hexes.map((h: any) => ({ id: h.id, terrain: h.terrain }));

      if (hexData.length === 0) {
        mapLayer.clearLayer('terrain-overlay');
        return;
      }

      mapLayer.drawTerrainOverlay(hexData);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('terrain')
  };
}
