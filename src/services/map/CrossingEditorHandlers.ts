/**
 * CrossingEditorHandlers - Waterfall, bridge, and ford editing functionality
 * Handles edge-based feature placement (waterfalls, bridges, fords)
 */

import { logger } from '../../utils/Logger';
import { getConnectorAtPosition } from './renderers/RiverConnectorRenderer';
import { waterFeatureService } from './WaterFeatureService';

export class CrossingEditorHandlers {
  /**
   * Handle waterfall click - toggle waterfall on edge
   * Waterfalls block naval travel but not swimmers
   */
  async handleWaterfallClick(hexId: string, position: { x: number; y: number }): Promise<void> {
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
      logger.info('[CrossingEditorHandlers] ❌ No connector at click position');
      return;
    }

    // Waterfalls must be on edges (not centers)
    if ('center' in connector) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('Waterfalls can only be placed on hex edges');
      return;
    }

    const edge = connector.edge;
    logger.info(`[CrossingEditorHandlers] 💧 Toggling waterfall at hex ${hexId}, edge ${edge}`);

    // Toggle waterfall
    const wasAdded = await waterFeatureService.toggleWaterfall(hexI, hexJ, edge);

    // Show notification
    const ui = (globalThis as any).ui;
    if (wasAdded) {
      ui?.notifications?.info('Waterfall added (blocks boats)');
    } else {
      ui?.notifications?.info('Waterfall removed');
    }
  }

  /**
   * Handle bridge click - toggle bridge crossing on edge
   * Bridges allow grounded armies to cross water
   */
  async handleBridgeClick(hexId: string, position: { x: number; y: number }): Promise<void> {
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
      logger.info('[CrossingEditorHandlers] ❌ No connector at click position');
      return;
    }

    // Bridges must be on edges (not centers)
    if ('center' in connector) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('Bridges can only be placed on hex edges');
      return;
    }

    const edge = connector.edge;
    logger.info(`[CrossingEditorHandlers] 🌉 Toggling bridge at hex ${hexId}, edge ${edge}`);

    // Toggle bridge
    const wasAdded = await waterFeatureService.toggleBridge(hexI, hexJ, edge);

    // Show notification
    const ui = (globalThis as any).ui;
    if (wasAdded) {
      ui?.notifications?.info('Bridge added (allows crossing)');
    } else {
      ui?.notifications?.info('Bridge removed');
    }
  }

  /**
   * Handle ford click - toggle ford crossing on edge
   * Fords allow grounded armies to cross water (natural shallow crossing)
   */
  async handleFordClick(hexId: string, position: { x: number; y: number }): Promise<void> {
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
      logger.info('[CrossingEditorHandlers] ❌ No connector at click position');
      return;
    }

    // Fords must be on edges (not centers)
    if ('center' in connector) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('Fords can only be placed on hex edges');
      return;
    }

    const edge = connector.edge;
    logger.info(`[CrossingEditorHandlers] 🚶 Toggling ford at hex ${hexId}, edge ${edge}`);

    // Toggle ford
    const wasAdded = await waterFeatureService.toggleFord(hexI, hexJ, edge);

    // Show notification
    const ui = (globalThis as any).ui;
    if (wasAdded) {
      ui?.notifications?.info('Ford added (allows crossing)');
    } else {
      ui?.notifications?.info('Ford removed');
    }
  }
}
