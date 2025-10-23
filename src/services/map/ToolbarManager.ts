/**
 * ToolbarManager - Manages the map overlay toolbar lifecycle
 */

import type { SvelteComponent } from 'svelte';

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
      console.log('[ToolbarManager] Toolbar already visible');
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

      console.log('[ToolbarManager] ✅ Toolbar shown');
    } catch (error) {
      console.error('[ToolbarManager] Failed to show toolbar:', error);
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

    console.log('[ToolbarManager] Toolbar hidden');
  }

  /**
   * Handle toolbar manual close (X button)
   * Returns true to indicate manual close occurred
   */
  private handleManualClose(): boolean {
    console.log('[ToolbarManager] Toolbar manually closed via X button');
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
