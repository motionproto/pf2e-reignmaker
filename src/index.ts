// Main entry point for PF2e Kingdom Lite module
// Using Svelte + TyphonJS Runtime Library

/// <reference types="vite/client" />

// Import and initialize the Kingdom Icon handler
import { registerKingdomIconHook } from './ui/KingdomIcon';
import { initKingdomIconDebug } from './ui/KingdomIconDebug';
import { initializeKingmakerSync, syncKingmakerToKingdomState } from './api/kingmaker';

// Extend module type for our API
declare global {
    interface Game {
        pf2eKingdomLite?: {
            openKingdomUI: (actorId?: string) => void;
            syncKingmaker?: () => boolean;
        };
    }
    
    interface Window {
        openKingdomUI?: (actorId?: string) => void;
        pf2eKingdomLite?: {
            openKingdomUI: (actorId?: string) => void;
            syncKingmaker?: () => boolean;
        };
    }
}

/**
 * Register module settings
 */
function registerModuleSettings() {
    // Register the kingdom scene ID setting
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-kingdom-lite', 'kingdomSceneId', {
        name: 'Kingdom Scene',
        hint: 'The scene that represents your kingdom map (typically "Stolen Lands")',
        scope: 'world',  // world-level setting (GM only)
        config: false,   // Don't show in module settings, we have our own UI
        type: String,
        default: '',
    });
    
    // Register kingdom name setting
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-kingdom-lite', 'kingdomName', {
        name: 'Kingdom Name',
        hint: 'The name of your kingdom',
        scope: 'world',
        config: false,
        type: String,
        default: 'New Kingdom',
    });
    
    console.log('PF2e Kingdom Lite | Settings registered');
}

/**
 * Initialize the module when Foundry is ready
 */
Hooks.once('init', () => {
    console.log('PF2e Kingdom Lite | Initializing module (Svelte/TRL version)');
    
    // Register module settings
    registerModuleSettings();
    
    // Register the hook to add Kingdom icons to party actors
    registerKingdomIconHook();
    
    // Comment out debug version since we confirmed the icon works
    // initKingdomIconDebug();
    
    // Register keybinding
    // @ts-ignore
    game.keybindings?.register('pf2e-kingdom-lite', 'openKingdom', {
        name: 'Open Kingdom UI',
        hint: 'Opens the Kingdom management interface',
        editable: [
            {
                key: 'KeyK',
                modifiers: ['Control', 'Shift']
            }
        ],
        onDown: () => {
            // @ts-ignore
            if (game.pf2eKingdomLite?.openKingdomUI) {
                // @ts-ignore
                game.pf2eKingdomLite.openKingdomUI();
            }
            return true;
        },
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });
});

// Scene control button removed due to compatibility issues
// Use the macro, keyboard shortcut, or icon methods instead

/**
 * Setup module once the game is ready
 */
Hooks.once('ready', () => {
    console.log('PF2e Kingdom Lite | Module ready');
    console.log('PF2e Kingdom Lite | Svelte Kingdom system initialized');
    
    // Initialize Kingmaker sync if the module is present
    initializeKingmakerSync();
    
    // Import KingdomApp at module level to avoid dynamic import issues
    import('./view/kingdom/KingdomApp').then(({ KingdomApp }) => {
        // Create openKingdomUI function
        const openKingdomUI = (actorId?: string) => {
            // If no actorId provided, try to find a party actor
            if (!actorId) {
                // @ts-ignore
                const partyActor = game.actors?.find((a: any) => a.type === 'party');
                if (partyActor) {
                    actorId = partyActor.id;
                } else {
                    // @ts-ignore
                    ui.notifications?.warn("No party actor found. Please create a party actor first.");
                    return;
                }
            }
            
            // Open the Kingdom UI - KingdomApp will handle the svelte config
            try {
                // The actorId is passed through the constructor options
                const app = new KingdomApp({ 
                    actorId: actorId
                } as any);  // Type assertion to bypass TS strict checking
                app.render(true, { focus: true });
                console.log('PF2e Kingdom Lite | Kingdom UI opened');
            } catch (error) {
                console.error("PF2e Kingdom Lite | Failed to open Kingdom UI:", error);
                // @ts-ignore
                ui.notifications?.error("Failed to open Kingdom UI");
            }
        };
        
        // Create manual sync function for debugging
        const syncKingmaker = () => {
            console.log('PF2e Kingdom Lite | Manual sync triggered');
            const result = syncKingmakerToKingdomState();
            
            // Log debug info
            // @ts-ignore
            const km = typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker;
            console.log('PF2e Kingdom Lite | Sync debug:', {
                syncResult: result,
                kingmakerGlobal: km,
                kingmakerState: km?.state,
                hexes: km?.state?.hexes ? Object.keys(km.state.hexes).length : 0
            });
            
            return result;
        };
        
        // Get the module object and add the API
        // @ts-ignore
        const module = game.modules.get('pf2e-kingdom-lite') as any;
        if (module) {
            // Add API object
            module.api = { openKingdomUI, syncKingmaker };
            // For backwards compatibility
            module.openKingdomUI = openKingdomUI;
            console.log('PF2e Kingdom Lite | Module API registered');
        }
        
        // Register global function to open Kingdom UI
        // @ts-ignore
        game.pf2eKingdomLite = { openKingdomUI, syncKingmaker };
        
        // Also add to window for easy console access in dev mode
        if (import.meta.env.DEV) {
            window.openKingdomUI = openKingdomUI;
            window.pf2eKingdomLite = { openKingdomUI, syncKingmaker };
        }
        
        console.log('PF2e Kingdom Lite | Global functions registered:');
        console.log('  - game.modules.get("pf2e-kingdom-lite").api.openKingdomUI()');
        console.log('  - game.modules.get("pf2e-kingdom-lite").openKingdomUI()');
        console.log('  - game.pf2eKingdomLite.openKingdomUI()');
        if (import.meta.env.DEV) {
            console.log('  - window.openKingdomUI() [DEV ONLY]');
        }
    }).catch((error) => {
        console.error('PF2e Kingdom Lite | Failed to load KingdomApp:', error);
    });
});

// Hot Module Replacement support for development
if (import.meta.hot) {
    import.meta.hot.accept();
    console.log('PF2e Kingdom Lite | Hot Module Replacement enabled');
}
