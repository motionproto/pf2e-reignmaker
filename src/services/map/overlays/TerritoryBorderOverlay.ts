/**
 * Territory Border Overlay - Shows outline of faction territories
 *
 * Features:
 * - Draws borders for all visible factions (not just player kingdom)
 * - Uses faction-specific colors matching the territory fills
 * - Respects per-faction visibility filtering via hiddenFactions store
 */

import { derived } from 'svelte/store';
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
    // Subscribe to hex groupings, visibility filter, and kingdom data (same as TerritoriesOverlay)
    store: derived(
      [allHexesByFaction, hiddenFactions, kingdomData],
      ([$grouped, $hidden, $data]) => ({
        grouped: $grouped,
        hidden: $hidden,
        kingdom: $data
      })
    ),
    render: ({ grouped, hidden, kingdom }) => {
      if (grouped.size === 0) {
        mapLayer.clearLayer('kingdom-territory-outline');
        return;
      }

      // Build faction outlines array
      const factionOutlines: Array<{ hexIds: string[]; color: number }> = [];

      grouped.forEach((hexes: any[], factionId: string) => {
        // Skip unclaimed hexes
        if (factionId === 'unclaimed') return;
        // Skip empty groups
        if (hexes.length === 0) return;
        // Skip hidden factions
        if (hidden.has(factionId)) return;

        // Determine color for this faction (same logic as TerritoriesOverlay)
        let color = '#5b9bd5'; // Default blue

        if (factionId === PLAYER_KINGDOM) {
          color = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          color = faction?.color || '#666666'; // Gray fallback
        }

        // Convert hex color string to number
        const colorNumber = parseInt(color.substring(1), 16);

        factionOutlines.push({
          hexIds: hexes.map((h: any) => h.id),
          color: colorNumber
        });
      });

      // Draw all faction outlines
      if (factionOutlines.length > 0) {
        mapLayer.drawMultiFactionOutlines(factionOutlines);
      } else {
        mapLayer.clearLayer('kingdom-territory-outline');
      }
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territory-border')
  };
}
