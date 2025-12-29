/**
 * Territory Composite Overlay - Unified territory rendering
 *
 * Manages all territory-related visuals in a single overlay:
 * - Territory fills (colored hex backgrounds per faction)
 * - Territory borders (outlines per faction)
 * - Province overlays (graduated darkness)
 *
 * Structure:
 *   territory-root (main container)
 *   ├── fills
 *   │   ├── faction-{id} (per faction fill container)
 *   │   └── ...
 *   ├── provinces
 *   │   └── faction-{id}-provinces (per faction province overlay)
 *   └── borders
 *       ├── faction-{id} (per faction border container)
 *       └── ...
 *
 * Benefits:
 * - Single overlay toggle controls everything
 * - Per-faction visibility via container.visible
 * - No linkedOverlays complexity
 * - Efficient: only re-renders when data changes
 */

import { derived, get } from 'svelte/store';
import { kingdomData, allHexesByFaction, hiddenFactions, provinces } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import { TERRITORY_BORDER_COLORS } from '../../../view/kingdom/utils/presentation';
import { generateTerritoryOutline } from '../utils/TerritoryOutline';
import { drawSingleHex } from '../renderers/HexRenderer';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { HexStyle } from '../types';
import { logger } from '../../../utils/Logger';

/**
 * Darken a color by a percentage (0-1)
 */
function darkenColor(color: number, percent: number): number {
  const factor = 1 - percent;
  const r = Math.max(0, Math.round(((color >> 16) & 0xFF) * factor));
  const g = Math.max(0, Math.round(((color >> 8) & 0xFF) * factor));
  const b = Math.max(0, Math.round((color & 0xFF) * factor));
  return (r << 16) | (g << 8) | b;
}

// Store reference to root container for faction visibility toggles
let territoryRootContainer: PIXI.Container | null = null;

/**
 * Toggle visibility for a specific faction across all territory sub-containers
 */
export function setTerritoryFactionVisibility(factionId: string, visible: boolean): void {
  if (!territoryRootContainer) return;

  // Find and toggle faction containers in fills, borders, and provinces
  for (const sectionContainer of territoryRootContainer.children) {
    if (!(sectionContainer instanceof PIXI.Container)) continue;

    for (const child of sectionContainer.children) {
      if (child.name === `faction-${factionId}` || child.name === `faction-${factionId}-provinces`) {
        child.visible = visible;
      }
    }
  }
}

