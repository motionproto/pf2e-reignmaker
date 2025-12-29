/**
 * Territories Overlay - Shows faction-controlled territories with colored fills
 *
 * Features:
 * - Groups hexes by faction (including 'unclaimed' for unowned hexes)
 * - Draws all visible factions in a single batch pass (fixes multi-faction bug)
 * - Supports per-faction visibility filtering via hiddenFactions store
 * - Correctly handles donut shapes and complex territory geometries
 * - Shows province subdivisions as graduated darkness overlays
 */

import { derived } from 'svelte/store';
import { kingdomData, allHexesByFaction, hiddenFactions, provinces } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { HexStyle } from '../types';

/**
 * Darken a color by a percentage (0-1)
 * Reduces RGB values proportionally to maintain hue
 */
function darkenColor(color: number, percent: number): number {
  const factor = 1 - percent;
  const r = Math.max(0, Math.round(((color >> 16) & 0xFF) * factor));
  const g = Math.max(0, Math.round(((color >> 8) & 0xFF) * factor));
  const b = Math.max(0, Math.round((color & 0xFF) * factor));
  return (r << 16) | (g << 8) | b;
}

export function createTerritoriesOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'territories',
    name: 'Territory',
    icon: 'fa-flag',
    layerIds: ['kingdom-territory'],
    linkedOverlays: ['territory-border', 'provinces'],  // Border and province borders show with territory
    // Subscribe to hex groupings, visibility filter, kingdom data, and provinces
    store: derived(
      [allHexesByFaction, hiddenFactions, kingdomData, provinces],
      ([$grouped, $hidden, $data, $provinces]) => ({
        grouped: $grouped,
        hidden: $hidden,
        kingdom: $data,
        provinces: $provinces
      })
    ),
    render: ({ grouped, hidden, kingdom, provinces: provinceList }) => {
      // Clear layer ONCE at the start
      mapLayer.clearLayer('kingdom-territory');

      if (grouped.size === 0) {
        return;
      }

      // Collect all hex data to draw in a single batch
      const allHexData: Array<{ hexId: string; style: HexStyle }> = [];

      // Build a map of hexId -> faction color for province lookups
      const hexToFactionColor = new Map<string, number>();

      // Process each faction's territory
      grouped.forEach((hexes: any[], factionId: string) => {
        // Skip unclaimed hexes (they remain empty)
        if (factionId === 'unclaimed') return;

        // Skip empty groups
        if (hexes.length === 0) return;

        // Skip hidden factions
        if (hidden.has(factionId)) return;

        // Determine color for this faction
        let color = '#5b9bd5'; // Default blue

        if (factionId === PLAYER_KINGDOM) {
          // Use player kingdom color
          color = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          // Find faction in kingdom.factions and use its color
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          color = faction?.color || '#666666'; // Gray fallback
        }

        // Convert hex color string to number (remove # and parse as base 16)
        const colorNumber = parseInt(color.substring(1), 16);

        // Create style with faction color
        const style: HexStyle = {
          fillColor: colorNumber,
          fillAlpha: 0.25,
          borderColor: colorNumber,
          borderAlpha: 0.8,
          borderWidth: 3
        };

        // Add all hexes for this faction to the batch and track colors
        hexes.forEach((h: any) => {
          allHexData.push({ hexId: h.id, style });
          hexToFactionColor.set(h.id, colorNumber);
        });
      });

      // Add province overlays with darkened faction colors (if provinces exist)
      if (provinceList && provinceList.length > 0) {
        // Filter to provinces with hexes and sort by hex count (ascending)
        // Smallest provinces are lightest, largest are darkest
        const sortedProvinces = [...provinceList]
          .filter((p: any) => p.hexIds?.length > 0)
          .sort((a: any, b: any) => a.hexIds.length - b.hexIds.length);

        // Draw darkened color overlay for each province
        // Use a dark version of faction color (50% darker) with graduated alpha
        sortedProvinces.forEach((province: any, index: number) => {
          const rank = (index % 8) + 1;  // 1-8, repeats for 9+ provinces
          const alpha = rank * 0.1;      // 10%-80% opacity

          // Get faction color from first hex in province, darken it significantly
          const firstHexId = province.hexIds[0];
          const factionColor = hexToFactionColor.get(firstHexId) || 0x5b9bd5;
          const darkColor = darkenColor(factionColor, 0.5);  // 50% darker

          province.hexIds.forEach((hexId: string) => {
            allHexData.push({
              hexId,
              style: {
                fillColor: darkColor,
                fillAlpha: alpha,
                borderColor: darkColor,
                borderWidth: 0,
                borderAlpha: 0
              }
            });
          });
        });
      }

      // Draw all hexes in a single batch operation
      if (allHexData.length > 0) {
        mapLayer.drawHexesBatch(allHexData, 'kingdom-territory');
      }
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territories')
  };
}
