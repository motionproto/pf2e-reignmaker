/**
 * Settlements Overlay - Highlights hexes containing settlements
 */

import { hexesWithSettlementFeatures } from '../../../stores/KingdomStore';
import { MAP_HEX_STYLES } from '../../../view/kingdom/utils/presentation';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { HexStyle } from '../types';

export function createSettlementsOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'settlement-hacks',
    name: 'Settlement Hacks',
    icon: 'fa-city',
    layerIds: ['settlements-overlay'],
    store: hexesWithSettlementFeatures,
    render: (hexesWithFeatures) => {
      const settlementHexIds = hexesWithFeatures.map((h: any) => h.id);

      if (settlementHexIds.length === 0) {
        mapLayer.clearLayer('settlements-overlay');
        return;
      }

      const style: HexStyle = MAP_HEX_STYLES.settlement;
      mapLayer.drawHexes(settlementHexIds, style, 'settlements-overlay');
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('settlement-hacks')
  };
}
