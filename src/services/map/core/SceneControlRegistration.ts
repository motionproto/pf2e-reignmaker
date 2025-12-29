/**
 * SceneControlRegistration - Registers the kingdom hex control button in Foundry scene controls
 */

import { getKingdomActor } from '../../../main.kingdom';
import type { KingdomData } from '../../../actors/KingdomActor';
import { ReignMakerMapLayer } from './ReignMakerMapLayer';
import { logger } from '../../../utils/Logger';

/**
 * Switch to the kingdom map scene (same logic as hex selector)
 */
async function switchToKingdomScene(): Promise<void> {
  console.log('[SceneControl] 🎬 Starting scene switch...');
  
  try {
    const game = (globalThis as any).game;
    
    // Try to find kingdom scene in order of priority:
    // 1. Configured setting (if set)
    // 2. Auto-detect by name (Stolen Lands, Kingdom Map, etc.)
    // 3. Stay on current scene
    
    let sceneId = game.settings?.get('pf2e-reignmaker', 'kingdomSceneId');
    console.log('[SceneControl] 📍 Kingdom scene ID from settings:', sceneId || '(not configured)');

    // If no setting, try to auto-detect kingdom scene
    if (!sceneId) {
      console.log('[SceneControl] 🔍 Auto-detecting kingdom scene...');
      
      // Common kingdom map names
      const kingdomSceneNames = [
        'Stolen Lands',
        'stolen lands',
        'Kingdom Map',
        'kingdom map',
        'Kingdom',
        'Kingmaker'
      ];
      
      // Search for scene by name
      const detectedScene = game.scenes?.find((s: any) => 
        kingdomSceneNames.some(name => s.name?.toLowerCase().includes(name.toLowerCase()))
      );
      
      if (detectedScene) {
        sceneId = detectedScene.id;
        console.log('[SceneControl] ✅ Auto-detected kingdom scene:', `"${detectedScene.name}" (${sceneId})`);
        
        // Save for next time
        await game.settings?.set('pf2e-reignmaker', 'kingdomSceneId', sceneId);
        console.log('[SceneControl] 💾 Saved kingdom scene ID to settings');
      } else {
        console.warn('[SceneControl] ⚠️  Could not auto-detect kingdom scene, staying on current scene');
        logger.warn('[SceneControl] ⚠️  Could not auto-detect kingdom scene - looking for scenes named "Stolen Lands" or "Kingdom Map"');
        return;
      }
    }
    
    const scene = game.scenes?.get(sceneId);
    console.log('[SceneControl] 🗺️  Found scene object:', scene ? `"${scene.name}" (${sceneId})` : 'NOT FOUND');

    if (!scene) {
      console.warn('[SceneControl] ⚠️  Kingdom scene not found:', sceneId);
      logger.warn('[SceneControl] ⚠️  Kingdom scene not found:', sceneId);
      return;
    }
    
    // Only switch if not already viewing this scene
    const currentSceneId = game.scenes?.active?.id;
    const currentSceneName = game.scenes?.active?.name;
    console.log('[SceneControl] 👁️  Current scene:', currentSceneName, `(${currentSceneId})`);

    if (currentSceneId !== sceneId) {
      console.log('[SceneControl] 🔄 Switching to kingdom scene...');
      await scene.view();
      console.log('[SceneControl] ✅ Scene switched successfully');

      // Give the scene time to render
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      console.log('[SceneControl] ✅ Already on kingdom scene, no switch needed');
    }
  } catch (error) {
    console.error('[SceneControl] ❌ Failed to switch scene:', error);
    logger.warn('[SceneControl] ❌ Failed to switch scene:', error);
  }
}

/**
 * Register the kingdom hex control button in the scene controls
 */
