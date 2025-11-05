/**
 * Territories Overlay - Shows faction-controlled territories with colored fills
 */

import { derived } from 'svelte/store';
import { kingdomData, allClaimedHexesByFaction } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { HexStyle } from '../types';

export function createTerritoriesOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'territories',
    name: 'Territory',
    icon: 'fa-flag',
    layerIds: ['kingdom-territory'],
    store: derived([allClaimedHexesByFaction, kingdomData], ([$grouped, $data]) => ({ grouped: $grouped, kingdom: $data })),
    render: ({ grouped, kingdom }) => {
      // Clear previous territory layers
      mapLayer.clearLayer('kingdom-territory');
      
      if (grouped.size === 0) {
        return;
      }

      // Draw each faction's territory with its specific color
      grouped.forEach((hexes: any[], factionId: string | null) => {
        if (!factionId || hexes.length === 0) return;
        
        const hexIds = hexes.map((h: any) => h.id);
        
        // Determine color for this faction
        let color = '#5b9bd5'; // Default blue
        
        if (factionId === 'player') {
          // Use player kingdom color
          color = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          // Find faction in kingdom.factions and use its color
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          color = faction?.color || '#666666'; // Gray fallback
        }
        
        // Convert hex color string to number (remove # and parse as base 16)
        const colorNumber = parseInt(color.substring(1), 16);
        
        // Create custom style with faction color
        const style: HexStyle = {
          fillColor: colorNumber,
          fillAlpha: 0.25,
          borderColor: colorNumber,
          borderAlpha: 0.8,
          borderWidth: 3
        };

        mapLayer.drawHexes(hexIds, style, 'kingdom-territory');
      });
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territories')
  };
}
