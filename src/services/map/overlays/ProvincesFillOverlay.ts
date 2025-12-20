/**
 * Provinces Fill Overlay - Shows colored fills for province hexes
 *
 * Used during province editing to visualize which hexes belong to which province.
 * Unassigned claimed hexes are shown dimmed.
 */

import { kingdomData } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { HexStyle } from '../types';

// Color palette for province fills (matches ProvinceEditorService and ProvinceEditorPanel)
const PROVINCE_COLORS = [
  0x4CAF50, // Green
  0x2196F3, // Blue
  0xFF9800, // Orange
  0x9C27B0, // Purple
  0x00BCD4, // Cyan
  0xE91E63, // Pink
  0x8BC34A, // Light Green
  0x3F51B5, // Indigo
  0xFFEB3B, // Yellow
  0x795548, // Brown
  0x607D8B, // Blue Grey
  0xF44336, // Red
] as const;

export function createProvincesFillOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  // Stable color map to maintain consistent colors across renders
  const provinceColorMap = new Map<string, number>();

  function getProvinceColor(provinceId: string, index: number): number {
    if (!provinceColorMap.has(provinceId)) {
      provinceColorMap.set(provinceId, PROVINCE_COLORS[index % PROVINCE_COLORS.length]);
    }
    return provinceColorMap.get(provinceId)!;
  }

  return {
    id: 'provinces-fill',
    name: 'Province Fills',
    icon: 'fa-fill-drip',
    layerIds: ['provinces-fill'],
    store: kingdomData,
    render: ($kingdom) => {
      const layerId = 'provinces-fill';
      const provinces = $kingdom.provinces || [];
      const claimedHexIds = ($kingdom.hexes || [])
        .filter((h: any) => h.claimedBy === PLAYER_KINGDOM)
        .map((h: any) => h.id);

      // Clear existing layer
      mapLayer.clearLayer(layerId);

      if (claimedHexIds.length === 0) {
        return;
      }

      // Collect all hex data to draw in a single batch (prevents clearing between provinces)
      const allHexData: Array<{ hexId: string; style: HexStyle }> = [];

      // Track assigned hex IDs
      const assignedHexIds = new Set<string>();

      // Collect province hexes with their colors
      provinces.forEach((province: any, index: number) => {
        if (!province.hexIds || province.hexIds.length === 0) return;

        const color = getProvinceColor(province.id, index);

        // Add hex IDs to assigned set and collect for batch drawing
        province.hexIds.forEach((hexId: string) => {
          assignedHexIds.add(hexId);
          allHexData.push({
            hexId,
            style: {
              fillColor: color,
              fillAlpha: 0.4,
              borderColor: color,
              borderWidth: 1,
              borderAlpha: 0.6,
            }
          });
        });
      });

      // Collect unassigned claimed hexes with dimmed style
      const unassignedHexIds = claimedHexIds.filter((id: string) => !assignedHexIds.has(id));
      unassignedHexIds.forEach((hexId: string) => {
        allHexData.push({
          hexId,
          style: {
            fillColor: 0x808080,
            fillAlpha: 0.25,
            borderColor: 0x808080,
            borderWidth: 0,
            borderAlpha: 0,
          }
        });
      });

      // Draw all hexes in a single batch operation
      if (allHexData.length > 0) {
        mapLayer.drawHexesBatch(allHexData, layerId, 5);
      }

      // Clean up stale province colors
      const currentIds = new Set(provinces.map((p: any) => p.id));
      for (const id of provinceColorMap.keys()) {
        if (!currentIds.has(id)) {
          provinceColorMap.delete(id);
        }
      }
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('provinces-fill'),
  };
}