export function createTerritoryCompositeOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'territories',
    name: 'Territory',
    icon: 'fa-flag',
    layerIds: ['territory-composite'],
    // Single store subscription for all territory data
    store: derived(
      [allHexesByFaction, kingdomData, provinces],
      ([$grouped, $data, $provinces]) => ({
        grouped: $grouped,
        kingdom: $data,
        provinces: $provinces
      })
    ),
    render: ({ grouped, kingdom, provinces: provinceList }) => {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) {
        logger.warn('[TerritoryComposite] Canvas grid not available');
        return;
      }

      // Clear existing content (but preserve layer visibility)
      mapLayer.clearLayerContent('territory-composite');

      if (grouped.size === 0) {
        territoryRootContainer = null;
        return;
      }

      // Get current hidden state for initial visibility
      const hidden = get(hiddenFactions);

      // Create root container structure and ensure it's visible
      const layer = (mapLayer as any).createLayer('territory-composite', 5);
      mapLayer.showLayer('territory-composite');

      territoryRootContainer = new PIXI.Container();
      territoryRootContainer.name = 'territory-root';

      const fillsContainer = new PIXI.Container();
      fillsContainer.name = 'fills';

      const provincesContainer = new PIXI.Container();
      provincesContainer.name = 'provinces';

      const bordersContainer = new PIXI.Container();
      bordersContainer.name = 'borders';

      territoryRootContainer.addChild(fillsContainer);
      territoryRootContainer.addChild(provincesContainer);
      territoryRootContainer.addChild(bordersContainer);

      layer.addChild(territoryRootContainer);

      // Build hex -> faction mapping for provinces
      const hexToFaction = new Map<string, string>();
      const factionColors = new Map<string, number>();

      // Process each faction
      grouped.forEach((hexes: any[], factionId: string) => {
        if (factionId === 'unclaimed') return;
        if (hexes.length === 0) return;

        // Determine color
        let colorStr = '#5b9bd5';
        if (factionId === PLAYER_KINGDOM) {
          colorStr = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          colorStr = faction?.color || '#666666';
        }
        const colorNumber = parseInt(colorStr.substring(1), 16);
        factionColors.set(factionId, colorNumber);

        const isVisible = !hidden.has(factionId);
        const hexIds = hexes.map((h: any) => h.id);

        // Track hex ownership
        hexes.forEach((h: any) => hexToFaction.set(h.id, factionId));

        // --- FILLS ---
        const fillGraphics = new PIXI.Graphics();
        fillGraphics.name = `faction-${factionId}`;
        fillGraphics.visible = isVisible;

        const fillStyle: HexStyle = {
          fillColor: colorNumber,
          fillAlpha: 0.25,
          borderColor: colorNumber,
          borderAlpha: 0.8,
          borderWidth: 3
        };

        for (const hexId of hexIds) {
          drawSingleHex(fillGraphics, hexId, fillStyle, canvas);
        }
        fillsContainer.addChild(fillGraphics);

        // --- BORDERS ---
        const outlineResult = generateTerritoryOutline(hexIds);
        if (outlineResult.outlines.length > 0) {
          const borderGraphics = new PIXI.Graphics();
          borderGraphics.name = `faction-${factionId}`;
          borderGraphics.visible = isVisible;

          borderGraphics.lineStyle({
            width: 16,
            color: colorNumber,
            alpha: TERRITORY_BORDER_COLORS.outlineAlpha,
            cap: PIXI.LINE_CAP.ROUND,
            join: PIXI.LINE_JOIN.ROUND
          });

          outlineResult.outlines.forEach((path) => {
            if (path.length === 0) return;
            borderGraphics.moveTo(path[0].start.x, path[0].start.y);
            for (const segment of path) {
              borderGraphics.lineTo(segment.end.x, segment.end.y);
            }
            const first = path[0].start;
            const last = path[path.length - 1].end;
            if (Math.abs(first.x - last.x) < 1 && Math.abs(first.y - last.y) < 1) {
              borderGraphics.closePath();
            }
          });

          bordersContainer.addChild(borderGraphics);
        }
      });

      // --- PROVINCES ---
      if (provinceList && provinceList.length > 0) {
        // Group province data by faction
        const provinceDataByFaction = new Map<string, Array<{ hexId: string; style: HexStyle }>>();

        const sortedProvinces = [...provinceList]
          .filter((p: any) => p.hexIds?.length > 0)
          .sort((a: any, b: any) => a.hexIds.length - b.hexIds.length);

        sortedProvinces.forEach((province: any, index: number) => {
          const rank = (index % 8) + 1;
          const alpha = rank * 0.1;

          province.hexIds.forEach((hexId: string) => {
            const factionId = hexToFaction.get(hexId);
            if (!factionId) return;

            const factionColor = factionColors.get(factionId) || 0x5b9bd5;
            const darkColor = darkenColor(factionColor, 0.5);

            if (!provinceDataByFaction.has(factionId)) {
              provinceDataByFaction.set(factionId, []);
            }
            provinceDataByFaction.get(factionId)!.push({
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

        // Create province graphics per faction
        provinceDataByFaction.forEach((hexData, factionId) => {
          const isVisible = !hidden.has(factionId);
          const provinceGraphics = new PIXI.Graphics();
          provinceGraphics.name = `faction-${factionId}-provinces`;
          provinceGraphics.visible = isVisible;

          for (const { hexId, style } of hexData) {
            drawSingleHex(provinceGraphics, hexId, style, canvas);
          }

          provincesContainer.addChild(provinceGraphics);
        });
      }

      logger.debug('[TerritoryComposite] Rendered territory composite', {
        factions: grouped.size,
        provinces: provinceList?.length || 0
      });
    },
    hide: () => {
      territoryRootContainer = null;
    },
    isActive: () => isOverlayActive('territories')
  };
}
