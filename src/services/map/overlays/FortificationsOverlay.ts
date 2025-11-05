/**
 * Fortifications Overlay - Shows fortification tier icons on hexes
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createFortificationsOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'fortifications',
    name: 'Fortifications',
    icon: 'fa-shield-alt',
    layerIds: ['fortifications'],
    store: derived(kingdomData, $data => 
      $data.hexes.filter((h: any) => h.fortification && h.fortification.tier > 0)
    ),
    render: async (hexes) => {
      const fortificationData = hexes.map((h: any) => ({ 
        id: h.id, 
        tier: h.fortification.tier,
        maintenancePaid: h.fortification.maintenancePaid
      }));

      if (fortificationData.length === 0) {
        mapLayer.clearLayer('fortifications');
        return;
      }

      await mapLayer.drawFortificationIcons(fortificationData);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('fortifications')
  };
}