export function registerKingdomHexControl(): void {

  Hooks.on('getSceneControlButtons', (controls: any) => {


    // Find the tokens control group (controls is an array in Foundry v11-12, might be object in v13)
    let tokensControl;
    if (Array.isArray(controls)) {
      tokensControl = controls.find((c: any) => c.name === 'token');
    } else {
      // If controls is an object, try accessing directly
      tokensControl = controls.token || controls.tokens;
    }
    
    if (!tokensControl) {
      logger.warn('[SceneControlRegistration] Tokens control group not found');

      return;
    }
    
    // Ensure tools array/object exists
    if (!tokensControl.tools) {
      tokensControl.tools = Array.isArray(controls) ? [] : {};
    }
    
    const toolsArray = Array.isArray(tokensControl.tools) ? tokensControl.tools : Object.values(tokensControl.tools);


    // Check individual settings for hiding Kingmaker module's controls
    // @ts-ignore - Foundry globals
    const hideHexControls = game.settings?.get('pf2e-reignmaker', 'hideKingmakerHexControls');
    // @ts-ignore - Foundry globals
    const hideShowRegions = game.settings?.get('pf2e-reignmaker', 'hideKingmakerShowRegions');

    // Remove Kingmaker controls based on user settings
    if (hideHexControls || hideShowRegions) {
      if (Array.isArray(tokensControl.tools)) {
        // Array format
        const before = tokensControl.tools.length;
        tokensControl.tools = tokensControl.tools.filter((tool: any) => {
          if (hideHexControls && tool.name === 'km-hex-overlay') {

            return false;
          }
          if (hideShowRegions && tool.name === 'km-show-regions') {

            return false;
          }
          return true;
        });

      } else {
        // Object format
        if (hideHexControls && tokensControl.tools['km-hex-overlay']) {
          delete tokensControl.tools['km-hex-overlay'];

        }
        if (hideShowRegions && tokensControl.tools['km-show-regions']) {
          delete tokensControl.tools['km-show-regions'];

        }
      }
    }
    
    // Check if our rook button already exists (avoid duplicates)
    const rookExists = Array.isArray(tokensControl.tools)
      ? tokensControl.tools.some((t: any) => t.name === 'reignmaker-hexes')
      : !!tokensControl.tools['reignmaker-hexes'];
    
    if (rookExists) {

      return;
    }
    
    // Click detection state for double-click handling
    let clickTimer: number | null = null;
    let clickCount = 0;
    const DOUBLE_CLICK_DELAY = 300; // ms
    
    // Add our rook button
    const rookButton = {
      name: 'reignmaker-hexes',
      title: 'Reignmaker Overlays',
      icon: 'fas fa-chess-rook',
      toggle: true,
      active: ReignMakerMapLayer.getInstance().getToggleState(),
      toolclip: {
        heading: 'Reignmaker Overlays',
        items: [
          { paragraph: 'Toggle hex overlays on/off' },
          { paragraph: 'Double-click to open the ReignMaker UI' }
        ]
      },
      onChange: async (toggled: boolean) => {

        clickCount++;
        
        // If this is the first click, start the timer
        if (clickCount === 1) {
          clickTimer = window.setTimeout(async () => {

            // Switch to kingdom scene first
            await switchToKingdomScene();

            // Single click: toggle overlays
            // Check if map has been imported yet
            const kingdomActor = await getKingdomActor();
            if (kingdomActor) {
              const kingdom = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
              const hasImportedMap = kingdom?.hexes && kingdom.hexes.length > 0;
              
              if (!hasImportedMap) {

                // Open Kingdom UI - it will automatically show the WelcomeDialog for first-time setup
                const { openKingdomUI } = await import('../../../ui/KingdomIcon');
                const actorId = kingdomActor.id;
                openKingdomUI(actorId);
                
                // Reset click state
                clickCount = 0;
                clickTimer = null;
                return;
              }
            }
            
            const layer = ReignMakerMapLayer.getInstance();
            await layer.handleSceneControlToggle();
            
            // Reset click state
            clickCount = 0;
            clickTimer = null;
          }, DOUBLE_CLICK_DELAY);
        } 
        // If this is the second click within the delay, it's a double-click
        else if (clickCount === 2) {

          // Cancel the single-click timer
          if (clickTimer !== null) {
            window.clearTimeout(clickTimer);
            clickTimer = null;
          }
          
          // Reset click state
          clickCount = 0;
          
          // Switch to kingdom scene first
          await switchToKingdomScene();
          
          // Double click: open Kingdom UI
          const kingdomActor = await getKingdomActor();
          if (kingdomActor) {
            const { openKingdomUI } = await import('../../../ui/KingdomIcon');
            const actorId = kingdomActor.id;
            openKingdomUI(actorId);
          } else {
            // @ts-ignore - Foundry globals
            ui.notifications?.warn('No Kingdom actor found. Please create or assign a party actor first.');
          }
        }
      }
    };
    
    if (Array.isArray(tokensControl.tools)) {
      tokensControl.tools.push(rookButton);
    } else {
      tokensControl.tools['reignmaker-hexes'] = rookButton;
    }

  });

  // Initialize PIXI container when canvas is ready
  Hooks.on('canvasReady', async () => {
    const layer = ReignMakerMapLayer.getInstance();
    layer.showPixiContainer(); // Ensures initialization
    layer.hidePixiContainer(); // Start hidden (controlled by scene toggle)

    // Initialize pathfinding service with canvas for movement graph
    const canvas = (globalThis as any).canvas;
    if (canvas?.grid) {
      const { pathfindingService } = await import('../../pathfinding');
      pathfindingService.initialize(canvas);
    }
  });

  // Clean up on canvas tear down
  Hooks.on('canvasTearDown', async () => {

    // Step 1: Clear all overlay subscriptions before destroying
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    overlayManager.clearAll();
    
    // Step 2: Destroy the map layer
    const layer = ReignMakerMapLayer.getInstance();
    layer.destroy();

  });

}

/**
 * Update the scene control button's active state
 * 
 * @param active - Whether the button should be active
 */
export function updateSceneControlButton(active: boolean): void {
  const button = document.querySelector('[data-tool="reignmaker-hexes"]') as HTMLElement;
  if (button) {
    if (active) {
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    }
  }
}
