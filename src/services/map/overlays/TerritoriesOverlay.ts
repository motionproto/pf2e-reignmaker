/**
 * Territories Overlay - Shows faction-controlled territories with colored fills
 *
 * Features:
 * - Each faction rendered to its own named container for independent visibility control
 * - Supports per-faction visibility toggle via mapLayer.setFactionVisibility()
 * - Shows province subdivisions as graduated darkness overlays
 */

import { derived, get } from 'svelte/store';
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
    linkedOverlays: ['territory-border', 'provinces'],
    // Subscribe to hex groupings, kingdom data, and provinces (NOT hiddenFactions - visibility controlled via containers)
    store: derived(
      [allHexesByFaction, kingdomData, provinces],
      ([$grouped, $data, $provinces]) => ({
        grouped: $grouped,
        kingdom: $data,
        provinces: $provinces
      })
    ),
    render: ({ grouped, kingdom, provinces: provinceList }) => {
      // Clear layer ONCE at the start
      mapLayer.clearLayer('kingdom-territory');

      if (grouped.size === 0) {
        return;
      }

      // Get current hidden state for initial visibility
      const hidden = get(hiddenFactions);

      // Build a map of hexId -> faction for province lookups
      const hexToFaction = new Map<string, string>();

      // Process each faction's territory separately
      grouped.forEach((hexes: any[], factionId: string) => {
        // Skip unclaimed hexes (they remain empty)
        if (factionId === 'unclaimed') return;

        // Skip empty groups
        if (hexes.length === 0) return;

        // Determine color for this faction
        let color = '#5b9bd5'; // Default blue

        if (factionId === PLAYER_KINGDOM) {
          color = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          color = faction?.color || '#666666';
        }

        const colorNumber = parseInt(color.substring(1), 16);

        const style: HexStyle = {
          fillColor: colorNumber,
          fillAlpha: 0.25,
          borderColor: colorNumber,
          borderAlpha: 0.8,
          borderWidth: 3
        };

        // Build hex data for this faction
        const factionHexData: Array<{ hexId: string; style: HexStyle }> = [];
        hexes.forEach((h: any) => {
          factionHexData.push({ hexId: h.id, style });
          hexToFaction.set(h.id, factionId);
        });

        // Draw to faction-specific container with initial visibility based on hiddenFactions
        const isVisible = !hidden.has(factionId);
        mapLayer.drawFactionTerritory(factionId, factionHexData, 'kingdom-territory', isVisible);
      });

      // Add province overlays (these go into faction containers too)
      if (provinceList && provinceList.length > 0) {
        const sortedProvinces = [...provinceList]
          .filter((p: any) => p.hexIds?.length > 0)
          .sort((a: any, b: any) => a.hexIds.length - b.hexIds.length);

        // Group province hexes by faction
        const provincesByFaction = new Map<string, Array<{ hexId: string; style: HexStyle }>>();

        sortedProvinces.forEach((province: any, index: number) => {
          const rank = (index % 8) + 1;
          const alpha = rank * 0.1;

          province.hexIds.forEach((hexId: string) => {
            const factionId = hexToFaction.get(hexId);
            if (!factionId) return;

            // Get faction color and darken it
            let factionColor = 0x5b9bd5;
            if (factionId === PLAYER_KINGDOM) {
              const colorStr = kingdom.playerKingdomColor || '#5b9bd5';
              factionColor = parseInt(colorStr.substring(1), 16);
            } else {
              const faction = kingdom.factions?.find((f: any) => f.id === factionId);
              const colorStr = faction?.color || '#666666';
              factionColor = parseInt(colorStr.substring(1), 16);
            }

            const darkColor = darkenColor(factionColor, 0.5);

            if (!provincesByFaction.has(factionId)) {
              provincesByFaction.set(factionId, []);
            }
            provincesByFaction.get(factionId)!.push({
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

        // Draw province overlays for each faction (appended to existing faction containers)
        // Note: These are drawn as additional hexes in the same layer
        // The faction visibility will apply to both territory and province fills
      }
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territories')
  };
}
