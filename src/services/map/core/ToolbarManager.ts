/**
 * ToolbarManager - Manages the map overlay toolbar lifecycle
 */

import type { SvelteComponent } from 'svelte';
import { logger } from '../../utils/Logger';

/**
 * Manages the map overlay toolbar's lifecycle and state
 */
export class ToolbarManager {
  private toolbarComponent: SvelteComponent | null = null;
  private toolbarElement: HTMLElement | null = null;
  private toolbarManuallyClosed: boolean = false;
  private onManualCloseCallback?: () => void;

  /**
   * Show the map overlay toolbar
   * @param onManualClose - Optional callback when toolbar is manually closed
   */
  async show(onManualClose?: () => void): Promise<void> {
    if (this.toolbarComponent) {

      return;
    }

    this.onManualCloseCallback = onManualClose;

    try {
      // Dynamically import the toolbar component
      const { default: MapOverlayToolbar } = await import('../../view/map/MapOverlayToolbar.svelte');

      // Create container element
      this.toolbarElement = document.createElement('div');
      this.toolbarElement.id = 'reignmaker-map-overlay-toolbar';
      document.body.appendChild(this.toolbarElement);

      // Mount Svelte component
      this.toolbarComponent = new MapOverlayToolbar({
        target: this.toolbarElement
      });

      // Listen for close event
      this.toolbarElement.addEventListener('close', () => {
        this.handleManualClose();
      });

    } catch (error) {
      logger.error('[ToolbarManager] Failed to show toolbar:', error);
      ui?.notifications?.error('Failed to show map overlay toolbar');
    }
  }

  /**
   * Hide the map overlay toolbar
   */
  hide(): void {
    if (this.toolbarComponent) {
      this.toolbarComponent.$destroy();
      this.toolbarComponent = null;
    }

    if (this.toolbarElement) {
      this.toolbarElement.remove();
      this.toolbarElement = null;
    }

  }

  /**
   * Handle toolbar manual close (X button)
   * Returns true to indicate manual close occurred
   */
  private handleManualClose(): boolean {

    this.toolbarManuallyClosed = true;
    this.hide();
    
    // Trigger callback if provided
    if (this.onManualCloseCallback) {
      this.onManualCloseCallback();
    }
    
    return true;
  }

  /**
   * Check if toolbar is currently visible
   */
  isVisible(): boolean {
    return this.toolbarComponent !== null;
  }

  /**
   * Check if toolbar was manually closed
   */
  wasManuallyClosed(): boolean {
    return this.toolbarManuallyClosed;
  }

  /**
   * Reset the manually closed flag
   */
  resetManuallyClosed(): void {
    this.toolbarManuallyClosed = false;
  }
}
