/**
 * RiverEditorHandlers - River editing functionality for editor mode
 * Handles sequential path drawing system
 */

import { getKingdomData, updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import { getConnectorAtPosition } from './renderers/RiverConnectorRenderer';
import { getEdgeMidpoint, getHexCenter } from '../../utils/riverUtils';
import type { EdgeDirection } from '../../models/Hex';
import type { RiverPathPoint } from '../../actors/KingdomActor';

export class RiverEditorHandlers {
  // River path being drawn (sequential system)
  private currentPathId: string | null = null;
  private currentPathOrder: number = 0;
  
  // Preview graphics for drawing in progress
  private previewGraphics: PIXI.Graphics | null = null;
  
  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickConnector: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean } | null = null;

  /**
   * Handle river click - sequential path system
   * Click to add points to the current path, creating a river line
   * Double-click to end path
   */
  async handleRiverClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    // Parse hex ID
    const parts = hexId.split('.');
    if (parts.length !== 2) return;

    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;

    // Get connector at click position
    const connector = getConnectorAtPosition(hexI, hexJ, position, canvas);
    if (!connector) {
      logger.info('[RiverEditorHandlers] ❌ No connector at click position');
      return;
    }

    // Determine connector type (edge or center)
    const isCenter = 'center' in connector;
    const edge = isCenter ? undefined : connector.edge;

    // Check for double-click (within 300ms on same connector)
    const now = Date.now();
    const isDoubleClick = 
      now - this.lastClickTime < 300 &&
      this.isSameConnector(
        { hexI, hexJ, edge, isCenter },
        this.lastClickConnector
      );

    if (isDoubleClick && this.currentPathId) {
      // End current path
      logger.info('[RiverEditorHandlers] 🏁 Double-click detected - ending path');
      await this.endCurrentPath();
      
      // Show notification
      const ui = (globalThis as any).ui;
      ui?.notifications?.info('River path completed');
      return;
    }

    // If no current path, start new one
    if (!this.currentPathId) {
      this.currentPathId = crypto.randomUUID();
      this.currentPathOrder = 10;
      logger.info(`[RiverEditorHandlers] 🆕 Starting new river path: ${this.currentPathId}`);
    } else {
      // Validate adjacency for existing path
      const kingdom = getKingdomData();
      const currentPath = kingdom.rivers?.paths?.find(p => p.id === this.currentPathId);
      
      if (currentPath && currentPath.points.length > 0) {
        // Get last point in path
        const sortedPoints = [...currentPath.points].sort((a, b) => a.order - b.order);
        const lastPoint = sortedPoints[sortedPoints.length - 1];
        
        // Debug logging
        logger.info(`[RiverEditorHandlers] 🔍 Validating adjacency:`);
        logger.info(`  Last point: hex=(${lastPoint.hexI},${lastPoint.hexJ}), edge=${lastPoint.edge}, center=${lastPoint.isCenter}`);
        logger.info(`  New point:  hex=(${hexI},${hexJ}), edge=${edge}, center=${isCenter}`);
        
        // Check if new point is adjacent to last point
        const isAdjacent = await this.isAdjacentPoint(lastPoint, { hexI, hexJ, edge, isCenter });
        logger.info(`  Result: ${isAdjacent ? '✅ Adjacent' : '❌ Not adjacent'}`);
        
        if (!isAdjacent) {
          const ui = (globalThis as any).ui;
          ui?.notifications?.error('Rivers must connect to adjacent points. Click a connector next to the last point (same hex or neighboring hex).');
          logger.warn(`[RiverEditorHandlers] ⚠️ Non-adjacent point rejected`);
          return;  // Hard reject - do not add point
        }
      }
    }

    // Create point
    const point: RiverPathPoint = {
      hexI,
      hexJ,
      edge,
      isCenter,
      order: this.currentPathOrder
    };

    const desc = isCenter ? 'center' : `edge ${edge}`;
    logger.info(`[RiverEditorHandlers] ➕ Adding point to path: hex ${hexId}, ${desc}, order ${this.currentPathOrder}`);

    // Add to kingdom
    await updateKingdom(kingdom => {
      if (!kingdom.rivers) kingdom.rivers = { paths: [] };
      let path = kingdom.rivers.paths.find(p => p.id === this.currentPathId);
      if (!path) {
        path = { id: this.currentPathId!, points: [] };
        kingdom.rivers.paths.push(path);
      }
      path.points.push(point);
    });

    this.currentPathOrder += 10;
    
    // Update click tracking for double-click detection
    this.lastClickTime = now;
    this.lastClickConnector = { hexI, hexJ, edge, isCenter };
  }

  /**
   * Handle river remove - Ctrl+Click to delete a vertex from current path
   */
  async handleRiverRemove(hexId: string, position: { x: number; y: number }): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    // Parse hex ID
    const parts = hexId.split('.');
    if (parts.length !== 2) return;

    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;

    // Get connector at click position
    const connector = getConnectorAtPosition(hexI, hexJ, position, canvas);
    if (!connector) {
      logger.info('[RiverEditorHandlers] ❌ No connector at click position');
      return;
    }

    // Only delete from current path being drawn
    if (!this.currentPathId) {
      logger.info('[RiverEditorHandlers] ❌ No active path to delete from');
      return;
    }

    const isCenter = 'center' in connector;
    const edge = isCenter ? undefined : connector.edge;

    // Find and remove matching point from current path
    const kingdom = getKingdomData();
    const currentPath = kingdom.rivers?.paths?.find(p => p.id === this.currentPathId);
    if (!currentPath) return;

    let deletedPoint = false;
    await updateKingdom(kingdom => {
      if (!kingdom.rivers?.paths) return;
      
      const path = kingdom.rivers.paths.find(p => p.id === this.currentPathId);
      if (!path) return;

      const pointIndex = path.points.findIndex(pt => 
        pt.hexI === hexI && 
        pt.hexJ === hexJ &&
        pt.edge === edge &&
        pt.isCenter === isCenter
      );

      if (pointIndex !== -1) {
        path.points.splice(pointIndex, 1);
        deletedPoint = true;
        const desc = isCenter ? 'center' : `edge ${edge}`;
        logger.info(`[RiverEditorHandlers] 🗑️ Deleted vertex: hex ${hexId}, ${desc}`);
      }
    });

    if (deletedPoint) {
      // Check if path now has too few points
      const updatedKingdom = getKingdomData();
      const updatedPath = updatedKingdom.rivers?.paths?.find(p => p.id === this.currentPathId);
      
      if (!updatedPath || updatedPath.points.length < 2) {
        logger.info('[RiverEditorHandlers] 🔚 Path has too few points - ending path');
        await this.endCurrentPath();
        
        const ui = (globalThis as any).ui;
        ui?.notifications?.info('Path ended (too few points)');
      }
    }
  }

  /**
   * Render preview of the river path currently being drawn
   */
  async renderPathPreview(primaryGroup: PIXI.Container): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    // Destroy existing preview
    this.destroyPreviewGraphics();
    
    // Only show preview if we have a current path ID
    if (!this.currentPathId) return;
    
    // Get current path from kingdom data
    const kingdom = getKingdomData();
    const currentPath = kingdom.rivers?.paths?.find(p => p.id === this.currentPathId);
    if (!currentPath || currentPath.points.length < 2) return;
    
    // Create preview graphics
    this.previewGraphics = new PIXI.Graphics();
    this.previewGraphics.name = 'RiverPathPreview';
    this.previewGraphics.zIndex = 999; // Below connectors but above water
    
    // Add to canvas.primary
    primaryGroup.addChild(this.previewGraphics);
    
    // Sort points by order
    const sortedPoints = [...currentPath.points].sort((a, b) => a.order - b.order);
    
    // Build path points from sorted points
    const pathPoints: Array<{ x: number; y: number }> = [];
    
    for (const point of sortedPoints) {
      let pos;
      if (point.isCenter) {
        pos = getHexCenter(point.hexI, point.hexJ, canvas);
      } else if (point.edge) {
        pos = getEdgeMidpoint(point.hexI, point.hexJ, point.edge as EdgeDirection, canvas);
      }
      
      if (pos) {
        pathPoints.push(pos);
      }
    }
    
    if (pathPoints.length < 2) return;
    
    // Draw preview line (orange line)
    this.previewGraphics.lineStyle({
      width: 4,
      color: 0xFFAA00, // Orange/yellow
      alpha: 0.8,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    // Draw path
    this.previewGraphics.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      this.previewGraphics.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    
    // Highlight active endpoint (last point in path)
    const lastPoint = pathPoints[pathPoints.length - 1];
    
    // Draw bright blue circle at active endpoint
    this.previewGraphics.lineStyle({ width: 0 });  // No outline
    this.previewGraphics.beginFill(0x00BFFF, 0.9);  // Deep sky blue
    this.previewGraphics.drawCircle(lastPoint.x, lastPoint.y, 10);
    this.previewGraphics.endFill();
    
    // Add white ring around it for extra visibility
    this.previewGraphics.lineStyle({ width: 2, color: 0xFFFFFF, alpha: 0.8 });
    this.previewGraphics.drawCircle(lastPoint.x, lastPoint.y, 12);
  }

  /**
   * Destroy preview graphics layer
   */
  destroyPreviewGraphics(): void {
    if (!this.previewGraphics) return;
    
    if (this.previewGraphics.parent) {
      this.previewGraphics.parent.removeChild(this.previewGraphics);
    }
    
    this.previewGraphics.destroy();
    this.previewGraphics = null;
  }

  /**
   * Get current path ID (for external checks)
   */
  getCurrentPathId(): string | null {
    return this.currentPathId;
  }
  
  /**
   * End the current path (public method for keyboard shortcuts)
   */
  async endCurrentPath(): Promise<void> {
    if (!this.currentPathId) return;
    
    logger.info('[RiverEditorHandlers] 🔚 Ending current river path');
    
    // Clear current path state
    this.currentPathId = null;
    this.currentPathOrder = 0;
    
    // Clear double-click tracking
    this.lastClickTime = 0;
    this.lastClickConnector = null;
    
    // Destroy preview graphics
    this.destroyPreviewGraphics();
  }
  
  /**
   * Check if a new point is adjacent to the last point
   * Adjacency rules:
   * - Same hex (edge to center, center to edge, edge to edge)
   * - Shared edge (both edges reference the same physical edge)
   * - Adjacent hex (using Foundry's grid API)
   */
  private async isAdjacentPoint(
    lastPoint: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean },
    newPoint: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean }
  ): Promise<boolean> {
    // Same hex - always adjacent
    if (lastPoint.hexI === newPoint.hexI && lastPoint.hexJ === newPoint.hexJ) {
      return true;
    }
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[RiverEditorHandlers] Canvas grid not available for adjacency check');
      return false;
    }
    
    // Check if both points are edges - check canonical edge adjacency
    if (lastPoint.edge && newPoint.edge) {
      const { getEdgeIdForDirection, edgeNameToIndex } = await import('../../utils/edgeUtils');
      
      const lastEdgeIndex = edgeNameToIndex(lastPoint.edge as EdgeDirection);
      const newEdgeIndex = edgeNameToIndex(newPoint.edge as EdgeDirection);
      
      logger.info(`  🔍 Checking canonical edge adjacency:`);
      logger.info(`    Last edge: (${lastPoint.hexI},${lastPoint.hexJ}) ${lastPoint.edge} (index ${lastEdgeIndex})`);
      logger.info(`    New edge:  (${newPoint.hexI},${newPoint.hexJ}) ${newPoint.edge} (index ${newEdgeIndex})`);
      
      const lastEdgeId = getEdgeIdForDirection(lastPoint.hexI, lastPoint.hexJ, lastEdgeIndex, canvas);
      const newEdgeId = getEdgeIdForDirection(newPoint.hexI, newPoint.hexJ, newEdgeIndex, canvas);
      
      logger.info(`    Last canonical ID: ${lastEdgeId}`);
      logger.info(`    New canonical ID:  ${newEdgeId}`);
      
      // Parse canonical IDs to get hex pairs
      // Format: "hexI:hexJ:edge,hexI2:hexJ2:edge2"
      const parseCanonicalId = (id: string): Array<[number, number]> => {
        const parts = id.split(',');
        return parts.map(part => {
          const [i, j] = part.split(':');
          return [parseInt(i, 10), parseInt(j, 10)];
        });
      };
      
      const lastHexes = parseCanonicalId(lastEdgeId);
      const newHexes = parseCanonicalId(newEdgeId);
      
      logger.info(`    Last edge hexes: [${lastHexes.map(h => `(${h[0]},${h[1]})`).join(', ')}]`);
      logger.info(`    New edge hexes: [${newHexes.map(h => `(${h[0]},${h[1]})`).join(', ')}]`);
      
      // Check if any hex from last edge matches or is neighbor to any hex from new edge
      for (const [lastI, lastJ] of lastHexes) {
        for (const [newI, newJ] of newHexes) {
          // Same hex?
          if (lastI === newI && lastJ === newJ) {
            logger.info(`  ✅ Edges share hex (${lastI},${lastJ}) - Adjacent!`);
            return true;
          }
          
          // Are they neighbors?
          const neighbors = canvas.grid.getNeighbors(lastI, lastJ);
          const isNeighbor = neighbors.some((n: [number, number]) => n[0] === newI && n[1] === newJ);
          if (isNeighbor) {
            logger.info(`  ✅ Edge hex (${lastI},${lastJ}) is neighbor of (${newI},${newJ}) - Adjacent!`);
            return true;
          }
        }
      }
      
      logger.info(`  ❌ No shared or neighboring hexes between edges`);
    }
    
    // Check if hexes are neighbors using Foundry's API
    
    const neighbors = canvas.grid.getNeighbors(lastPoint.hexI, lastPoint.hexJ);
    
    // Debug: Log what Foundry returns
    logger.info(`  Foundry neighbors of (${lastPoint.hexI},${lastPoint.hexJ}):`);
    neighbors.forEach((n: [number, number], idx: number) => {
      logger.info(`    [${idx}] = (${n[0]},${n[1]}) ${n[0] === newPoint.hexI && n[1] === newPoint.hexJ ? '✓ MATCH' : ''}`);
    });
    
    const isMatch = neighbors.some((n: [number, number]) => n[0] === newPoint.hexI && n[1] === newPoint.hexJ);
    logger.info(`  Neighbor match: ${isMatch}`);
    
    return isMatch;
  }
  
  /**
   * Check if two connectors are the same
   */
  private isSameConnector(
    a: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean } | null,
    b: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean } | null
  ): boolean {
    if (!a || !b) return false;
    return (
      a.hexI === b.hexI &&
      a.hexJ === b.hexJ &&
      a.edge === b.edge &&
      a.isCenter === b.isCenter
    );
  }
  
  /**
   * Handle scissor click - cuts a river path segment at click position
   * Splits path into two separate paths, removes orphaned paths with < 2 points
   */
  async handleScissorClick(position: { x: number; y: number }): Promise<{ success: boolean; pathsDeleted: number }> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return { success: false, pathsDeleted: 0 };
    
    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) {
      return { success: false, pathsDeleted: 0 };
    }
    
    // Find the closest segment to the click position
    let closestPath: typeof paths[0] | null = null;
    let closestSegmentIndex = -1;
    let minDistance = Infinity;
    const CLICK_THRESHOLD = 20; // pixels
    
    for (const path of paths) {
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      
      // Check each segment (pair of consecutive points)
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];
        
        // Get screen positions
        const pos1 = p1.isCenter 
          ? getHexCenter(p1.hexI, p1.hexJ, canvas)
          : getEdgeMidpoint(p1.hexI, p1.hexJ, p1.edge as EdgeDirection, canvas);
        
        const pos2 = p2.isCenter
          ? getHexCenter(p2.hexI, p2.hexJ, canvas)
          : getEdgeMidpoint(p2.hexI, p2.hexJ, p2.edge as EdgeDirection, canvas);
        
        if (!pos1 || !pos2) continue;
        
        // Calculate distance from click to line segment
        const distance = this.distanceToSegment(position, pos1, pos2);
        
        if (distance < minDistance && distance < CLICK_THRESHOLD) {
          minDistance = distance;
          closestPath = path;
          closestSegmentIndex = i;
        }
      }
    }
    
    if (!closestPath || closestSegmentIndex === -1) {
      logger.info('[RiverEditorHandlers] ✂️ No segment found near click position');
      return { success: false, pathsDeleted: 0 };
    }
    
    // Split the path at this segment
    const sortedPoints = [...closestPath.points].sort((a, b) => a.order - b.order);
    
    // Points before cut (0 to closestSegmentIndex inclusive)
    const path1Points = sortedPoints.slice(0, closestSegmentIndex + 1);
    
    // Points after cut (closestSegmentIndex + 1 to end)
    const path2Points = sortedPoints.slice(closestSegmentIndex + 1);
    
    logger.info(`[RiverEditorHandlers] ✂️ Cutting path at segment ${closestSegmentIndex}: ${path1Points.length} + ${path2Points.length} points`);
    
    let pathsDeleted = 0;
    
    await updateKingdom(kingdom => {
      if (!kingdom.rivers?.paths) return;
      
      // Find the original path
      const pathIndex = kingdom.rivers.paths.findIndex(p => p.id === closestPath!.id);
      if (pathIndex === -1) return;
      
      // Remove the original path
      kingdom.rivers.paths.splice(pathIndex, 1);
      
      // Add path 1 if it has at least 2 points
      if (path1Points.length >= 2) {
        kingdom.rivers.paths.push({
          id: crypto.randomUUID(),
          points: path1Points,
          navigable: closestPath!.navigable
        });
      } else {
        pathsDeleted++;
        logger.info('[RiverEditorHandlers] 🗑️ Path 1 orphaned (< 2 points), deleted');
      }
      
      // Add path 2 if it has at least 2 points
      if (path2Points.length >= 2) {
        kingdom.rivers.paths.push({
          id: crypto.randomUUID(),
          points: path2Points,
          navigable: closestPath!.navigable
        });
      } else {
        pathsDeleted++;
        logger.info('[RiverEditorHandlers] 🗑️ Path 2 orphaned (< 2 points), deleted');
      }
    });
    
    return { success: true, pathsDeleted };
  }
  
  /**
   * Calculate distance from point to line segment
   */
  private distanceToSegment(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      // Line segment is a point
      const pdx = point.x - lineStart.x;
      const pdy = point.y - lineStart.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    
    // Calculate projection of point onto line
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
    
    // Find closest point on segment
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;
    
    // Return distance to closest point
    const distX = point.x - closestX;
    const distY = point.y - closestY;
    return Math.sqrt(distX * distX + distY * distY);
  }
  
  /**
   * Handle reverse click - reverses flow direction of a river path
   * Finds the closest path and reverses its order numbers
   */
  async handleReverseClick(position: { x: number; y: number }): Promise<{ success: boolean }> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return { success: false };
    
    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) {
      return { success: false };
    }
    
    // Find the closest path to the click position (reuse logic from scissor tool)
    let closestPath: typeof paths[0] | null = null;
    let minDistance = Infinity;
    const CLICK_THRESHOLD = 20; // pixels
    
    for (const path of paths) {
      const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
      
      // Check each segment (pair of consecutive points)
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];
        
        // Get screen positions
        const pos1 = p1.isCenter 
          ? getHexCenter(p1.hexI, p1.hexJ, canvas)
          : getEdgeMidpoint(p1.hexI, p1.hexJ, p1.edge as EdgeDirection, canvas);
        
        const pos2 = p2.isCenter
          ? getHexCenter(p2.hexI, p2.hexJ, canvas)
          : getEdgeMidpoint(p2.hexI, p2.hexJ, p2.edge as EdgeDirection, canvas);
        
        if (!pos1 || !pos2) continue;
        
        // Calculate distance from click to line segment
        const distance = this.distanceToSegment(position, pos1, pos2);
        
        if (distance < minDistance && distance < CLICK_THRESHOLD) {
          minDistance = distance;
          closestPath = path;
        }
      }
    }
    
    if (!closestPath) {
      logger.info('[RiverEditorHandlers] 🔄 No path found near click position');
      return { success: false };
    }
    
    // Reverse the order numbers of all points in the path
    logger.info(`[RiverEditorHandlers] 🔄 Reversing flow direction of path with ${closestPath.points.length} points`);
    
    await updateKingdom(kingdom => {
      if (!kingdom.rivers?.paths) return;
      
      // Find the path
      const path = kingdom.rivers.paths.find(p => p.id === closestPath!.id);
      if (!path) return;
      
      // Get min and max order values
      const orders = path.points.map(p => p.order);
      const minOrder = Math.min(...orders);
      const maxOrder = Math.max(...orders);
      
      // Reverse order: new_order = (max - old_order) + min
      path.points.forEach(point => {
        point.order = (maxOrder - point.order) + minOrder;
      });
      
      logger.info('[RiverEditorHandlers] ✅ Flow direction reversed');
    });
    
    return { success: true };
  }
}
