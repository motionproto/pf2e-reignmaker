// Main entry point for PF2e Kingdom Lite module
// Using Svelte + TyphonJS Runtime Library

/// <reference types="vite/client" />

// Import and initialize the Kingdom Icon handler
import { registerKingdomIconHook } from './ui/KingdomIcon';
import { initKingdomIconDebug } from './ui/KingdomIconDebug';
import { initializeKingmakerSync, syncKingmakerToKingdomState } from './api/kingmaker';
import { territoryService } from './services/territory';
import { initializeKingdomSystem } from './main.kingdom';
import { get } from 'svelte/store';
import { kingdomData } from './stores/kingdomActor';

// Extend module type for our API
declare global {
    interface Game {
        pf2eReignMaker?: {
            openKingdomUI: (actorId?: string) => void;
            syncKingmaker?: () => boolean;
            saveKingdom?: () => Promise<void>;
            loadKingdom?: () => Promise<void>;
            exportKingdom?: () => Promise<void>;
            importKingdom?: () => Promise<void>;
            resetKingdom?: () => Promise<void>;
        };
    }
    
    interface Window {
        openKingdomUI?: (actorId?: string) => void;
        pf2eReignMaker?: {
            openKingdomUI: (actorId?: string) => void;
            syncKingmaker?: () => boolean;
            saveKingdom?: () => Promise<void>;
            loadKingdom?: () => Promise<void>;
            exportKingdom?: () => Promise<void>;
            importKingdom?: () => Promise<void>;
            resetKingdom?: () => Promise<void>;
        };
    }
}

/**
 * Register module settings
 */
function registerModuleSettings() {
    // Register the kingdom scene ID setting
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-reignmaker', 'kingdomSceneId', {
        name: 'Kingdom Scene',
        hint: 'The scene that represents your kingdom map (typically "Stolen Lands")',
        scope: 'world',  // world-level setting (GM only)
        config: false,   // Don't show in module settings, we have our own UI
        type: String,
        default: '',
    });
    
    // Register kingdom name setting
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-reignmaker', 'kingdomName', {
        name: 'Kingdom Name',
        hint: 'The name of your kingdom',
        scope: 'world',
        config: false,
        type: String,
        default: 'New Kingdom',
    });
    
    console.log('PF2E ReignMaker | Settings registered');
}

/**
 * Initialize the module when Foundry is ready
 */
