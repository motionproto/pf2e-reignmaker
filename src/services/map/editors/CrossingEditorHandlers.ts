/**
 * CrossingEditorHandlers - Waterfall, bridge, and ford editing functionality
 * Handles segment-based feature placement (waterfalls, bridges, fords)
 */

import { logger } from '../../../utils/Logger';
import { waterFeatureService } from '../core/WaterFeatureService';

export class CrossingEditorHandlers {
  /**
   * Handle waterfall click - toggle waterfall on connection point
   * Waterfalls block naval travel but not swimmers
   * Uses connector detection (same as river editing)
   */
  async handleWaterfallClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    logger.info(`[CrossingEditorHandlers] 💧 Toggling waterfall at hex ${hexId}, position (${position.x}, ${position.y})`);

    // Toggle waterfall using connector detection
    const result = await waterFeatureService.toggleWaterfall(hexId, position);

    // Show notification
    const ui = (globalThis as any).ui;
    if (result === null) {
      ui?.notifications?.warn('Click on a connector dot to place a waterfall');
    } else if (result) {
      ui?.notifications?.info('Waterfall added (blocks boats)');
    } else {
      ui?.notifications?.info('Waterfall removed');
    }
  }

  /**
   * Handle bridge click - toggle bridge crossing on connection point
   * Bridges allow grounded armies to cross water
   * Uses connector detection (same as river editing)
   */
  async handleBridgeClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    logger.info(`[CrossingEditorHandlers] 🌉 Toggling bridge at hex ${hexId}, position (${position.x}, ${position.y})`);

    // Toggle bridge using connector detection
    const result = await waterFeatureService.toggleBridge(hexId, position);

    // Show notification
    const ui = (globalThis as any).ui;
    if (result === null) {
      ui?.notifications?.warn('Click on a connector dot to place a bridge');
    } else if (result) {
      ui?.notifications?.info('Bridge added (allows crossing)');
    } else {
      ui?.notifications?.info('Bridge removed');
    }
  }

  /**
   * Handle ford click - toggle ford crossing on connection point
   * Fords allow grounded armies to cross water (natural shallow crossing)
   * Uses connector detection (same as river editing)
   */
  async handleFordClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    logger.info(`[CrossingEditorHandlers] 🚶 Toggling ford at hex ${hexId}, position (${position.x}, ${position.y})`);

    // Toggle ford using connector detection
    const result = await waterFeatureService.toggleFord(hexId, position);

    // Show notification
    const ui = (globalThis as any).ui;
    if (result === null) {
      ui?.notifications?.warn('Click on a connector dot to place a ford');
    } else if (result) {
      ui?.notifications?.info('Ford added (allows crossing)');
    } else {
      ui?.notifications?.info('Ford removed');
    }
  }
}
