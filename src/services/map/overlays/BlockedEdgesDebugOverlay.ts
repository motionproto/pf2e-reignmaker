/**
 * River Barrier Debug Overlay - Shows river barrier segments (GM only)
 *
 * Visualizes river barrier segments used for pathfinding intersection checks.
 * Useful for debugging river crossing logic and verifying geometry calculations.
 */

import { waterwayGeometryService } from '../../pathfinding/WaterwayGeometryService';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import { logger } from '../../../utils/Logger';
import { kingdomData } from '../../../stores/KingdomStore';
import { get } from 'svelte/store';
import { getHexCenter, getEdgeMidpoint } from '../../../utils/riverUtils';
import type { EdgeDirection } from '../../../models/Hex';

export function createBlockedEdgesDebugOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  console.log('[RiverBarrierDebug] Overlay created');

  return {
    id: 'blocked-edges-debug',
    name: 'River Barriers (Debug)',
    icon: 'fa-ban',
    layerIds: ['blocked-edges-debug'],

    show: async () => {
      console.log('[RiverBarrierDebug] ========== SHOW CALLED ==========');

      // Force rebuild to ensure we have fresh data
      waterwayGeometryService.forceRebuild();
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) {
        console.error('[RiverBarrierDebug] Canvas not available');
        return;
      }

      // Clear existing debug graphics
      mapLayer.clearLayer('blocked-edges-debug');

      const segments = waterwayGeometryService.getSegments();
      console.log('[RiverBarrierDebug] Got', segments.length, 'barrier segments');

      if (segments.length === 0) {
        console.warn('[RiverBarrierDebug] No barrier segments to render');
        return;
      }

      // Create layer
      const layer = mapLayer.createLayer('blocked-edges-debug', 9999);
      const graphics = new PIXI.Graphics();
      graphics.name = 'RiverBarrierDebugGraphics';

      const kingdom = get(kingdomData);

      // Draw hex centers for reference (small green dots)
      const allHexes = kingdom.hexes || [];
      for (const hex of allHexes) {
        const parts = hex.id.split('.');
        if (parts.length !== 2) continue;
        const hexI = parseInt(parts[0], 10);
        const hexJ = parseInt(parts[1], 10);
        if (isNaN(hexI) || isNaN(hexJ)) continue;

        const centerPos = getHexCenter(hexI, hexJ, canvas);
        if (centerPos) {
          graphics.lineStyle(1, 0x00FF00, 0.3);
          graphics.drawCircle(centerPos.x, centerPos.y, 5);
        }
      }

      // Draw barrier segments
      // Red = blocking (no crossing), Green = passable (has crossing)
      let blockingCount = 0;
      let passableCount = 0;

      for (const segment of segments) {
        if (segment.hasCrossing) {
          // Green for passable segments (has crossing)
          graphics.lineStyle(6, 0x00FF00, 0.7);
          passableCount++;
        } else {
          // Red for blocking segments
          graphics.lineStyle(6, 0xFF0000, 0.9);
          blockingCount++;
        }

        graphics.moveTo(segment.start.x, segment.start.y);
        graphics.lineTo(segment.end.x, segment.end.y);

        // Small circles at endpoints
        const endpointColor = segment.hasCrossing ? 0x00FF00 : 0xFF0000;
        graphics.beginFill(endpointColor, 0.5);
        graphics.drawCircle(segment.start.x, segment.start.y, 8);
        graphics.drawCircle(segment.end.x, segment.end.y, 8);
        graphics.endFill();
      }

      // Draw crossings as diamonds
      if (kingdom.rivers?.crossings) {
        for (const crossing of kingdom.rivers.crossings) {
          let pos: { x: number; y: number } | null = null;

          if (crossing.isCenter) {
            pos = canvas.grid.getCenterPoint({ i: crossing.hexI, j: crossing.hexJ });
          } else if (crossing.edge) {
            pos = getEdgeMidpoint(crossing.hexI, crossing.hexJ, crossing.edge as EdgeDirection, canvas);
          } else if (crossing.cornerIndex !== undefined) {
            const vertices = canvas.grid.getVertices({ i: crossing.hexI, j: crossing.hexJ });
            if (vertices && vertices.length > crossing.cornerIndex) {
              const v = vertices[crossing.cornerIndex];
              pos = { x: v.x, y: v.y };
            }
          }

          if (pos) {
            const size = 20;
            graphics.lineStyle(3, 0x00FFFF, 1.0);
            graphics.moveTo(pos.x, pos.y - size);
            graphics.lineTo(pos.x + size, pos.y);
            graphics.lineTo(pos.x, pos.y + size);
            graphics.lineTo(pos.x - size, pos.y);
            graphics.lineTo(pos.x, pos.y - size);
          }
        }
      }

      layer.addChild(graphics);
      layer.visible = true;
      layer.alpha = 1.0;
      mapLayer.showLayer('blocked-edges-debug');

      console.log(`[RiverBarrierDebug] Rendered ${blockingCount} blocking (red) + ${passableCount} passable (green) segments`);
      logger.info(`[RiverBarrierDebug] ${blockingCount} blocking, ${passableCount} passable segments`);
    },

    hide: () => {
      console.log('[RiverBarrierDebug] Hide called');
      mapLayer.clearLayer('blocked-edges-debug');
    },

    isActive: () => isOverlayActive('blocked-edges-debug')
  };
}
