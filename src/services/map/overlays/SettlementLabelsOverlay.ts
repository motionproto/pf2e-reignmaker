/**
 * Settlement Labels Overlay - Shows settlement names as text labels
 */

import { hexesWithSettlementFeatures } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createSettlementLabelsOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'settlement-labels',
    name: 'Settlement Labels',
    icon: 'fa-tag',
    layerIds: ['settlement-labels'],
    store: hexesWithSettlementFeatures,
    render: async (hexesWithFeatures) => {
      const settlementData = hexesWithFeatures.map((h: any) => {
        return {
          id: h.id,
          name: h.feature?.name || 'Unnamed',
          tier: h.feature?.tier || 'Village'
        };
      });

      if (settlementData.length === 0) {
        mapLayer.clearLayer('settlement-labels');
        return;
      }

      await mapLayer.drawSettlementLabels(settlementData);
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('settlement-labels')
  };
}
