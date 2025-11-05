/**
 * Water Overlay - Shows waterways (rivers, lakes, swamps)
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createWaterOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'water',
    name: 'Waterways',
    icon: 'fa-water',
    layerIds: ['water'],
    store: derived(kingdomData, $data => 
      // Filter for water terrain hexes
      $data.hexes.filter((h: any) => h.terrain === 'water')
    ),
    render: async (waterHexes) => {
      if (waterHexes.length === 0) {
        mapLayer.clearLayer('water');
        return;
      }

      await mapLayer.drawWaterConnections('water');
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('water')
  };
}
