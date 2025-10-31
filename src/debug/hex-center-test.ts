/**
 * Debug utility to test hex center point accuracy
 * 
 * Places a visual marker at the center of clicked hexes using canvas.grid.getCenterPoint()
 * This helps verify the precision of Foundry's official center point API
 * 
 * Usage in browser console:
 * ```
 * game.reignmaker.testHexCenter()       // Activate - click hexes to place markers
 * game.reignmaker.clearHexCenterTest()  // Clear all test markers
 * game.reignmaker.deactivateHexCenterTest()  // Stop click listener
 * ```
 */

import { logger } from '../utils/Logger';

// Container for test markers
let testMarkersLayer: PIXI.Container | null = null;
let isActive = false;
let clickHandler: ((event: any) => void) | null = null;

/**
 * Activate hex center testing mode
 * Click on hexes to place visual markers at their calculated center points
 */
export function testHexCenter(): void {
  const canvas = (globalThis as any).canvas;
  
  if (!canvas?.grid) {
    logger.error('[HexCenterTest] Canvas grid not available');
    const ui = (globalThis as any).ui;
    ui?.notifications?.error('Canvas not ready. Load a scene first!');
    return;
  }

  if (isActive) {
    logger.warn('[HexCenterTest] Already active');
    return;
  }

  // Create test markers layer if it doesn't exist
  if (!testMarkersLayer) {
    testMarkersLayer = new PIXI.Container();
    testMarkersLayer.name = 'hex-center-test-markers';
    testMarkersLayer.zIndex = 1000; // On top of everything
    canvas.stage.addChild(testMarkersLayer);
  }

  // Create click handler
  clickHandler = (event: any) => {
    try {
      // Get click position in world coordinates
      const position = event.data.getLocalPosition(canvas.stage);
      
      // Convert position to hex offset
      const offset = canvas.grid.getOffset({ x: position.x, y: position.y });
      const hexId = `${offset.i}.${offset.j}`;
      
      // Calculate center using Foundry's official API
      const center = canvas.grid.getCenterPoint(offset);
      
      logger.info(`[HexCenterTest] Clicked hex: ${hexId}`);
      logger.info(`[HexCenterTest] Center point: (${center.x}, ${center.y})`);
      
      // Create visual marker at center point
      createMarker(center.x, center.y, hexId);
      
      // Show notification
      const ui = (globalThis as any).ui;
      ui?.notifications?.info(`Placed marker at hex ${hexId}`);
      
    } catch (error) {
      logger.error('[HexCenterTest] Error handling click:', error);
    }
  };

  // Register click listener on canvas
  canvas.stage.on('pointerdown', clickHandler);
  isActive = true;
  
  logger.info('[HexCenterTest] ✅ Activated - click hexes to place markers');
  logger.info('[HexCenterTest] Use game.reignmaker.clearHexCenterTest() to clear markers');
  logger.info('[HexCenterTest] Use game.reignmaker.deactivateHexCenterTest() to stop');
  
  const ui = (globalThis as any).ui;
  ui?.notifications?.info('Hex center test active! Click hexes to place markers.');
}

/**
 * Deactivate hex center testing mode (stop listening for clicks)
 */
export function deactivateHexCenterTest(): void {
  if (!isActive) {
    logger.warn('[HexCenterTest] Not active');
    return;
  }

  const canvas = (globalThis as any).canvas;
  
  // Remove click listener
  if (clickHandler) {
    canvas.stage.off('pointerdown', clickHandler);
    clickHandler = null;
  }
  
  isActive = false;
  logger.info('[HexCenterTest] ✅ Deactivated');
  
  const ui = (globalThis as any).ui;
  ui?.notifications?.info('Hex center test deactivated');
}

/**
 * Clear all test markers from the canvas
 */
export function clearHexCenterTest(): void {
  if (testMarkersLayer) {
    testMarkersLayer.removeChildren();
    logger.info('[HexCenterTest] ✅ Cleared all markers');
    
    const ui = (globalThis as any).ui;
    ui?.notifications?.info('Test markers cleared');
  }
}

/**
 * Create a visual marker at the specified position
 * Shows a red crosshair with the hex ID as a label
 */
function createMarker(x: number, y: number, hexId: string): void {
  if (!testMarkersLayer) return;

  const graphics = new PIXI.Graphics();
  
  // Draw red crosshair
  graphics.lineStyle(2, 0xFF0000, 1); // Red, 2px thick
  
  // Vertical line
  graphics.moveTo(x, y - 20);
  graphics.lineTo(x, y + 20);
  
  // Horizontal line
  graphics.moveTo(x - 20, y);
  graphics.lineTo(x + 20, y);
  
  // Center dot (larger and more visible)
  graphics.lineStyle(0);
  graphics.beginFill(0xFF0000, 1);
  graphics.drawCircle(x, y, 4);
  graphics.endFill();
  
  // Outer ring for contrast
  graphics.lineStyle(2, 0xFFFFFF, 0.8);
  graphics.drawCircle(x, y, 6);
  
  testMarkersLayer.addChild(graphics);
  
  // Add hex ID label
  const label = new PIXI.Text(hexId, {
    fontFamily: 'Arial',
    fontSize: 14,
    fill: 0xFF0000,
    stroke: 0xFFFFFF,
    strokeThickness: 3
  });
  
  label.anchor.set(0.5, 0.5);
  label.position.set(x, y - 35); // Above the crosshair
  
  testMarkersLayer.addChild(label);
}

/**
 * Register debug utilities on globalThis for browser console access
 */
export function registerHexCenterTestUtils(): void {
  const game = (globalThis as any).game;

  if (!game) {
    logger.warn('[HexCenterTest] Game not ready, skipping debug registration');
    return;
  }

  // Create reignmaker namespace if it doesn't exist
  if (!game.reignmaker) {
    game.reignmaker = {};
  }

  // Register debug functions
  game.reignmaker.testHexCenter = testHexCenter;
  game.reignmaker.deactivateHexCenterTest = deactivateHexCenterTest;
  game.reignmaker.clearHexCenterTest = clearHexCenterTest;

  logger.info('[HexCenterTest] ✅ Hex center test utilities registered on game.reignmaker');
  logger.info('[HexCenterTest] Available commands:');
  logger.info('  - game.reignmaker.testHexCenter()');
  logger.info('  - game.reignmaker.deactivateHexCenterTest()');
  logger.info('  - game.reignmaker.clearHexCenterTest()');
}
