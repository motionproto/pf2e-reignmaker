/**
 * RiverEditorHandlers - River editing functionality for editor mode
 * Handles sequential path drawing system
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import { getConnectorAtPosition } from '../renderers/RiverConnectorRenderer';
import { getEdgeMidpoint, getHexCenter } from '../../../utils/riverUtils';
import type { EdgeDirection } from '../../../models/Hex';
import type { RiverPathPoint } from '../../../actors/KingdomActor';
import { getAdjacentHexes } from '../../../utils/hexUtils';

export class RiverEditorHandlers {
  // River path being drawn (sequential system)
  private currentPathId: string | null = null;
  private currentPathOrder: number = 0;
  // Index of the currently active vertex within the active path (for editing/highlight)
  private currentVertexIndex: number | null = null;
  
  // Preview graphics for drawing in progress
  private previewGraphics: PIXI.Graphics | null = null;
  
  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickConnector: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number } | null = null;

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

    // Get connector at click position (center, edge, or corner)
    const connector = getConnectorAtPosition(hexI, hexJ, position, canvas);
    if (!connector) {
      logger.info('[RiverEditorHandlers] ❌ No connector at click position');
      return;
    }

    let isCenter = false;
    let edge: string | undefined;
    let cornerIndex: number | undefined;

    if ('center' in connector) {
      isCenter = true;
    } else if ('edge' in connector) {
      edge = connector.edge;
    } else if ('cornerIndex' in connector) {
      cornerIndex = connector.cornerIndex;
    }

    // Check for double-click (within 300ms on same connector)
    const now = Date.now();
    const isDoubleClick = 
      now - this.lastClickTime < 300 &&
      this.isSameConnector(
        { hexI, hexJ, edge, isCenter, cornerIndex },
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

    const kingdom = getKingdomData();

    // If we already have an active path, first see if this click is on one of its vertices.
    // If so, treat this as selecting that vertex (do NOT create a new point).
    if (this.currentPathId) {
      const activePath = kingdom.rivers?.paths?.find(p => p.id === this.currentPathId);
      if (activePath) {
        const idx = activePath.points.findIndex(pt =>
          pt.hexI === hexI &&
          pt.hexJ === hexJ &&
          pt.edge === edge &&
          pt.isCenter === isCenter &&
          pt.cornerIndex === cornerIndex
        );
        if (idx !== -1) {
          this.currentVertexIndex = idx;
          logger.info(
            `[RiverEditorHandlers] 🎯 Selected existing vertex index ${idx} on path ${this.currentPathId}`
          );
          // Update double-click tracking
          this.lastClickTime = now;
          this.lastClickConnector = { hexI, hexJ, edge, isCenter, cornerIndex };
          return; // Selection only, no new point
        }
      }
    }

    // If no current path, either select an existing path at this connector or start a new one
    if (!this.currentPathId) {
      const paths = kingdom.rivers?.paths || [];

      let existingPath: { id: string; points: RiverPathPoint[] } | undefined;
      let existingIndex: number | null = null;

      // Try to find a path that already has a point at this connector
      for (const path of paths) {
        const idx = path.points.findIndex(pt =>
          pt.hexI === hexI &&
          pt.hexJ === hexJ &&
          pt.edge === edge &&
          pt.isCenter === isCenter &&
          pt.cornerIndex === cornerIndex
        );
        if (idx !== -1) {
          existingPath = path as { id: string; points: RiverPathPoint[] };
          existingIndex = idx;
          break;
        }
      }

      if (existingPath && existingIndex !== null) {
        // Continue editing existing path and select the clicked vertex as active
        this.currentPathId = existingPath.id;
        this.currentVertexIndex = existingIndex;
        const orders = existingPath.points.map(p => p.order);
        const maxOrder = orders.length > 0 ? Math.max(...orders) : 0;
        this.currentPathOrder = maxOrder + 10;
        logger.info(
          `[RiverEditorHandlers] ✏️ Editing existing river path: ${this.currentPathId}, selected vertex index ${existingIndex}`
        );
        // Do NOT fall through to creating a new point for this click
        this.lastClickTime = now;
        this.lastClickConnector = { hexI, hexJ, edge, isCenter, cornerIndex };
        return;
      } else {
        // Start a brand new path
        this.currentPathId = crypto.randomUUID();
        this.currentPathOrder = 10;
        this.currentVertexIndex = null;
        logger.info(`[RiverEditorHandlers] 🆕 Starting new river path: ${this.currentPathId}`);
      }
    }

    // Create point to insert
    const point: RiverPathPoint = {
      hexI,
      hexJ,
      edge,
      isCenter,
      cornerIndex,
      order: this.currentPathOrder
    };
    
    const desc = isCenter
      ? 'center'
      : (edge
        ? `edge ${edge}`
        : cornerIndex !== undefined
          ? `corner ${cornerIndex}`
          : 'unknown');
    logger.info(
      `[RiverEditorHandlers] ➕ Adding point to path: hex ${hexId}, ${desc}, order ${this.currentPathOrder}`
    );
    
    // Add to kingdom, inserting after the currently active vertex if set
    let insertedIndex: number | null = null;
    await updateKingdom(kingdom => {
      if (!kingdom.rivers) kingdom.rivers = { paths: [] };
      let path = kingdom.rivers.paths.find(p => p.id === this.currentPathId);
      if (!path) {
        path = { id: this.currentPathId!, points: [] };
        kingdom.rivers.paths.push(path);
      }
      
      if (this.currentVertexIndex !== null && this.currentVertexIndex >= 0 && this.currentVertexIndex < path.points.length) {
        // Insert after the active vertex
        const targetIndex = this.currentVertexIndex + 1;
        path.points.splice(targetIndex, 0, point);
        insertedIndex = targetIndex;
      } else {
        // Append to end
        path.points.push(point);
        insertedIndex = path.points.length - 1;
      }
      
      // Renumber orders to keep them monotonic (10,20,30,...)
      let order = 10;
      for (const pt of path.points) {
        pt.order = order;
        order += 10;
      }
    });
    
    // After insertion, advance the active vertex to the newly added point
    if (insertedIndex !== null) {
      this.currentVertexIndex = insertedIndex;
    }
    
    this.currentPathOrder += 10;
    
    // Update click tracking for double-click detection
    this.lastClickTime = now;
    this.lastClickConnector = { hexI, hexJ, edge, isCenter, cornerIndex };
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

    let isCenter = false;
    let edge: string | undefined;
    let cornerIndex: number | undefined;

    if ('center' in connector) {
      isCenter = true;
    } else if ('edge' in connector) {
      edge = connector.edge;
    } else if ('cornerIndex' in connector) {
      cornerIndex = connector.cornerIndex;
    }

    // Find and remove matching point from ANY river path (not just currentPath)
    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) return;
    
    let deletedPoint = false;
    await updateKingdom(kingdom => {
      if (!kingdom.rivers?.paths) return;
      
      for (let pi = kingdom.rivers.paths.length - 1; pi >= 0; pi--) {
        const path = kingdom.rivers.paths[pi];
        const pointIndex = path.points.findIndex(pt => 
          pt.hexI === hexI && 
          pt.hexJ === hexJ &&
          pt.edge === edge &&
          pt.isCenter === isCenter &&
          pt.cornerIndex === cornerIndex
        );
        
        if (pointIndex !== -1) {
          const desc = isCenter
            ? 'center'
            : (edge
              ? `edge ${edge}`
              : cornerIndex !== undefined
                ? `corner ${cornerIndex}`
                : 'unknown');
          
          path.points.splice(pointIndex, 1);
          deletedPoint = true;
          logger.info(`[RiverEditorHandlers] 🗑️ Deleted vertex from path ${path.id}: hex ${hexId}, ${desc}`);
          
          // If the path now has too few points, remove the path entirely
          if (path.points.length < 2) {
            logger.info('[RiverEditorHandlers] 🗑️ Path has too few points after deletion - removing path');
            kingdom.rivers.paths.splice(pi, 1);
          }
          
          // Only delete one matching point across all paths
          break;
        }
      }
    });
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
    
    // Determine which vertex to highlight:
    // - If a specific vertex is selected, use that
    // - Otherwise, default to the last point in the path
    const sortedPoints = [...currentPath.points].sort((a, b) => a.order - b.order);
    if (sortedPoints.length === 0) return;

    let targetPoint: typeof sortedPoints[0];
    if (this.currentVertexIndex !== null) {
      // Map currentVertexIndex in original array to sorted array index
      const originalPath = currentPath.points;
      if (this.currentVertexIndex >= 0 && this.currentVertexIndex < originalPath.length) {
        const active = originalPath[this.currentVertexIndex];
        const sortedIndex = sortedPoints.findIndex(
          p =>
            p.hexI === active.hexI &&
            p.hexJ === active.hexJ &&
            p.edge === active.edge &&
            p.isCenter === active.isCenter &&
            p.cornerIndex === active.cornerIndex
        );
        targetPoint = sortedIndex !== -1 ? sortedPoints[sortedIndex] : sortedPoints[sortedPoints.length - 1];
      } else {
        targetPoint = sortedPoints[sortedPoints.length - 1];
      }
    } else {
      targetPoint = sortedPoints[sortedPoints.length - 1];
    }

    // Resolve target point to world position
    let targetPos: { x: number; y: number } | null = null;
    if (targetPoint.isCenter) {
      targetPos = getHexCenter(targetPoint.hexI, targetPoint.hexJ, canvas);
    } else if (targetPoint.edge) {
      targetPos = getEdgeMidpoint(
        targetPoint.hexI,
        targetPoint.hexJ,
        targetPoint.edge as EdgeDirection,
        canvas
      );
    } else if (targetPoint.cornerIndex !== undefined) {
      const vertices = canvas.grid.getVertices({ i: targetPoint.hexI, j: targetPoint.hexJ });
      if (vertices && vertices.length > targetPoint.cornerIndex) {
        const v = vertices[targetPoint.cornerIndex];
        targetPos = { x: v.x, y: v.y };
      }
    }

    if (!targetPos) return;

    // Draw only a white ring around the active vertex (no orange preview line)
    this.previewGraphics.lineStyle({ width: 3, color: 0xFFFFFF, alpha: 0.9 });
    this.previewGraphics.drawCircle(targetPos.x, targetPos.y, 14);
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
    this.currentVertexIndex = null;
    
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
    lastPoint: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number },
    newPoint: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number }
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
      const { getEdgeIdForDirection, edgeNameToIndex } = await import('../../../utils/edgeUtils');
      
      const lastEdgeIndex = edgeNameToIndex(lastPoint.edge as EdgeDirection);
      const newEdgeIndex = edgeNameToIndex(newPoint.edge as EdgeDirection);
      
      logger.info(`  🔍 Checking canonical edge adjacency:`);
      logger.info(`    Last edge: (${lastPoint.hexI},${lastPoint.hexJ}) ${lastPoint.edge} (index ${lastEdgeIndex})`);
      logger.info(`    New edge:  (${newPoint.hexI},${newPoint.hexJ}) ${newPoint.edge} (index ${newEdgeIndex})`);
      
      const lastEdgeId = getEdgeIdForDirection(lastPoint.hexI, lastPoint.hexJ, lastEdgeIndex, canvas);
      const newEdgeId = getEdgeIdForDirection(newPoint.hexI, newPoint.hexJ, newEdgeIndex, canvas);
      
      // Skip if either edge is off the map (boundary hex)
      if (!lastEdgeId || !newEdgeId) {
        logger.info(`  ⚠️ Edge off map - adjacency check skipped`);
        return false;
      }
      
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
          const neighbors = getAdjacentHexes(lastI, lastJ);
          const isNeighbor = neighbors.some((n) => n.i === newI && n.j === newJ);
          if (isNeighbor) {
            logger.info(`  ✅ Edge hex (${lastI},${lastJ}) is neighbor of (${newI},${newJ}) - Adjacent!`);
            return true;
          }
        }
      }
      
      logger.info(`  ❌ No shared or neighboring hexes between edges`);
    }
    
    // Check if hexes are neighbors using shared utility
    
    const neighbors = getAdjacentHexes(lastPoint.hexI, lastPoint.hexJ);
    
    // Debug: Log neighbors
    logger.info(`  Neighbors of (${lastPoint.hexI},${lastPoint.hexJ}):`);
    neighbors.forEach((n, idx: number) => {
      logger.info(`    [${idx}] = (${n.i},${n.j}) ${n.i === newPoint.hexI && n.j === newPoint.hexJ ? '✓ MATCH' : ''}`);
    });
    
    const isMatch = neighbors.some((n) => n.i === newPoint.hexI && n.j === newPoint.hexJ);
    logger.info(`  Neighbor match: ${isMatch}`);
    
    return isMatch;
  }
  
  /**
   * Check if two connectors are the same
   */
  private isSameConnector(
    a: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number } | null,
    b: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number } | null
  ): boolean {
    if (!a || !b) return false;
    return (
      a.hexI === b.hexI &&
      a.hexJ === b.hexJ &&
      a.edge === b.edge &&
      a.isCenter === b.isCenter &&
      a.cornerIndex === b.cornerIndex
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
