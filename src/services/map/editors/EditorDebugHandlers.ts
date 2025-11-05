/**
 * EditorDebugHandlers - Debug functionality for editor mode
 * Logs hex IDs, edge IDs, and neighbor information on click
 */

import { logger } from '../../../utils/Logger';
import { getEdgeIdForDirection, edgeNameToIndex } from '../../../utils/edgeUtils';
import { getEdgeMidpoint, getAllEdges } from '../../../utils/riverUtils';
import type { EdgeDirection } from '../../../models/Hex';

export class EditorDebugHandlers {
  private debugHexMode = false;
  private debugEdgeMode = false;
  private debugNeighborsMode = false;
  private debugClickHandler: ((event: PointerEvent) => void) | null = null;

  /**
   * Toggle hex debug mode
   */
  toggleDebugHex(): boolean {
    this.debugHexMode = !this.debugHexMode;
    const status = this.debugHexMode ? 'enabled' : 'disabled';
    this.updateDebugListener();
    console.log(`%c🐛 Hex Debug: ${status.toUpperCase()}`, 'font-size: 14px; font-weight: bold; color: ' + (this.debugHexMode ? '#00FF00' : '#FF0000'));
    return this.debugHexMode;
  }

  /**
   * Toggle edge debug mode
   */
  toggleDebugEdge(): boolean {
    this.debugEdgeMode = !this.debugEdgeMode;
    const status = this.debugEdgeMode ? 'enabled' : 'disabled';
    this.updateDebugListener();
    console.log(`%c🐛 Edge Debug: ${status.toUpperCase()}`, 'font-size: 14px; font-weight: bold; color: ' + (this.debugEdgeMode ? '#00FF00' : '#FF0000'));
    return this.debugEdgeMode;
  }

  /**
   * Toggle neighbors debug mode
   */
  toggleDebugNeighbors(): boolean {
    this.debugNeighborsMode = !this.debugNeighborsMode;
    const status = this.debugNeighborsMode ? 'enabled' : 'disabled';
    this.updateDebugListener();
    console.log(`%c🐛 Neighbors Debug: ${status.toUpperCase()}`, 'font-size: 14px; font-weight: bold; color: ' + (this.debugNeighborsMode ? '#00FF00' : '#FF0000'));
    return this.debugNeighborsMode;
  }

  /**
   * Check if hex debug mode is active
   */
  isDebugHexMode(): boolean {
    return this.debugHexMode;
  }

  /**
   * Check if edge debug mode is active
   */
  isDebugEdgeMode(): boolean {
    return this.debugEdgeMode;
  }

  /**
   * Check if neighbors debug mode is active
   */
  isDebugNeighborsMode(): boolean {
    return this.debugNeighborsMode;
  }

  /**
   * Update debug listener based on active modes
   */
  private updateDebugListener(): void {
    this.removeDebugListener();
    
    if (this.debugHexMode || this.debugEdgeMode || this.debugNeighborsMode) {
      this.attachDebugListener();
    }
  }

  /**
   * Attach global debug click listener
   */
  private attachDebugListener(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.warn('[EditorDebugHandlers] Cannot attach debug listener - canvas not available');
      return;
    }

    this.debugClickHandler = async (event: PointerEvent) => {
      if (event.button !== 0) return;
      
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      if (this.debugHexMode) {
        console.log(`%c🗺️ Clicked Hex: ${hexId} [${offset.i}:${offset.j}]`, 'font-size: 12px; color: #00BFFF; font-weight: bold;');
      }
      
      if (this.debugEdgeMode) {
        const edge = await this.findNearestEdge(offset.i, offset.j, canvasPos, canvas);
        if (edge) {
          console.log(`%c📐 Clicked Edge: ${edge.id} (${edge.direction})`, 'font-size: 12px; color: #FFD700; font-weight: bold;');
        }
      }
      
      if (this.debugNeighborsMode) {
        const neighbors = canvas.grid.getNeighbors(offset.i, offset.j);
        if (neighbors) {
          const neighborStrs = neighbors.map((n: [number, number]) => `${n[0]}:${n[1]}`);
          console.log(`%c🔗 Neighbors of ${hexId}: [${neighborStrs.join(', ')}]`, 'font-size: 12px; color: #FF69B4; font-weight: bold;');
        }
      }
    };
    
    canvas.stage.addEventListener('pointerdown', this.debugClickHandler, { capture: true });
  }

  /**
   * Find nearest edge to click position
   */
  private async findNearestEdge(
    hexI: number, 
    hexJ: number, 
    clickPos: { x: number; y: number },
    canvas: any
  ): Promise<{ id: string; direction: string } | null> {
    const EDGE_THRESHOLD = 30;
    const edges = getAllEdges();
    let nearestEdge: { id: string; direction: string; distance: number } | null = null;
    
    for (const edge of edges) {
      const position = getEdgeMidpoint(hexI, hexJ, edge, canvas);
      if (!position) continue;
      
      const dx = clickPos.x - position.x;
      const dy = clickPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= EDGE_THRESHOLD) {
        if (!nearestEdge || distance < nearestEdge.distance) {
          const edgeIndex = edgeNameToIndex(edge);
          const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
          nearestEdge = { id: edgeId, direction: edge, distance };
        }
      }
    }
    
    return nearestEdge ? { id: nearestEdge.id, direction: nearestEdge.direction } : null;
  }

  /**
   * Remove debug listener
   */
  removeDebugListener(): void {
    if (!this.debugClickHandler) return;
    
    const canvas = (globalThis as any).canvas;
    if (canvas?.stage) {
      canvas.stage.removeEventListener('pointerdown', this.debugClickHandler, { capture: true });
    }
    
    this.debugClickHandler = null;
  }
}
