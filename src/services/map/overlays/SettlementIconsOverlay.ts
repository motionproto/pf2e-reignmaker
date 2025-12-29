/**
 * Settlement Icons Overlay - Shows settlement tier icons (village, town, city)
 */

import { hexesWithSettlementFeatures } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createSettlementIconsOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'settlements',
    name: 'Settlements',
    icon: 'fa-castle',
    layerIds: ['settlement-icons'],
    linkedOverlays: ['settlement-labels'],
    store: hexesWithSettlementFeatures,
    render: async (hexesWithFeatures) => {
      const settlementData = hexesWithFeatures.map((h: any) => ({
        id: h.id,
        tier: h.feature?.tier || 'Village',
        mapIconPath: h.feature?.mapIconPath  // Custom map icon (optional)
      }));

      if (settlementData.length === 0) {
        mapLayer.clearLayer('settlement-icons');
        return;
      }

      await mapLayer.drawSettlementIcons(settlementData);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('settlements')
  };
}
