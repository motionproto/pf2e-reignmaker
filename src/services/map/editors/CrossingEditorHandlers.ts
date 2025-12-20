/**
 * CrossingEditorHandlers - Waterfall, bridge, and ford editing functionality
 * Handles segment-based feature placement (waterfalls, bridges, fords)
 */

import { logger } from '../../../utils/Logger';
import { waterFeatureService } from '../core/WaterFeatureService';
import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import { computeBarrierSegments } from '../../../utils/barrierSegmentUtils';

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

    // Recompute barrier segments (crossings affect which segments block)
    if (result !== null) {
      await this.updateBarrierSegments();
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

    // Recompute barrier segments (crossings affect which segments block)
    if (result !== null) {
      await this.updateBarrierSegments();
    }
  }

  /**
   * Recompute and save barrier segments after crossing changes
   */
  private async updateBarrierSegments(): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[CrossingEditorHandlers] Cannot update barrier segments - canvas not ready');
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

    logger.info(`[CrossingEditorHandlers] Updated ${segments.length} barrier segments`);
  }
}
