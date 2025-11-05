/**
 * Resources Overlay - Shows resource/commodity bounty icons on hexes
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createResourcesOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'resources',
    name: 'Bounty',
    icon: 'fa-gem',
    layerIds: ['resources'],
    store: derived(kingdomData, $data => 
      // Filter all hexes that have commodities (regardless of claim status)
      $data.hexes.filter((h: any) => 
        h.commodities && Object.keys(h.commodities).length > 0
      )
    ),
    render: async (hexes) => {
      const bountyData = hexes.map((h: any) => ({ 
        id: h.id, 
        commodities: h.commodities 
      }));

      if (bountyData.length === 0) {
        mapLayer.clearLayer('resources');
        return;
      }

      await mapLayer.drawResourceIcons(bountyData);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('resources')
  };
}
