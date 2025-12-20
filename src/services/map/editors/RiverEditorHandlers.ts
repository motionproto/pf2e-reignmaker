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
import { computeBarrierSegments } from '../../../utils/barrierSegmentUtils';

export class RiverEditorHandlers {
  // River path being drawn (sequential system)
  private currentPathId: string | null = null;
  private currentPathOrder: number = 0;
  // Index of the currently active vertex within the active path (for editing/highlight)
  private currentVertexIndex: number | null = null;

  // Preview graphics for drawing in progress
  private previewGraphics: PIXI.Graphics | null = null;

  /**
   * Get pixel position for any connector type (center, edge, or corner)
   */
  private getConnectorPosition(
    point: { hexI: number; hexJ: number; isCenter?: boolean; edge?: string; cornerIndex?: number },
    canvas: any
  ): { x: number; y: number } | null {
    if (point.isCenter) {
      return getHexCenter(point.hexI, point.hexJ, canvas);
    }
    if (point.edge) {
      return getEdgeMidpoint(point.hexI, point.hexJ, point.edge as EdgeDirection, canvas);
    }
    if (point.cornerIndex !== undefined) {
      const vertices = canvas.grid.getVertices({ i: point.hexI, j: point.hexJ });
      if (vertices && vertices.length > point.cornerIndex) {
        const v = vertices[point.cornerIndex];
        return { x: v.x, y: v.y };
      }
    }
    return null;
  }

  /**
   * Handle river click - sequential path system
   * Click to add points to the current path, creating a river line
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
        return;
      } else {
        // Start a brand new path
        this.currentPathId = crypto.randomUUID();
        this.currentPathOrder = 10;
        this.currentVertexIndex = null;
        logger.info(`[RiverEditorHandlers] 🆕 Starting new river path: ${this.currentPathId}`);
      }
    }

    // Check if adding this point would create a duplicate segment
    const wouldCreateDuplicate = this.wouldCreateDuplicateSegment(
      kingdom,
      hexI,
      hexJ,
      edge,
      isCenter,
      cornerIndex
    );
    
    if (wouldCreateDuplicate) {
      logger.info('[RiverEditorHandlers] ⚠️ Cannot add point - would create duplicate segment');
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('Cannot create duplicate river segment');
      return;
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
        // Insert after the active vertex (or before if it's the first vertex)
        let targetIndex: number;
        if (this.currentVertexIndex === 0) {
          // First vertex selected - insert before it (stretching back)
          targetIndex = 0;
        } else {
          // Insert after the active vertex
          targetIndex = this.currentVertexIndex + 1;
        }
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

    // Recompute barrier segments
    await this.updateBarrierSegments();
  }

  /**
   * Handle river remove - Ctrl+Click to delete a vertex from current path
   * Uses geometric distance to find the nearest vertex, works for all vertices including end points
   */
  async handleRiverRemove(hexId: string, position: { x: number; y: number }): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths;
    if (!paths || paths.length === 0) return;

    const CLICK_THRESHOLD = 15; // pixels
    let deletedPoint = false;
    let deletedPathId: string | null = null;
    let deletedVertexIndex: number | null = null;

