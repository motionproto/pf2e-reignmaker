/**
 * CrossingEditorHandlers - Waterfall, bridge, and ford editing functionality
 * Handles segment-based feature placement (waterfalls, bridges, fords)
 */

import { logger } from '../../utils/Logger';
import { waterFeatureService } from './WaterFeatureService';

export class CrossingEditorHandlers {
  /**
   * Handle waterfall click - toggle waterfall on river segment
   * Waterfalls block naval travel but not swimmers
   * Uses segment detection (like scissors tool)
   */
  async handleWaterfallClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    logger.info(`[CrossingEditorHandlers] 💧 Toggling waterfall at position (${position.x}, ${position.y})`);

    // Toggle waterfall using segment detection
    const result = await waterFeatureService.toggleWaterfall(position);

    // Show notification
    const ui = (globalThis as any).ui;
    if (result === null) {
      ui?.notifications?.warn('Click closer to a river segment to place a waterfall');
    } else if (result) {
      ui?.notifications?.info('Waterfall added (blocks boats)');
    } else {
      ui?.notifications?.info('Waterfall removed');
    }
  }

  /**
   * Handle bridge click - toggle bridge crossing on river segment
   * Bridges allow grounded armies to cross water
   * Uses segment detection (like scissors tool)
   */
  async handleBridgeClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    logger.info(`[CrossingEditorHandlers] 🌉 Toggling bridge at position (${position.x}, ${position.y})`);

    // Toggle bridge using segment detection
    const result = await waterFeatureService.toggleBridge(position);

    // Show notification
    const ui = (globalThis as any).ui;
    if (result === null) {
      ui?.notifications?.warn('Click closer to a river segment to place a bridge');
    } else if (result) {
      ui?.notifications?.info('Bridge added (allows crossing)');
    } else {
      ui?.notifications?.info('Bridge removed');
    }
  }

  /**
   * Handle ford click - toggle ford crossing on river segment
   * Fords allow grounded armies to cross water (natural shallow crossing)
   * Uses segment detection (like scissors tool)
   */
  async handleFordClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    logger.info(`[CrossingEditorHandlers] 🚶 Toggling ford at position (${position.x}, ${position.y})`);

    // Toggle ford using segment detection
    const result = await waterFeatureService.toggleFord(position);

    // Show notification
    const ui = (globalThis as any).ui;
    if (result === null) {
      ui?.notifications?.warn('Click closer to a river segment to place a ford');
    } else if (result) {
      ui?.notifications?.info('Ford added (allows crossing)');
    } else {
      ui?.notifications?.info('Ford removed');
    }
  }
}
