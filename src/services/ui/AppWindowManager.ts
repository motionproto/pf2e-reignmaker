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

export type MapModeStyle = 'slide' | 'fade' | 'minimize' | 'hide';

export class AppWindowManager {
  private static instance: AppWindowManager | null = null;
  private appElement: HTMLElement | null = null;
  private currentStyle: MapModeStyle | null = null;
  
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
  enterMapMode(style: MapModeStyle = 'slide'): void {
    const app = this.findAppElement();
    if (!app) {
      logger.warn('[AppWindowManager] Cannot enter map mode - app not found');
      return;
    }
    
    // Add base class and style-specific class
    app.classList.add('map-interaction-mode');
    app.classList.add(`map-interaction-${style}`);
    
    this.currentStyle = style;
    logger.info(`[AppWindowManager] ✅ Entered map mode (${style})`);
  }
  
  /**
   * Exit map interaction mode (restore app)
   */
  exitMapMode(): void {
    const app = this.findAppElement();
    if (!app) {
      logger.warn('[AppWindowManager] Cannot exit map mode - app not found');
      return;
    }
    
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
   * Change style while in map mode
   */
  changeStyle(newStyle: MapModeStyle): void {
    if (!this.isInMapMode()) {
      logger.warn('[AppWindowManager] Cannot change style - not in map mode');
      return;
    }
    
    const app = this.findAppElement();
    if (!app) return;
    
    // Remove old style, add new style
    if (this.currentStyle) {
      app.classList.remove(`map-interaction-${this.currentStyle}`);
    }
    app.classList.add(`map-interaction-${newStyle}`);
    
    this.currentStyle = newStyle;
    logger.info(`[AppWindowManager] Changed style to ${newStyle}`);
  }
}

// Export singleton instance
export const appWindowManager = AppWindowManager.getInstance();
