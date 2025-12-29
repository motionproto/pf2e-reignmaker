/**
 * Territory Border Overlay - Shows outline of faction territories
 *
 * Features:
 * - Each faction rendered to its own named container for independent visibility control
 * - Uses faction-specific colors matching the territory fills
 */

import { derived, get } from 'svelte/store';
import { kingdomData, allHexesByFaction, hiddenFactions } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createTerritoryBorderOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'territory-border',
    name: 'Border',
    icon: 'fa-vector-square',
    layerIds: ['kingdom-territory-outline'],
    // Subscribe to hex groupings and kingdom data (NOT hiddenFactions - visibility controlled via containers)
    store: derived(
      [allHexesByFaction, kingdomData],
      ([$grouped, $data]) => ({
        grouped: $grouped,
        kingdom: $data
      })
    ),
    render: ({ grouped, kingdom }) => {
      mapLayer.clearLayer('kingdom-territory-outline');

      if (grouped.size === 0) {
        return;
      }

      // Get current hidden state for initial visibility
      const hidden = get(hiddenFactions);

      grouped.forEach((hexes: any[], factionId: string) => {
        // Skip unclaimed hexes
        if (factionId === 'unclaimed') return;
        // Skip empty groups
        if (hexes.length === 0) return;

        // Determine color for this faction
        let color = '#5b9bd5';

        if (factionId === PLAYER_KINGDOM) {
          color = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          color = faction?.color || '#666666';
        }

        const colorNumber = parseInt(color.substring(1), 16);
        const hexIds = hexes.map((h: any) => h.id);

        // Draw to faction-specific container with initial visibility
        const isVisible = !hidden.has(factionId);
        mapLayer.drawFactionOutline(factionId, hexIds, colorNumber, isVisible);
      });
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territory-border')
  };
}
