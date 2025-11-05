/**
 * Roads Overlay - Shows road connections between hexes
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import { territoryService } from '../../territory';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createRoadsOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'roads',
    name: 'Roads',
    icon: 'fa-road',
    layerIds: ['routes'],
    store: derived(kingdomData, $data => 
      // Always derive from hex.hasRoad flags (source of truth)
      territoryService.getRoads()
    ),
    render: (roadHexIds) => {
      if (roadHexIds.length === 0) {
        mapLayer.clearLayer('routes');
        return;
      }

      mapLayer.drawRoadConnections(roadHexIds, 'routes');
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('roads')
  };
}
