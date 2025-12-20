/**
 * ProvinceEditorService - Manages province hex painting mode
 *
 * Provides a specialized hex editing mode for painting hexes with provinces.
 * Shows only claimed territory hexes, with unassigned hexes dimmed.
 * Follows the same patterns as HexSelectorService for app management.
 */

import type { Province } from '../../actors/KingdomActor';
import { get, type Unsubscriber } from 'svelte/store';
import { kingdomData, provinces, assignHexToProvince } from '../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { ReignMakerMapLayer } from '../map/core/ReignMakerMapLayer';
import { getOverlayManager } from '../map/core/OverlayManager';
import { appWindowManager } from '../ui/AppWindowManager';
import { isContiguousAddition } from '../../utils/hex-contiguity';
import { disableCanvasLayerInteractivity, restoreCanvasLayerInteractivity } from '../../utils/canvasLayerInteractivity';
import { logger } from '../../utils/Logger';

// Color palette for province fills (distinct, semi-transparent colors)
const PROVINCE_COLORS = [
  0x4CAF50, // Green
  0x2196F3, // Blue
  0xFF9800, // Orange
  0x9C27B0, // Purple
  0x00BCD4, // Cyan
  0xE91E63, // Pink
  0x8BC34A, // Light Green
  0x3F51B5, // Indigo
  0xFFEB3B, // Yellow
  0x795548, // Brown
  0x607D8B, // Blue Grey
  0xF44336, // Red
] as const;

export interface ProvinceEditorConfig {
  onComplete?: () => void;
  onCancel?: () => void;
}

export class ProvinceEditorService {
  private active = false;
  private mapLayer: ReignMakerMapLayer;
  private overlayManager = getOverlayManager();
  private panelElement: HTMLElement | null = null;
  private panelComponent: any = null;
  private selectedProvinceId: string | null = null;
  private config: ProvinceEditorConfig | null = null;
  private pointerDownHandler: ((event: PointerEvent) => void) | null = null;
  private pointerMoveHandler: ((event: PointerEvent) => void) | null = null;
  private pointerUpHandler: ((event: PointerEvent) => void) | null = null;
  private lastHoveredHexId: string | null = null;
  private isPainting = false;
  private paintedHexesThisDrag: Set<string> = new Set();
  private provincesUnsubscribe: Unsubscriber | null = null;
  private previousActiveControl: string | null = null;
  private previousTokenActiveTool: string | null = null;
  private savedLayerInteractivity: Map<string, boolean> = new Map();

  constructor() {
    this.mapLayer = ReignMakerMapLayer.getInstance();
  }

  /**
   * Start province editing mode
   */
  async start(config?: ProvinceEditorConfig): Promise<void> {
    if (this.active) {
      logger.warn('[ProvinceEditor] Already active');
      return;
    }

    this.config = config || {};
    this.active = true;
    this.selectedProvinceId = null;

    logger.info('[ProvinceEditor] Starting province editor');

    try {
      // 1. Minimize Reignmaker app
      this.minimizeReignmakerApp();

      // 3. Disable canvas layer interactivity (prevents token/tile selection and marquee)
      this.savedLayerInteractivity = disableCanvasLayerInteractivity();

      // 4. Disable Foundry scene controls
      this.disableTokenSceneControl();

      // 5. Show map overlays (territory + provinces)
      await this.showOverlays();

      // 5. Mount floating panel
      this.mountPanel();

      // 6. Attach canvas listeners
      this.attachCanvasListeners();

      // 7. Subscribe to provinces for panel updates (overlay handles rendering reactively)
      this.provincesUnsubscribe = provinces.subscribe(() => {
        if (this.active && this.panelComponent) {
          this.panelComponent.$set({ provinces: this.getProvinces() });
        }
      });

      // Notify user
      const ui = (globalThis as any).ui;
      ui?.notifications?.info('Click hexes to assign them to the selected province');
    } catch (error) {
      logger.error('[ProvinceEditor] Failed to start:', error);
      this.cleanup();
    }
  }

  /**
   * Get the color for a province based on its index in the provinces array
   * Matches the color logic in ProvincesFillOverlay
   */
  getProvinceColor(provinceId: string): number {
    const currentProvinces = this.getProvinces();
    const index = currentProvinces.findIndex(p => p.id === provinceId);
    if (index === -1) return 0x808080;
    return PROVINCE_COLORS[index % PROVINCE_COLORS.length];
  }

