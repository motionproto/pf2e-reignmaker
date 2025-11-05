/**
 * Worksites Overlay - Shows worksite icons on hexes
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createWorksitesOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'worksites',
    name: 'Worksites',
    icon: 'fa-industry',
    layerIds: ['worksites'],
    store: derived(kingdomData, $data => 
      // Filter all hexes that have worksites (regardless of claim status)
      $data.hexes.filter((h: any) => h.worksite && h.worksite.type)
    ),
    render: async (hexes) => {
      logger.info('[OverlayManager] 🔍 Worksites render() called, hexes:', hexes.length);
      const worksiteData = hexes.map((h: any) => ({ 
        id: h.id, 
        worksiteType: h.worksite.type 
      }));

      if (worksiteData.length === 0) {
        logger.info('[OverlayManager] 🔍 No worksite data, clearing layer');
        mapLayer.clearLayer('worksites');
        return;
      }

      logger.info('[OverlayManager] 🔍 Drawing', worksiteData.length, 'worksite icons...');
      await mapLayer.drawWorksiteIcons(worksiteData);
      logger.info('[OverlayManager] 🔍 Worksites render() complete');
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('worksites')
  };
}