Hooks.once('init', () => {
    console.log('PF2E ReignMaker | Initializing module (Svelte/TRL version)');
    
    // Register module settings
    registerModuleSettings();
    
    // Register the hook to add Kingdom icons to party actors
    registerKingdomIconHook();
    
    // Comment out debug version since we confirmed the icon works
    // initKingdomIconDebug();
    
    // Register keybinding
    // @ts-ignore
    game.keybindings?.register('pf2e-reignmaker', 'openKingdom', {
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
            if (game.pf2eReignMaker?.openKingdomUI) {
                // @ts-ignore
                game.pf2eReignMaker.openKingdomUI();
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
Hooks.once('ready', async () => {
    console.log('PF2E ReignMaker | Module ready');
    console.log('PF2E ReignMaker | Svelte Kingdom system initialized');
    
    // Initialize the new Foundry-first kingdom system
    try {
        initializeKingdomSystem();
        console.log('PF2E ReignMaker | Kingdom system initialized');
    } catch (error) {
        console.error('[Module] Failed to initialize kingdom system:', error);
    }
    
    // Initialize Kingmaker sync if available using Territory Service
    if (territoryService.isKingmakerAvailable()) {
        initializeKingmakerSync();
    }
    
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
                console.log('PF2E ReignMaker | Kingdom UI opened');
            } catch (error) {
                console.error("PF2E ReignMaker | Failed to open Kingdom UI:", error);
                // @ts-ignore
                ui.notifications?.error("Failed to open Kingdom UI");
            }
        };
        
        // Create manual sync function for debugging
        const syncKingmaker = () => {
            console.log('PF2E ReignMaker | Manual sync triggered');
            const result = syncKingmakerToKingdomState();
            
            // Log debug info
            // @ts-ignore
            const km = typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker;
            console.log('PF2E ReignMaker | Sync debug:', {
                syncResult: result,
                kingmakerGlobal: km,
                kingmakerState: km?.state,
                totalHexes: km?.state?.hexes ? Object.keys(km.state.hexes).length : 0,
                claimedHexes: km?.state?.hexes ? Object.values(km.state.hexes).filter((h: any) => h.claimed).length : 0
            });
            
            // Get current kingdom state to verify sync
            const state = get(kingdomData);
            console.log('PF2E ReignMaker | Current Kingdom State:', {
                hexes: state.hexes?.length || 0,
                size: state.size || 0,
                settlements: state.settlements?.length || 0,
                resources: state.resources || {},
                fame: state.fame || 0,
                unrest: state.unrest || 0
            });
            
            return result;
        };
        
        // Data persistence API functions - now handled by KingdomActor
        const saveKingdom = async () => {
            // @ts-ignore
            ui?.notifications?.info('Data is now automatically saved via Foundry actors');
        };
        
        const loadKingdom = async () => {
            // @ts-ignore
            ui?.notifications?.info('Data is now automatically loaded via Foundry actors');
        };
        
        const exportKingdom = async () => {
            const { getKingdomActor } = await import('./main.kingdom');
            const actor = await getKingdomActor();
            if (actor) {
                const kingdomData = actor.getKingdom();
                if (kingdomData) {
                    const jsonData = JSON.stringify(kingdomData, null, 2);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `kingdom-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    // @ts-ignore
                    ui?.notifications?.info('Kingdom data exported successfully');
                }
            } else {
                // @ts-ignore
                ui?.notifications?.warn('No kingdom actor found');
            }
        };
        
        const importKingdom = async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                    const text = await file.text();
                    try {
                        const kingdomData = JSON.parse(text);
                        const { getKingdomActor } = await import('./main.kingdom');
                        const actor = await getKingdomActor();
                        if (actor) {
                            await actor.setKingdom(kingdomData);
                            // @ts-ignore
                            ui?.notifications?.info('Kingdom data imported successfully');
                        } else {
                            // @ts-ignore
                            ui?.notifications?.warn('No kingdom actor found');
                        }
                    } catch (error) {
                        console.error('Failed to import kingdom data:', error);
                        // @ts-ignore
                        ui?.notifications?.error('Failed to import kingdom data');
                    }
                }
            };
            input.click();
        };
        
        const resetKingdom = async () => {
            const { getKingdomActor } = await import('./main.kingdom');
            const actor = await getKingdomActor();
            if (actor) {
                await actor.initializeKingdom('New Kingdom');
                // @ts-ignore
                ui?.notifications?.info('Kingdom reset to default state');
            } else {
                // @ts-ignore
                ui?.notifications?.warn('No kingdom actor found');
            }
        };
        
        // Get the module object and add the API
        // @ts-ignore
        const module = game.modules.get('pf2e-reignmaker') as any;
        if (module) {
            // Add API object with all functions
            module.api = { 
                openKingdomUI, 
                syncKingmaker,
                saveKingdom,
                loadKingdom,
                exportKingdom,
                importKingdom,
                resetKingdom
            };
            // For backwards compatibility
            module.openKingdomUI = openKingdomUI;
            console.log('PF2E ReignMaker | Module API registered');
        }
        
        // Register global function to open Kingdom UI
        // @ts-ignore
        game.pf2eReignMaker = { 
            openKingdomUI, 
            syncKingmaker,
            saveKingdom,
            loadKingdom,
            exportKingdom,
            importKingdom,
            resetKingdom
        };
        
        // Also add to window for easy console access in dev mode
        if (import.meta.env.DEV) {
            window.openKingdomUI = openKingdomUI;
            window.pf2eReignMaker = { 
                openKingdomUI, 
                syncKingmaker,
                saveKingdom,
                loadKingdom,
                exportKingdom,
                importKingdom,
                resetKingdom
            };
        }
        
        console.log('PF2E ReignMaker | Global functions registered:');
        console.log('Kingdom UI:');
        console.log('  - game.pf2eReignMaker.openKingdomUI()');
        console.log('Data Persistence:');
        console.log('  - game.pf2eReignMaker.saveKingdom() - Save to Foundry settings');
        console.log('  - game.pf2eReignMaker.loadKingdom() - Load from Foundry settings');
        console.log('  - game.pf2eReignMaker.exportKingdom() - Export to JSON file');
        console.log('  - game.pf2eReignMaker.importKingdom() - Import from JSON file');
        console.log('  - game.pf2eReignMaker.resetKingdom() - Reset to initial state');
        if (territoryService.isKingmakerAvailable()) {
            console.log('Kingmaker Integration:');
            console.log('  - game.pf2eReignMaker.syncKingmaker() - Sync with Kingmaker module');
        }
        if (import.meta.env.DEV) {
            console.log('Development:');
            console.log('  - window.openKingdomUI() [DEV ONLY]');
            console.log('  - All functions also available on window.pf2eReignMaker [DEV ONLY]');
        }
    }).catch((error) => {
        console.error('PF2E ReignMaker | Failed to load KingdomApp:', error);
    });
});

// Hot Module Replacement support for development
if (import.meta.hot) {
    import.meta.hot.accept();
    console.log('PF2E ReignMaker | Hot Module Replacement enabled');
}