  /**
   * Stop province editing mode
   */
  async stop(): Promise<void> {
    await this.cleanup();
    this.config?.onComplete?.();
  }

  /**
   * Cancel province editing mode
   */
  async cancel(): Promise<void> {
    await this.cleanup();
    this.config?.onCancel?.();
  }

  /**
   * Set the currently selected province for painting
   */
  setSelectedProvince(provinceId: string | null): void {
    this.selectedProvinceId = provinceId;
    // Update the panel to reflect the new selection
    if (this.panelComponent) {
      this.panelComponent.$set({ selectedProvinceId: provinceId });
    }
    logger.info(`[ProvinceEditor] Selected province: ${provinceId || 'None'}`);
  }

  /**
   * Get current provinces from store
   */
  getProvinces(): Province[] {
    return get(provinces);
  }

  /**
   * Minimize the Reignmaker app (same pattern as HexSelectorService)
   */
  private minimizeReignmakerApp(): void {
    appWindowManager.enterMapMode('hide');
  }

  /**
   * Restore the Reignmaker app (same pattern as HexSelectorService)
   */
  private restoreReignmakerApp(): void {
    appWindowManager.exitMapMode();
  }

  /**
   * Show relevant overlays for province editing
   * Uses temporary overlay state to preserve player preferences
   */
  private async showOverlays(): Promise<void> {
    // Clear any existing selection/hover layers
    this.mapLayer.clearSelection();
    this.mapLayer.hideInteractiveHover();

    // Show province fills (instead of territory fill), territory border, province borders
    const actionViewOverlays = [
      'provinces-fill',      // Province hex fills with colors
      'territory-border',    // Kingdom border
      'provinces',           // Province internal borders
      'interactive-hover'    // Hover feedback
    ];

    // Apply temporary overlay configuration (saves current state automatically)
    await this.overlayManager.setTemporaryOverlays(actionViewOverlays);

    // Ensure map layer is visible
    this.mapLayer.showPixiContainer();

    logger.info('[ProvinceEditor] Applied province editing overlays:', actionViewOverlays);
  }

  /**
   * Restore player's overlay preferences
   */
  private async restoreOverlays(): Promise<void> {
    await this.overlayManager.popOverlayState();
    logger.info('[ProvinceEditor] Restored player overlay preferences');
  }

  /**
   * Disable Foundry scene controls to hide hex highlight outline
   * Sets activeControl to null rather than switching to another control
   */
  private disableTokenSceneControl(): void {
    try {
      const ui = (globalThis as any).ui;

      if (!ui?.controls?.control) {
        logger.warn('[ProvinceEditor] SceneControls not available');
        return;
      }

      const controls = ui.controls.control;

      // Save current active control group
      this.previousActiveControl = controls.activeControl || null;

      // Save the token control's active tool if token control is currently active
      const tokenControl = controls.controls?.['token'];
      if (tokenControl && this.previousActiveControl === 'token') {
        this.previousTokenActiveTool = tokenControl.activeTool || null;
      } else {
        this.previousTokenActiveTool = null;
      }

      // Disable by setting activeControl to null
      controls.activeControl = null;
      controls.render();
      logger.info('[ProvinceEditor] Disabled scene controls');
    } catch (error) {
      logger.warn('[ProvinceEditor] Failed to disable scene controls:', error);
    }
  }

  /**
   * Restore previous active scene control and tool
   */
  private restoreTokenSceneControl(): void {
    try {
      const ui = (globalThis as any).ui;

      if (!ui?.controls?.control) {
        logger.warn('[ProvinceEditor] SceneControls not available for restore');
        return;
      }

      const controls = ui.controls.control;

      // Restore previous active control group if we saved one
      if (this.previousActiveControl !== null) {
        controls.activeControl = this.previousActiveControl;

        // If we're restoring the token control, also restore its active tool
        if (this.previousActiveControl === 'token' && this.previousTokenActiveTool !== null) {
          const tokenControl = controls.controls?.['token'];
          if (tokenControl) {
            tokenControl.activeTool = this.previousTokenActiveTool;
          }
        }

        controls.render();
        logger.info(`[ProvinceEditor] Restored previous active control: ${this.previousActiveControl}`);
      } else {
        controls.activeControl = null;
        controls.render();
        logger.info('[ProvinceEditor] Cleared active control (no previous state)');
      }

      // Reset saved state
      this.previousActiveControl = null;
      this.previousTokenActiveTool = null;
    } catch (error) {
      logger.warn('[ProvinceEditor] Failed to restore token scene control:', error);
    }
  }

