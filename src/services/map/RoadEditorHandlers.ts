/**
 * RoadEditorHandlers - Road editing functionality for editor mode
 * Uses flag-based approach: toggle hex.hasRoad and handle blocked connections
 */

import { getKingdomData, updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import type { RoadBlockedConnection } from '../../actors/KingdomActor';

export class RoadEditorHandlers {
  /**
   * Handle road toggle - Click to add road, Ctrl+Click to remove
   */
  async handleRoadToggle(hexId: string, isCtrlPressed: boolean): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;

    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;

    const kingdom = getKingdomData();
    const hex = kingdom.hexes?.find(h => h.row === hexI && h.col === hexJ);
    if (!hex) {
      logger.warn(`[RoadEditorHandlers] Hex not found: ${hexId}`);
      return;
    }

    const currentState = hex.hasRoad || false;
    const newState = isCtrlPressed ? false : true;

    // Only update if state changed
    if (currentState === newState) {
      logger.info(`[RoadEditorHandlers] Road already ${newState ? 'exists' : 'removed'} at ${hexId}`);
      return;
    }

    await updateKingdom(kingdom => {
      const hex = kingdom.hexes?.find(h => h.row === hexI && h.col === hexJ);
      if (!hex) return;
      
      hex.hasRoad = newState;
      
      logger.info(`[RoadEditorHandlers] ${newState ? '✅ Added' : '🗑️ Removed'} road at ${hexId}`);
    });

    // Show notification
    const ui = (globalThis as any).ui;
    if (newState) {
      ui?.notifications?.info(`Road added at hex (${hexI}, ${hexJ})`);
    } else {
      ui?.notifications?.info(`Road removed from hex (${hexI}, ${hexJ})`);
    }
  }

  /**
   * Handle scissor click - cuts a road segment between two hexes
   * Finds the closest road segment and adds it to the blocked connections list
   */
  async handleScissorClick(position: { x: number; y: number }): Promise<{ success: boolean }> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return { success: false };

    const kingdom = getKingdomData();
    const roadHexes = kingdom.hexes?.filter(h => h.hasRoad) || [];
    
    if (roadHexes.length === 0) {
      logger.info('[RoadEditorHandlers] ✂️ No roads to cut');
      return { success: false };
    }

    // Find the closest road segment to click position
    let closestSegment: { hex1: string; hex2: string; distance: number } | null = null;
    const CLICK_THRESHOLD = 30; // pixels

    for (const hex of roadHexes) {
      const hexCenter = canvas.grid.getCenterPoint({ i: hex.row, j: hex.col });
      const neighbors = canvas.grid.getNeighbors(hex.row, hex.col);

      for (const neighbor of neighbors) {
        const neighborI = neighbor[0];
        const neighborJ = neighbor[1];
        const neighborHex = kingdom.hexes?.find(h => h.row === neighborI && h.col === neighborJ);

        // Only consider segments where both hexes have roads
        if (!neighborHex?.hasRoad) continue;

        const neighborCenter = canvas.grid.getCenterPoint({ i: neighborI, j: neighborJ });

        // Calculate distance from click to line segment
        const distance = this.distanceToSegment(position, hexCenter, neighborCenter);

        if (distance < CLICK_THRESHOLD && (!closestSegment || distance < closestSegment.distance)) {
          const hex1Id = `${hex.row}.${hex.col}`;
          const hex2Id = `${neighborI}.${neighborJ}`;
          
          // Check if this connection is already blocked
          const isBlocked = this.isConnectionBlocked(hex1Id, hex2Id, kingdom.roads?.blockedConnections || []);
          if (!isBlocked) {
            closestSegment = {
              hex1: hex1Id,
              hex2: hex2Id,
              distance
            };
          }
        }
      }
    }

    if (!closestSegment) {
      logger.info('[RoadEditorHandlers] ✂️ No road segment found near click position');
      return { success: false };
    }

    // Add to blocked connections
    const blockedConnection: RoadBlockedConnection = {
      id: crypto.randomUUID(),
      hex1: closestSegment.hex1,
      hex2: closestSegment.hex2
    };

    await updateKingdom(kingdom => {
      if (!kingdom.roads) kingdom.roads = {};
      if (!kingdom.roads.blockedConnections) kingdom.roads.blockedConnections = [];
      
      kingdom.roads.blockedConnections.push(blockedConnection);
      
      logger.info(`[RoadEditorHandlers] ✂️ Cut road segment: ${blockedConnection.hex1} <-> ${blockedConnection.hex2}`);
    });

    const ui = (globalThis as any).ui;
    ui?.notifications?.info('Road segment cut');

    return { success: true };
  }

  /**
   * Check if a connection is already blocked
   */
  private isConnectionBlocked(hex1: string, hex2: string, blockedConnections: RoadBlockedConnection[]): boolean {
    return blockedConnections.some(conn => 
      (conn.hex1 === hex1 && conn.hex2 === hex2) ||
      (conn.hex1 === hex2 && conn.hex2 === hex1)
    );
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
}