    await updateKingdom(kingdomState => {
      if (!kingdomState.rivers?.paths) return;

      let bestPathIndex = -1;
      let bestVertexIndex = -1;
      let bestDistance = Infinity;

      // Find nearest vertex across all paths
      for (let pi = 0; pi < kingdomState.rivers.paths.length; pi++) {
        const path = kingdomState.rivers.paths[pi];

        for (let vi = 0; vi < path.points.length; vi++) {
          const pt = path.points[vi];

          // Resolve point to pixel position
          let ptPos: { x: number; y: number } | null = null;
          if (pt.isCenter) {
            ptPos = getHexCenter(pt.hexI, pt.hexJ, canvas);
          } else if (pt.edge) {
            ptPos = getEdgeMidpoint(pt.hexI, pt.hexJ, pt.edge as EdgeDirection, canvas);
          } else if (pt.cornerIndex !== undefined) {
            const vertices = canvas.grid.getVertices({ i: pt.hexI, j: pt.hexJ });
            if (vertices && vertices.length > pt.cornerIndex) {
              const v = vertices[pt.cornerIndex];
              ptPos = { x: v.x, y: v.y };
            }
          }

          if (!ptPos) continue;

          // Calculate distance from click to vertex
          const dx = position.x - ptPos.x;
          const dy = position.y - ptPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CLICK_THRESHOLD && dist < bestDistance) {
            bestDistance = dist;
            bestPathIndex = pi;
            bestVertexIndex = vi;
          }
        }
      }

      if (bestPathIndex === -1 || bestVertexIndex === -1) {
        logger.info('[RiverEditorHandlers] ❌ No river vertex found near click position to delete');
        return;
      }

      const targetPath = kingdomState.rivers.paths[bestPathIndex];
      const targetPoint = targetPath.points[bestVertexIndex];

      const desc = targetPoint.isCenter
        ? 'center'
        : (targetPoint.edge
          ? `edge ${targetPoint.edge}`
          : targetPoint.cornerIndex !== undefined
            ? `corner ${targetPoint.cornerIndex}`
            : 'unknown');

      // Remove the vertex
      targetPath.points.splice(bestVertexIndex, 1);
      deletedPoint = true;
      deletedPathId = targetPath.id;
      deletedVertexIndex = bestVertexIndex;

      logger.info(
        `[RiverEditorHandlers] 🗑️ Deleted vertex from path ${targetPath.id}: ${desc} (distance=${bestDistance.toFixed(1)}px)`
      );

      // If the path now has too few points, remove the path entirely
      if (targetPath.points.length < 2) {
        logger.info('[RiverEditorHandlers] 🗑️ Path has too few points after deletion - removing path');
        kingdomState.rivers.paths.splice(bestPathIndex, 1);
      }
    });

    if (!deletedPoint) return;

    const updatedKingdom = getKingdomData();
    const updatedPaths = updatedKingdom.rivers?.paths || [];

    // Keep editing state consistent if we deleted from the active path
    if (deletedPathId && deletedPathId === this.currentPathId) {
      const updatedPath = updatedPaths.find(p => p.id === deletedPathId);
      if (!updatedPath || updatedPath.points.length < 2) {
        logger.info('[RiverEditorHandlers] 🔚 Active path has too few points after deletion - ending path');
        await this.endCurrentPath();
        const ui = (globalThis as any).ui;
        ui?.notifications?.info('Path ended (too few points)');
      } else if (deletedVertexIndex !== null) {
        // Adjust currentVertexIndex if we deleted before it
        if (this.currentVertexIndex !== null && deletedVertexIndex <= this.currentVertexIndex) {
          this.currentVertexIndex = Math.max(0, this.currentVertexIndex - 1);
        }
      }
    }

    // Recompute barrier segments
    await this.updateBarrierSegments();
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
    
    // Destroy preview graphics
    this.destroyPreviewGraphics();
  }
  
  /**
   * Delete the current path (public method for keyboard shortcuts)
   */
  async deleteCurrentPath(): Promise<void> {
    if (!this.currentPathId) return;
    
    const pathId = this.currentPathId;
    logger.info(`[RiverEditorHandlers] 🗑️ Deleting current river path: ${pathId}`);
    
    // Delete the path from kingdom data
    await updateKingdom(kingdom => {
      if (!kingdom.rivers?.paths) return;
      const pathIndex = kingdom.rivers.paths.findIndex(p => p.id === pathId);
      if (pathIndex !== -1) {
        kingdom.rivers.paths.splice(pathIndex, 1);
        logger.info(`[RiverEditorHandlers] ✅ Deleted path ${pathId}`);
      }
    });
    
    // Clear current path state
    this.currentPathId = null;
    this.currentPathOrder = 0;
    this.currentVertexIndex = null;

    // Destroy preview graphics
    this.destroyPreviewGraphics();

    // Recompute barrier segments
    await this.updateBarrierSegments();
  }

  /**
   * Check if adding a new point would create a duplicate segment
   * A duplicate segment is one that already exists between the same two connector points
   */
  private wouldCreateDuplicateSegment(
    kingdom: any,
    newHexI: number,
    newHexJ: number,
    newEdge: string | undefined,
    newIsCenter: boolean,
    newCornerIndex: number | undefined
  ): boolean {
    // Get the point we're connecting FROM (either the active vertex or the last point in current path)
    let fromPoint: RiverPathPoint | null = null;
    
    if (this.currentPathId) {
      const activePath = kingdom.rivers?.paths?.find((p: any) => p.id === this.currentPathId);
      if (activePath && activePath.points.length > 0) {
        if (this.currentVertexIndex !== null && this.currentVertexIndex >= 0 && this.currentVertexIndex < activePath.points.length) {
          // Connecting from the active vertex
          fromPoint = activePath.points[this.currentVertexIndex];
        } else {
          // Connecting from the last point in the path
          const sortedPoints = [...activePath.points].sort((a: any, b: any) => a.order - b.order);
          fromPoint = sortedPoints[sortedPoints.length - 1];
        }
      }
    }
    
    // If we don't have a from point, we're starting a new path - no duplicate possible
    if (!fromPoint) {
      return false;
    }
    
    // Create the "to" point descriptor
    const toPoint = {
      hexI: newHexI,
      hexJ: newHexJ,
      edge: newEdge,
      isCenter: newIsCenter,
      cornerIndex: newCornerIndex
    };
    
    // Check all paths for an existing segment between these two points
    const paths = kingdom.rivers?.paths || [];
    for (const path of paths) {
      const sortedPoints = [...path.points].sort((a: any, b: any) => a.order - b.order);
      
      // Check each consecutive pair in this path
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];
        
        // Check if this segment matches (in either direction)
        const matchesForward = 
          this.isSameConnectorPoint(p1, fromPoint) &&
          this.isSameConnectorPoint(p2, toPoint);
        
        const matchesReverse = 
          this.isSameConnectorPoint(p1, toPoint) &&
          this.isSameConnectorPoint(p2, fromPoint);
        
        if (matchesForward || matchesReverse) {
          return true; // Duplicate segment found
        }
      }
    }
    
    return false; // No duplicate found
  }
  
  /**
   * Check if two connector points are the same
   */
  private isSameConnectorPoint(
    a: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number },
    b: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number }
  ): boolean {
    return (
      a.hexI === b.hexI &&
      a.hexJ === b.hexJ &&
      a.edge === b.edge &&
      a.isCenter === b.isCenter &&
      a.cornerIndex === b.cornerIndex
    );
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
        
        // Get screen positions (handles center, edge, and corner points)
        const pos1 = this.getConnectorPosition(p1, canvas);
        const pos2 = this.getConnectorPosition(p2, canvas);

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

    // Recompute barrier segments
    await this.updateBarrierSegments();

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
        
        // Get screen positions (handles center, edge, and corner points)
        const pos1 = this.getConnectorPosition(p1, canvas);
        const pos2 = this.getConnectorPosition(p2, canvas);

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

    // Recompute barrier segments
    await this.updateBarrierSegments();

    return { success: true };
  }

  /**
   * Recompute and save barrier segments after river edits
   * Called automatically after any river modification
   */
  async updateBarrierSegments(): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[RiverEditorHandlers] Cannot update barrier segments - canvas not ready');
      return;
    }

    const kingdom = getKingdomData();
    const paths = kingdom.rivers?.paths || [];
    const crossings = kingdom.rivers?.crossings;

    const segments = computeBarrierSegments(paths, crossings, canvas);

    await updateKingdom(k => {
      if (!k.rivers) k.rivers = { paths: [] };
      k.rivers.barrierSegments = segments;
    });

    logger.info(`[RiverEditorHandlers] Updated ${segments.length} barrier segments`);
  }
}