  /**
   * Mount the floating panel
   */
  private mountPanel(): void {
    // Create mount point
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'province-editor-panel-mount';
    document.body.appendChild(this.panelElement);

    // Dynamically import and mount the panel
    import('./ProvinceEditorPanel.svelte').then(({ default: ProvinceEditorPanel }) => {
      this.panelComponent = new ProvinceEditorPanel({
        target: this.panelElement!,
        props: {
          provinces: this.getProvinces(),
          selectedProvinceId: this.selectedProvinceId,
          onProvinceSelect: (id: string | null) => this.setSelectedProvince(id),
          onDone: () => this.stop(),
          onCancel: () => this.cancel(),
        },
      });
    });
  }

  /**
   * Attach direct event listeners to canvas stage
   * Uses capture phase to intercept events BEFORE Foundry's handlers
   */
  private attachCanvasListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.warn('[ProvinceEditor] Canvas stage not available');
      return;
    }

    // Create bound handlers
    this.pointerDownHandler = this.handlePointerDown.bind(this);
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerUpHandler = this.handlePointerUp.bind(this);

    // Attach with capture:true to intercept BEFORE Foundry's handlers
    canvas.stage.addEventListener('pointerdown', this.pointerDownHandler, { capture: true });
    canvas.stage.addEventListener('pointermove', this.pointerMoveHandler, { capture: true });
    canvas.stage.addEventListener('pointerup', this.pointerUpHandler, { capture: true });

    logger.info('[ProvinceEditor] Attached direct event listeners');
  }

  /**
   * Detach canvas listeners
   */
  private detachCanvasListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) return;

    if (this.pointerDownHandler) {
      canvas.stage.removeEventListener('pointerdown', this.pointerDownHandler, { capture: true });
      this.pointerDownHandler = null;
    }
    if (this.pointerMoveHandler) {
      canvas.stage.removeEventListener('pointermove', this.pointerMoveHandler, { capture: true });
      this.pointerMoveHandler = null;
    }
    if (this.pointerUpHandler) {
      canvas.stage.removeEventListener('pointerup', this.pointerUpHandler, { capture: true });
      this.pointerUpHandler = null;
    }

    logger.info('[ProvinceEditor] Removed direct event listeners');
  }

  /**
   * Handle pointer down event
   */
  private async handlePointerDown(event: PointerEvent): Promise<void> {
    if (!this.active) return;

    // Allow right-click to pass through for panning
    if (event.button === 2) return;

    // Allow clicks on panel UI to pass through
    const target = event.target as HTMLElement;
    if (target?.closest?.('.province-editor-panel')) {
      return;
    }

    // CRITICAL: Stop event propagation to block marquee selection
    event.stopImmediatePropagation();
    event.stopPropagation();

    // Get hex from click position
    const hexId = this.getHexIdFromPointerEvent(event);
    if (!hexId) return;

    // Start painting mode
    this.isPainting = true;
    this.paintedHexesThisDrag.clear();

    // Paint the first hex
    await this.paintHex(hexId);
    this.paintedHexesThisDrag.add(hexId);
  }

  /**
   * Handle pointer move event
   */
  private async handlePointerMove(event: PointerEvent): Promise<void> {
    if (!this.active) return;

    // Allow right-click panning
    if (event.buttons & 2) return;

    // CRITICAL: Stop event propagation to block marquee
    event.stopImmediatePropagation();
    event.stopPropagation();

    const hexId = this.getHexIdFromPointerEvent(event);

    // Handle drag-to-paint
    if (this.isPainting && hexId && !this.paintedHexesThisDrag.has(hexId)) {
      await this.paintHex(hexId);
      this.paintedHexesThisDrag.add(hexId);
    }

    // Update hover feedback
    if (hexId !== this.lastHoveredHexId) {
      this.lastHoveredHexId = hexId;

      if (!hexId) {
        this.mapLayer.hideInteractiveHover();
        return;
      }

      // Check if hex is claimed territory
      const kingdom = get(kingdomData);
      const hex = kingdom.hexes.find(h => h.id === hexId);

      if (!hex || hex.claimedBy !== PLAYER_KINGDOM) {
        // Invalid hex - show red hover
        this.mapLayer.showInteractiveHover(hexId, {
          fillColor: 0xff0000,
          fillAlpha: 0.2,
        });
      } else if (this.selectedProvinceId === null) {
        // "None" selected - no fill, just subtle border to indicate unassign
        this.mapLayer.showInteractiveHover(hexId, {
          fillColor: 0x888888,
          fillAlpha: 0.1,
          borderColor: 0x888888,
          borderAlpha: 0.5,
          borderWidth: 2,
        });
      } else {
        // Province selected - show province color
        const color = this.getProvinceColor(this.selectedProvinceId);
        this.mapLayer.showInteractiveHover(hexId, {
          fillColor: color,
          fillAlpha: 0.4,
          borderColor: color,
          borderAlpha: 0.8,
          borderWidth: 2,
        });
      }
    }
  }

  /**
   * Handle pointer up event
   */
  private handlePointerUp(event: PointerEvent): void {
    if (!this.active) return;

    // Allow right-click to pass through
    if (event.button === 2) return;

    // Stop painting mode
    if (this.isPainting) {
      this.isPainting = false;
      this.paintedHexesThisDrag.clear();
    }
  }

  /**
   * Paint a hex with the selected province
   */
  private async paintHex(hexId: string): Promise<void> {
    // Check if hex is claimed territory
    const kingdom = get(kingdomData);
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (!hex || hex.claimedBy !== PLAYER_KINGDOM) {
      return; // Silently ignore non-territory hexes during drag
    }

    // Validate contiguity if assigning to a province
    if (this.selectedProvinceId) {
      const province = kingdom.provinces?.find(p => p.id === this.selectedProvinceId);
      if (province && province.hexIds.length > 0 && !province.hexIds.includes(hexId)) {
        if (!isContiguousAddition(province.hexIds, hexId)) {
          return; // Silently ignore non-contiguous hexes during drag
        }
      }
    }

    // Assign hex to province
    await assignHexToProvince(hexId, this.selectedProvinceId);
    logger.info(`[ProvinceEditor] Assigned hex ${hexId} to province ${this.selectedProvinceId || 'None'}`);
  }

  /**
   * Get hex ID from pointer event
   */
  private getHexIdFromPointerEvent(event: PointerEvent): string | null {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return null;

    const point = { x: event.clientX, y: event.clientY };
    const canvasPos = canvas.canvasCoordinatesFromClient(point);
    if (!canvasPos) return null;

    const offset = canvas.grid.getOffset(canvasPos);
    if (!offset) return null;

    return `${offset.i}.${offset.j}`;
  }

  /**
   * Cleanup and restore state
   */
  private async cleanup(): Promise<void> {
    // Unsubscribe from provinces store
    if (this.provincesUnsubscribe) {
      this.provincesUnsubscribe();
      this.provincesUnsubscribe = null;
    }

    // Detach canvas listeners
    this.detachCanvasListeners();

    // Clear hover layer
    this.mapLayer.hideInteractiveHover();

    // Restore player's overlay preferences
    await this.restoreOverlays();

    // Destroy panel component
    if (this.panelComponent) {
      this.panelComponent.$destroy();
      this.panelComponent = null;
    }

    // Remove panel mount element
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }

    // Restore Reignmaker app
    this.restoreReignmakerApp();

    // Restore canvas layer interactivity
    restoreCanvasLayerInteractivity(this.savedLayerInteractivity);
    this.savedLayerInteractivity.clear();

    // Restore Foundry scene controls
    this.restoreTokenSceneControl();

    // Reset state
    this.active = false;
    this.config = null;
    this.selectedProvinceId = null;
    this.lastHoveredHexId = null;

    logger.info('[ProvinceEditor] Cleaned up');
  }
}

// Export singleton instance
export const provinceEditorService = new ProvinceEditorService();
