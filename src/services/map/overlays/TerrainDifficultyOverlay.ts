/**
 * Terrain Difficulty Overlay - Shows travel speed difficulty
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createTerrainDifficultyOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'terrain-difficulty',
    name: 'Travel Speed',
    icon: 'fa-shoe-prints',
    layerIds: ['terrain-difficulty-overlay'],
    exclusiveGroup: 'terrain-display',  // Mutually exclusive with terrain
    store: derived(kingdomData, $data => 
      $data.hexes.filter((h: any) => h.terrain)
    ),
    render: (hexes) => {
      const hexData = hexes.map((h: any) => ({ id: h.id, terrain: h.terrain }));

      if (hexData.length === 0) {
        mapLayer.clearLayer('terrain-difficulty-overlay');
        return;
      }

      mapLayer.drawTerrainDifficultyOverlay(hexData);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('terrain-difficulty')
  };
}
