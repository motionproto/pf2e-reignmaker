/**
 * SceneControlRegistration - Registers the kingdom hex control button in Foundry scene controls
 */

import { getKingdomActor } from '../../main.kingdom';
import type { KingdomData } from '../../actors/KingdomActor';
import { ReignMakerMapLayer } from './ReignMakerMapLayer';

/**
 * Register the kingdom hex control button in the scene controls
 */
export function registerKingdomHexControl(): void {
  console.log('[SceneControlRegistration] Registering scene control button...');
  
  Hooks.on('getSceneControlButtons', (controls: any) => {
    console.log('[SceneControlRegistration] getSceneControlButtons hook fired');
    console.log('[SceneControlRegistration] Controls type:', typeof controls, 'Is array:', Array.isArray(controls));
    
    // Find the tokens control group (controls is an array in Foundry v11-12, might be object in v13)
    let tokensControl;
    if (Array.isArray(controls)) {
      tokensControl = controls.find((c: any) => c.name === 'token');
    } else {
      // If controls is an object, try accessing directly
      tokensControl = controls.token || controls.tokens;
    }
    
    if (!tokensControl) {
      console.warn('[SceneControlRegistration] Tokens control group not found');
      console.log('[SceneControlRegistration] Available controls:', Object.keys(controls));
      return;
    }
    
    // Ensure tools array/object exists
    if (!tokensControl.tools) {
      tokensControl.tools = Array.isArray(controls) ? [] : {};
    }
    
    const toolsArray = Array.isArray(tokensControl.tools) ? tokensControl.tools : Object.values(tokensControl.tools);
    console.log('[SceneControlRegistration] Found tokens control group, current tools:', toolsArray.length);
    console.log('[SceneControlRegistration] Tool names:', toolsArray.map((t: any) => t?.name));
    
    // Check individual settings for hiding Kingmaker module's controls
    // @ts-ignore - Foundry globals
    const hideHexControls = game.settings?.get('pf2e-reignmaker', 'hideKingmakerHexControls');
    // @ts-ignore - Foundry globals
    const hideShowRegions = game.settings?.get('pf2e-reignmaker', 'hideKingmakerShowRegions');
    
    console.log('[SceneControlRegistration] Hide settings:', { hideHexControls, hideShowRegions });
    
    // Remove Kingmaker controls based on user settings
    if (hideHexControls || hideShowRegions) {
      if (Array.isArray(tokensControl.tools)) {
        // Array format
        const before = tokensControl.tools.length;
        tokensControl.tools = tokensControl.tools.filter((tool: any) => {
          if (hideHexControls && tool.name === 'km-hex-overlay') {
            console.log('[SceneControlRegistration] Filtering out Kingmaker "Hex Controls" button');
            return false;
          }
          if (hideShowRegions && tool.name === 'km-show-regions') {
            console.log('[SceneControlRegistration] Filtering out Kingmaker "Show Regions" button');
            return false;
          }
          return true;
        });
        console.log(`[SceneControlRegistration] Removed ${before - tokensControl.tools.length} Kingmaker button(s)`);
      } else {
        // Object format
        if (hideHexControls && tokensControl.tools['km-hex-overlay']) {
          delete tokensControl.tools['km-hex-overlay'];
          console.log('[SceneControlRegistration] Removed Kingmaker "Hex Controls" button');
        }
        if (hideShowRegions && tokensControl.tools['km-show-regions']) {
          delete tokensControl.tools['km-show-regions'];
          console.log('[SceneControlRegistration] Removed Kingmaker "Show Regions" button');
        }
      }
    }
    
    // Check if our rook button already exists (avoid duplicates)
    const rookExists = Array.isArray(tokensControl.tools)
      ? tokensControl.tools.some((t: any) => t.name === 'reignmaker-hexes')
      : !!tokensControl.tools['reignmaker-hexes'];
    
    if (rookExists) {
      console.log('[SceneControlRegistration] Rook button already exists, skipping');
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
      onClick: async (toggled: boolean) => {
        console.log('[SceneControlRegistration] Rook button clicked, toggled:', toggled);
        
        clickCount++;
        
        // If this is the first click, start the timer
        if (clickCount === 1) {
          clickTimer = window.setTimeout(async () => {
            console.log('[SceneControlRegistration] Single-click detected - toggling overlays');
            
            // Single click: toggle overlays
            // Check if map has been imported yet
            const kingdomActor = await getKingdomActor();
            if (kingdomActor) {
              const kingdom = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
              const hasImportedMap = kingdom?.hexes && kingdom.hexes.length > 0;
              
              if (!hasImportedMap) {
                console.log('[SceneControlRegistration] No map data found, opening Kingdom UI to show import dialog...');
                
                // Open Kingdom UI - it will automatically show the WelcomeDialog for first-time setup
                const { openKingdomUI } = await import('../../ui/KingdomIcon');
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
          console.log('[SceneControlRegistration] Double-click detected - opening Kingdom UI');
          
          // Cancel the single-click timer
          if (clickTimer !== null) {
            window.clearTimeout(clickTimer);
            clickTimer = null;
          }
          
          // Reset click state
          clickCount = 0;
          
          // Double click: open Kingdom UI
          const kingdomActor = await getKingdomActor();
          if (kingdomActor) {
            const { openKingdomUI } = await import('../../ui/KingdomIcon');
            const actorId = kingdomActor.id;
            openKingdomUI(actorId);
          } else {
            // @ts-ignore - Foundry globals
            ui.notifications?.warn('No Kingdom actor found. Please create or assign a party actor first.');
          }
        }
      },
      button: true
    };
    
    if (Array.isArray(tokensControl.tools)) {
      tokensControl.tools.push(rookButton);
    } else {
      tokensControl.tools['reignmaker-hexes'] = rookButton;
    }
    
    console.log('[SceneControlRegistration] ✅ Rook button added successfully');
  });

  // Initialize PIXI container when canvas is ready
  Hooks.on('canvasReady', () => {
    const layer = ReignMakerMapLayer.getInstance();
    layer.showPixiContainer(); // Ensures initialization
    layer.hidePixiContainer(); // Start hidden (controlled by scene toggle)
    console.log('[SceneControlRegistration] Initialized PIXI container on canvasReady');
  });

  // Clean up on canvas tear down
  Hooks.on('canvasTearDown', async () => {
    console.log('[SceneControlRegistration] 🧹 Canvas tearing down - cleaning up overlays and layers...');
    
    // Step 1: Clear all overlay subscriptions before destroying
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    overlayManager.clearAll();
    
    // Step 2: Destroy the map layer
    const layer = ReignMakerMapLayer.getInstance();
    layer.destroy();
    
    console.log('[SceneControlRegistration] ✅ Canvas cleanup complete');
  });
  
  console.log('[SceneControlRegistration] Hook listeners registered');
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
