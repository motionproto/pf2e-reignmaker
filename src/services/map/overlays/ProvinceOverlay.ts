/**
 * Province Overlay - Shows faint border outlines around provinces
 */

import { provinces } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createProvinceOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'provinces',
    name: 'Provinces',
    icon: 'fa-map',
    layerIds: ['province-borders'],
    store: provinces,
    render: (provinceList) => {
      if (!provinceList || provinceList.length === 0) {
        mapLayer.clearLayer('province-borders');
        return;
      }

      // Filter to provinces with hexes assigned
      const provincesWithHexes = provinceList.filter(
        (p: any) => p.hexIds && p.hexIds.length > 0
      );

      if (provincesWithHexes.length === 0) {
        mapLayer.clearLayer('province-borders');
        return;
      }

      mapLayer.drawProvinceOutlines(provincesWithHexes);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('provinces'),
  };
}
