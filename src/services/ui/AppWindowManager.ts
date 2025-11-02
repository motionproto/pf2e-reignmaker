/**
 * AppWindowManager - Centralized app visibility control for map interactions
 * 
 * Manages Reignmaker app visibility during map interactions using CSS transforms
 * instead of Foundry's minimize API. This provides:
 * - Smooth transitions without UI chrome
 * - No state conflicts with Foundry's Application lifecycle
 * - Standardized behavior across all map interaction services
 * - Easy customization of hide/show behavior
 */

import { logger } from '../../utils/Logger';
import { 
  disableCanvasLayerInteractivity, 
  restoreCanvasLayerInteractivity 
} from '../../utils/canvasLayerInteractivity';

export type MapModeStyle = 'slide' | 'fade' | 'minimize' | 'hide';

export class AppWindowManager {
  private static instance: AppWindowManager | null = null;
  private appElement: HTMLElement | null = null;
  private currentStyle: MapModeStyle | null = null;
  private originalTransform: string = '';
  private originalOpacity: string = '';
  private overlayWasActive: boolean = false; // Track if overlays were already active before map mode
  private savedLayerInteractivity: Map<string, boolean> = new Map(); // Track canvas layer interactivity state
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): AppWindowManager {
    if (!AppWindowManager.instance) {
      AppWindowManager.instance = new AppWindowManager();
    }
    return AppWindowManager.instance;
  }
  
  /**
   * Find and cache the Reignmaker app element
   * Uses direct DOM query - most reliable method
   */
  private findAppElement(): HTMLElement | null {
    // Check if cached element is still in DOM
    if (this.appElement && document.contains(this.appElement)) {
      return this.appElement;
    }
    
    // Direct DOM query by ID
    this.appElement = document.getElementById('pf2e-reignmaker');
    
    if (!this.appElement) {
      logger.warn('[AppWindowManager] Could not find Reignmaker app element (#pf2e-reignmaker)');
    }
    
    return this.appElement;
  }
  
  /**
   * Enter map interaction mode (hide/minimize app)
   * 
   * @param style Visual style for hiding:
   *   - 'slide': Slide to right edge with peek (recommended)
   *   - 'fade': Fade to low opacity
   *   - 'minimize': Scale down to corner
   *   - 'hide': Hide completely
   */
  async enterMapMode(style: MapModeStyle = 'slide'): Promise<void> {
    const app = this.findAppElement();
    if (!app) {
      logger.warn('[AppWindowManager] Cannot enter map mode - app not found');
      return;
    }
    
    // Save original inline styles
    this.originalTransform = app.style.transform;
    this.originalOpacity = app.style.opacity;
    
    // Activate overlay scene control if not already active
    await this.activateOverlayControl();
    
    // Disable canvas layer interactivity (prevents token/tile selection during map interactions)
    this.savedLayerInteractivity = disableCanvasLayerInteractivity();
    
    // Add base class (for pointer-events and transition)
    app.classList.add('map-interaction-mode');
    app.classList.add(`map-interaction-${style}`);
    
    // Apply visibility directly to inline style
    // For simplicity, just hide completely (best UX for map interactions)
    switch (style) {
      case 'hide':
      default:
        // Simply hide off-screen to the right
        app.style.visibility = 'hidden';
        break;
      case 'slide':
        // Keep original positioning, just shift right
        app.style.transform = this.originalTransform + ' translateX(calc(100% - 40px))';
        app.style.opacity = '0.6';
        break;
      case 'fade':
        app.style.opacity = '0.15';
        break;
      case 'minimize':
        app.style.transform = this.originalTransform + ' scale(0.2) translate(200%, 200%)';
        app.style.opacity = '0.5';
        break;
    }
    
    this.currentStyle = style;
    logger.info(`[AppWindowManager] ✅ Entered map mode (${style})`);
  }
  
  /**
   * Exit map interaction mode (restore app)
   */
  async exitMapMode(): Promise<void> {
    const app = this.findAppElement();
    if (!app) {
      logger.warn('[AppWindowManager] Cannot exit map mode - app not found');
      return;
    }
    
    // Restore original inline styles
    app.style.visibility = '';
    app.style.transform = this.originalTransform;
    app.style.opacity = this.originalOpacity;
    
    // Restore canvas layer interactivity
    restoreCanvasLayerInteractivity(this.savedLayerInteractivity);
    this.savedLayerInteractivity.clear();
    
    // Restore overlay control state if we activated it
    await this.restoreOverlayControl();
    
    // Remove all map interaction classes
    app.classList.remove(
      'map-interaction-mode',
      'map-interaction-slide',
      'map-interaction-fade',
      'map-interaction-minimize',
      'map-interaction-hide'
    );
    
    logger.info('[AppWindowManager] ✅ Exited map mode');
    this.currentStyle = null;
  }
  
  /**
   * Check if currently in map mode
   */
  isInMapMode(): boolean {
    const app = this.findAppElement();
    return app?.classList.contains('map-interaction-mode') ?? false;
  }
  
  /**
   * Get current map mode style (if in map mode)
   */
  getCurrentStyle(): MapModeStyle | null {
    return this.currentStyle;
  }
  
  /**
   * Activate overlay scene control if not already active
   * Saves the previous state so we can restore it later
   */
  private async activateOverlayControl(): Promise<void> {
    try {
      const { ReignMakerMapLayer } = await import('../map/ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      
      // Save current state
      this.overlayWasActive = mapLayer.getToggleState();
      
      // Only activate if not already active
      if (!this.overlayWasActive) {
        logger.info('[AppWindowManager] 🗺️ Activating overlay scene control for map interaction');
        await mapLayer.handleSceneControlToggle();
      } else {
        logger.info('[AppWindowManager] 🗺️ Overlay scene control already active');
      }
    } catch (error) {
      logger.error('[AppWindowManager] Failed to activate overlay control:', error);
    }
  }
  
  /**
   * Restore overlay scene control state
   * Deactivates overlays only if we activated them (restores to original state)
   */
  private async restoreOverlayControl(): Promise<void> {
    try {
      const { ReignMakerMapLayer } = await import('../map/ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      
      // Only deactivate if we activated it (wasn't active before)
      if (!this.overlayWasActive && mapLayer.getToggleState()) {
        logger.info('[AppWindowManager] 🗺️ Restoring overlay scene control (deactivating)');
        await mapLayer.handleSceneControlToggle();
      } else {
        logger.info('[AppWindowManager] 🗺️ Leaving overlay scene control as-is (was already active)');
      }
    } catch (error) {
      logger.error('[AppWindowManager] Failed to restore overlay control:', error);
    }
  }
  
  /**
   * Change style while in map mode
   */
  changeStyle(newStyle: MapModeStyle): void {
    if (!this.isInMapMode()) {
      logger.warn('[AppWindowManager] Cannot change style - not in map mode');
      return;
    }
    
    const app = this.findAppElement();
    if (!app) return;
    
    // Remove old style class
    if (this.currentStyle) {
      app.classList.remove(`map-interaction-${this.currentStyle}`);
    }
    app.classList.add(`map-interaction-${newStyle}`);
    
    // Apply new transform/opacity directly to inline style
    switch (newStyle) {
      case 'hide':
        app.style.visibility = 'hidden';
        app.style.transform = this.originalTransform;
        app.style.opacity = this.originalOpacity;
        break;
      case 'slide':
        app.style.visibility = '';
        app.style.transform = this.originalTransform + ' translateX(calc(100% - 40px))';
        app.style.opacity = '0.6';
        break;
      case 'fade':
        app.style.visibility = '';
        app.style.transform = this.originalTransform;
        app.style.opacity = '0.15';
        break;
      case 'minimize':
        app.style.visibility = '';
        app.style.transform = this.originalTransform + ' scale(0.2) translate(200%, 200%)';
        app.style.opacity = '0.5';
        break;
    }
    
    this.currentStyle = newStyle;
    logger.info(`[AppWindowManager] Changed style to ${newStyle}`);
  }
}

// Export singleton instance
export const appWindowManager = AppWindowManager.getInstance();
