/**
 * Blocked Edges Debug Overlay - Shows river-blocked hex edges (GM only)
 * 
 * Visualizes precomputed blocked edges as red lines between hex centers.
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
  console.log('[BlockedEdgesDebug] Overlay created');
  
  return {
    id: 'blocked-edges-debug',
    name: 'River Blocked Edges (Debug)',
    icon: 'fa-ban',
    layerIds: ['blocked-edges-debug'],
    
    // Use legacy show() pattern for direct control
    show: async () => {
      console.log('[BlockedEdgesDebug] ========== SHOW CALLED ==========');
      console.log('[BlockedEdgesDebug] Geometry ready?', waterwayGeometryService.isGeometryReady());
      
      // Always force rebuild to ensure we have fresh data
      console.log('[BlockedEdgesDebug] Forcing geometry rebuild...');
      waterwayGeometryService.forceRebuild();
      
      // Wait for rebuild to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const blockedEdges = waterwayGeometryService.getBlockedEdges();
      console.log('[BlockedEdgesDebug] After rebuild - geometry ready?', waterwayGeometryService.isGeometryReady());
      console.log('[BlockedEdgesDebug] Got', blockedEdges.size, 'blocked edges from service');
      
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) {
        console.error('[BlockedEdgesDebug] Canvas not available');
        return;
      }
      
      // Clear existing debug graphics
      mapLayer.clearLayer('blocked-edges-debug');
      
      if (blockedEdges.size === 0) {
        console.warn('[BlockedEdgesDebug] No blocked edges to render - no rivers or all have crossings');
        logger.warn('[BlockedEdgesDebug] No blocked edges found. Check: 1) Rivers exist 2) Canvas ready 3) Geometry computed');
        return;
      }
      
      // Create layer with VERY high z-index to ensure visibility
      const layer = mapLayer.createLayer('blocked-edges-debug', 9999);
      console.log('[BlockedEdgesDebug] Created layer, z-index 9999');
      console.log('[BlockedEdgesDebug] Layer visible?', layer.visible);
      console.log('[BlockedEdgesDebug] Layer alpha?', layer.alpha);
      
      const graphics = new PIXI.Graphics();
      graphics.name = 'BlockedEdgesDebugGraphics';
      
      // FIRST: Collect all used river points
      const kingdom = get(kingdomData);
      const usedPoints = new Set<string>(); // Format: "hexI.hexJ:center" or "hexI.hexJ:edge"
      
      if (kingdom.rivers?.paths) {
        for (const path of kingdom.rivers.paths) {
          for (const point of path.points) {
            const key = point.isCenter 
              ? `${point.hexI}.${point.hexJ}:center`
              : `${point.hexI}.${point.hexJ}:${point.edge}`;
            usedPoints.add(key);
          }
        }
      }
      
      // SECOND: Draw ALL possible connection points for ALL hexes on the map
      const allHexes = kingdom.hexes || [];
      console.log('[BlockedEdgesDebug] Drawing connection points for ALL', allHexes.length, 'hexes');
      console.log('[BlockedEdgesDebug] First 5 hex IDs:', allHexes.slice(0, 5).map((h: any) => h.id));
      const allEdges: EdgeDirection[] = ['nw', 'ne', 'e', 'se', 'sw', 'w'];
      
      // Sample a few hexes to verify coordinates
      let sampleCount = 0;
      let invalidHexCount = 0;
      let nullCenterCount = 0;
      // Collect unique corner points (deduplicated across hexes)
      const cornerPoints = new Map<string, { x: number; y: number }>();
      
      for (const hex of allHexes) {
        const parts = hex.id.split('.');
        if (parts.length !== 2) {
          invalidHexCount++;
          continue;
        }
        
        const hexI = parseInt(parts[0], 10);
        const hexJ = parseInt(parts[1], 10);
        if (isNaN(hexI) || isNaN(hexJ)) {
          invalidHexCount++;
          continue;
        }
        
        const hexId = `${hexI}.${hexJ}`;
        
        // Draw center point (ALWAYS GREEN - this is a hex center)
        const centerPos = getHexCenter(hexI, hexJ, canvas);
        if (!centerPos) {
          nullCenterCount++;
          continue;
        }
        
        // Log first few samples to verify coordinates
        if (sampleCount < 5) {
          console.log(
            `[BlockedEdgesDebug] Sample hex ${hexId} (i=${hexI}, j=${hexJ}): center at (${centerPos.x.toFixed(1)}, ${centerPos.y.toFixed(1)})`
          );
          sampleCount++;
        }
        
        const isUsedCenter = usedPoints.has(`${hexId}:center`);
        const centerColor = 0x00FF00; // Green for all centers
        graphics.lineStyle(2, centerColor, 0.6);
        if (isUsedCenter) {
          graphics.beginFill(centerColor, 0.6);
          graphics.drawCircle(centerPos.x, centerPos.y, 8);
          graphics.endFill();
        } else {
          graphics.drawCircle(centerPos.x, centerPos.y, 8); // empty circle
        }
        
        // Add hex address text above center point
        const text = new PIXI.Text(hexId, {
          fontFamily: 'Arial',
          fontSize: 20,
          fill: 0x00FF00,
          alpha: 0.4,
          align: 'center'
        });
        text.anchor.set(0.5, 1); // Center horizontally, anchor at bottom
        text.x = centerPos.x;
        text.y = centerPos.y - 8; // Position above the center point
        layer.addChild(text);
        
        // Draw edge points (ALWAYS YELLOW - these are edge midpoints, not hex centers)
        for (const edge of allEdges) {
          const edgePos = getEdgeMidpoint(hexI, hexJ, edge, canvas);
          if (edgePos) {
            const isUsedEdge = usedPoints.has(`${hexId}:${edge}`);
            const edgeColor = 0xFFFF00; // Yellow for all edge midpoints
            graphics.lineStyle(2, edgeColor, 0.6);
            if (isUsedEdge) {
              graphics.beginFill(edgeColor, 0.6);
              graphics.drawCircle(edgePos.x, edgePos.y, 6);
              graphics.endFill();
            } else {
              graphics.drawCircle(edgePos.x, edgePos.y, 6);
            }
          }
        }
        
        // Collect hex corners into deduplicated map (using quantized world coordinates)
        const vertices = canvas.grid.getVertices({ i: hexI, j: hexJ });
        if (vertices && vertices.length === 6) {
          for (const v of vertices) {
            const qx = Math.round(v.x);
            const qy = Math.round(v.y);
            const cornerId = `${qx},${qy}`;
            if (!cornerPoints.has(cornerId)) {
              cornerPoints.set(cornerId, { x: v.x, y: v.y });
            }
          }
        }
      }
      
      // Draw all unique hex corners as pink circles (same radius/behavior as edges)
      const cornerColor = 0xFF66FF; // Brighter pink for corners
      const cornerRadius = 6;
      graphics.lineStyle(2, cornerColor, 1.0);
      // NOTE: We don't yet have a notion of "used corners" in river paths,
      // so all corners are currently rendered as hollow circles.
      for (const { x, y } of cornerPoints.values()) {
        graphics.drawCircle(x, y, cornerRadius); // hollow pink circle
      }
      
      console.log('[BlockedEdgesDebug] Drew connection points for all hexes (centers, edges, corners)');
      console.log('[BlockedEdgesDebug] Legend: Green=center points, Yellow=edge points, Pink=corners');
      if (invalidHexCount > 0) {
        console.warn(`[BlockedEdgesDebug] Found ${invalidHexCount} hexes with invalid ID format`);
      }
      if (nullCenterCount > 0) {
        console.warn(`[BlockedEdgesDebug] Found ${nullCenterCount} hexes where getHexCenter returned null (may be outside visible grid)`);
      }
      
      // SECOND: Draw all river segments in blue (for reference, INCLUDING segments with crossings)
      const segments = waterwayGeometryService.getSegments();
      console.log('[BlockedEdgesDebug] Drawing', segments.length, 'river segments in blue for reference (no crossing filter)');
      for (const segment of segments) {
        graphics.lineStyle(4, 0x00FFFF, 0.5); // Cyan, semi-transparent
        graphics.moveTo(segment.start.x, segment.start.y);
        graphics.lineTo(segment.end.x, segment.end.y);
        
        // Small cyan circles at segment endpoints
        graphics.beginFill(0x00FFFF, 0.4);
        graphics.drawCircle(segment.start.x, segment.start.y, 10);
        graphics.drawCircle(segment.end.x, segment.end.y, 10);
        graphics.endFill();
      }
      
      // Draw crossings as red diamonds
      if (kingdom.rivers?.crossings && kingdom.rivers.crossings.length > 0) {
        console.log('[BlockedEdgesDebug] Drawing', kingdom.rivers.crossings.length, 'crossings as red diamonds');
        const segments = waterwayGeometryService.getSegments();
        
        for (const crossing of kingdom.rivers.crossings) {
          // Find the segment this crossing is on
          const segment = segments.find(s => 
            s.pathId === crossing.pathId && s.segmentIndex === crossing.segmentIndex
          );
          
          if (segment) {
            // Interpolate position along segment (position is 0-1)
            const position = crossing.position || 0.5; // Default to middle if not specified
            const x = segment.start.x + (segment.end.x - segment.start.x) * position;
            const y = segment.start.y + (segment.end.y - segment.start.y) * position;
            
            // Draw red diamond outline (no fill) - centered on (x, y)
            const diamondSize = 25;
            graphics.lineStyle(4, 0xFF0000, 1.0);
            // Draw diamond: top -> right -> bottom -> left -> back to top
            graphics.moveTo(x, y - diamondSize); // Top point
            graphics.lineTo(x + diamondSize, y); // Right point
            graphics.lineTo(x, y + diamondSize); // Bottom point
            graphics.lineTo(x - diamondSize, y); // Left point
            graphics.lineTo(x, y - diamondSize); // Close back to top
          }
        }
      }
      
      // SECOND: Draw blocked movement edges in red
      console.log('[BlockedEdgesDebug] Drawing', blockedEdges.size, 'blocked movement edges in red');
      let count = 0;
      for (const edgeKey of blockedEdges) {
        const [fromId, toId] = edgeKey.split('->');
        const [fromI, fromJ] = fromId.split('.').map(Number);
        const [toI, toJ] = toId.split('.').map(Number);
        
        if (isNaN(fromI) || isNaN(fromJ) || isNaN(toI) || isNaN(toJ)) {
          console.warn('[BlockedEdgesDebug] Invalid edge key:', edgeKey);
          continue;
        }
        
        const fromCenter = canvas.grid.getCenterPoint({ i: fromI, j: fromJ });
        const toCenter = canvas.grid.getCenterPoint({ i: toI, j: toJ });
        
        if (fromCenter && toCenter) {
          console.log(`[BlockedEdgesDebug] Drawing edge ${count}: ${fromId} -> ${toId}`, fromCenter, toCenter);
          
          // Draw VERY thick red line (20px, fully opaque)
          graphics.lineStyle(20, 0xFF0000, 1.0);
          graphics.moveTo(fromCenter.x, fromCenter.y);
          graphics.lineTo(toCenter.x, toCenter.y);
          
          // Add large circles at endpoints for clarity
          graphics.beginFill(0xFF0000, 1.0);
          graphics.drawCircle(fromCenter.x, fromCenter.y, 30);
          graphics.drawCircle(toCenter.x, toCenter.y, 30);
          graphics.endFill();
          
          count++;
        }
      }
      
      console.log('[BlockedEdgesDebug] Adding graphics to layer, drew', count, 'edges');
      layer.addChild(graphics);
      
      // Ensure layer is visible
      layer.visible = true;
      layer.alpha = 1.0;
      
      mapLayer.showLayer('blocked-edges-debug');
      console.log('[BlockedEdgesDebug] Called showLayer()');
      console.log('[BlockedEdgesDebug] Layer after show - visible?', layer.visible);
      
      console.log(`[BlockedEdgesDebug] Successfully rendered ${count} blocked edges`);
      logger.info(`[BlockedEdgesDebug] Rendered ${count} blocked edges with 20px red lines and 30px circles`);
    },
    
    hide: () => {
      console.log('[BlockedEdgesDebug] Hide called');
      mapLayer.clearLayer('blocked-edges-debug');
    },
    
    isActive: () => isOverlayActive('blocked-edges-debug')
  };
}
