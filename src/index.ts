// Main entry point for PF2e Kingdom Lite module
// Using Svelte + TyphonJS Runtime Library

/// <reference types="vite/client" />

// Import styles for hiding Kingmaker controls
import './styles/hide-kingmaker-controls.css';
// Import styles for map interaction mode
import './styles/map-interaction.css';
// Import global form control styles (dropdowns, inputs, etc.)
import './styles/form-controls.css';

// Import and initialize the Kingdom Icon handler
import { registerKingdomIconHook } from './ui/KingdomIcon';
import { initKingdomIconDebug } from './ui/KingdomIconDebug';
import './debug/hex-selector-test'; // Debug tool for testing hex selector
// Removed old Kingmaker sync - now handled by new architecture
// import { initializeKingmakerSync, syncKingmakerToKingdomState } from './api/kingmaker';
import { territoryService } from './services/territory';
import { initializeKingdomSystem, getKingdomActor } from './main.kingdom';
import { get } from 'svelte/store';
import { kingdomData } from './stores/KingdomStore';
import { KingdomApp } from './view/kingdom/KingdomApp';
import { ResetKingdomDialog } from './ui/ResetKingdomDialog';
import { initializeActionDispatcher } from './services/ActionDispatcher';
import { registerKingdomHexControl } from './services/map';
import { initializePipelineSystem } from './services/PipelineIntegrationAdapter';

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
            recalculateProduction?: () => Promise<void>;
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
            recalculateProduction?: () => Promise<void>;
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
    
    // Register hexes per unrest setting
    // @ts-ignore - Foundry globals and range slider support
    game.settings.register('pf2e-reignmaker', 'hexesPerUnrest', {
        name: 'Hexes Per Unrest',
        hint: 'Number of hexes controlled before gaining +1 unrest. Default: 8 for 4 players. Adjust ±1 per player difference (larger parties = lower number for more unrest, smaller parties = higher number for less unrest)',
        scope: 'world',  // GM only
        config: false,   // Don't show in Foundry module settings - available in Kingdom Settings tab
        type: Number,
        // @ts-ignore - range is supported by Foundry but not in type definitions
        range: {
            min: 4,
            max: 12,
            step: 1
        },
        default: 8
    });
    
    // Register road width setting
    // @ts-ignore - Foundry globals and range slider support
    game.settings.register('pf2e-reignmaker', 'roadWidth', {
        name: 'Road Width',
        hint: 'Width of roads on the kingdom map in pixels (12-32). Borders will be 4 pixels wider.',
        scope: 'client',  // Per-user setting
        config: true,     // Show in module settings
        type: Number,
        // @ts-ignore - range is supported by Foundry but not in type definitions
        range: {
            min: 12,
            max: 32,
            step: 1
        },
        default: 32
    });
    
    // Register log level setting for console logging
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-reignmaker', 'logLevel', {
        name: 'Console Log Level',
        hint: 'Control how much information is logged to the console. ERROR: Critical failures only. WARN: Warnings and errors. INFO (default): Important state changes, warnings, and errors. DEBUG: All logs (very verbose).',
        scope: 'client',  // Per-user setting
        config: true,     // Show in module settings
        type: String,
        choices: {
            '0': 'ERROR - Critical failures only',
            '1': 'WARN - Warnings and errors',
            '2': 'INFO - Important state changes (default)',
            '3': 'DEBUG - All logs (very verbose)'
        },
        default: '2',  // INFO level by default
        onChange: (value: string) => {
            // Update logger level when setting changes
            import('./utils/Logger').then(({ logger, LogLevel }) => {
                const level = parseInt(value);
                logger.setLevel(level);
                console.log(`[PF2E ReignMaker] Log level changed to: ${LogLevel[level]}`);
            });
        }
    });
    
    // Register setting to hide Kingmaker hex controls button
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-reignmaker', 'hideKingmakerHexControls', {
        name: 'Hide Kingmaker "Hex Controls" Button',
        hint: 'Hide the Kingmaker module\'s "Hex Controls" button from the scene controls toolbar (ReignMaker replaces this functionality). Requires refreshing the page to take effect.',
        scope: 'client',  // Per-user setting
        config: true,     // Show in module settings
        type: Boolean,
        default: false,   // Disabled by default
        requiresReload: true  // Foundry will automatically show "reload required" message
    });
    
    // Register setting to hide Kingmaker show regions button
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-reignmaker', 'hideKingmakerShowRegions', {
        name: 'Hide Kingmaker "Show Regions" Button',
        hint: 'Hide the Kingmaker module\'s "Show Regions" button from the scene controls toolbar. Requires refreshing the page to take effect.',
        scope: 'client',  // Per-user setting
        config: true,     // Show in module settings
        type: Boolean,
        default: false,   // Disabled by default
        requiresReload: true  // Foundry will automatically show "reload required" message
    });
    
    // Register menu button for resetting kingdom data
    // @ts-ignore - Foundry globals, type assertion for FormApplication
    game.settings.registerMenu('pf2e-reignmaker', 'resetKingdomDataMenu', {
        name: 'Reset Kingdom Data',
        label: 'Reset Kingdom',
        hint: 'Delete all kingdom data from the party actor. Data will regenerate when you next open the Kingdom UI.',
        icon: 'fas fa-trash-alt',
        type: ResetKingdomDialog as any,  // Extends FormApplication, type assertion for TS
        restricted: true  // GM only
    });

    // Register army types setting (world-level, GM configurable via UI)
    // @ts-ignore - Foundry globals
    game.settings.register('pf2e-reignmaker', 'armyTypes', {
        name: 'Army Types',
        hint: 'Configure available army types for recruitment',
        scope: 'world',  // Shared across all kingdoms in the world
        config: false,   // Custom UI in ArmiesTab
        type: Object,
        default: null,   // Will be initialized with defaults on first access
    });

    console.log('PF2E ReignMaker | Settings registered');
}

/**
 * Apply CSS classes to hide Kingmaker buttons based on module settings
 * Also deactivate (turn off) hidden buttons if they're currently active
 */
function applyKingmakerButtonVisibility() {
    // @ts-ignore - Foundry globals
    const hideHexControls = game.settings?.get('pf2e-reignmaker', 'hideKingmakerHexControls');
    // @ts-ignore - Foundry globals
    const hideShowRegions = game.settings?.get('pf2e-reignmaker', 'hideKingmakerShowRegions');
    
    if (hideHexControls) {
        document.body.classList.add('hide-kingmaker-hex-controls');
        console.log('PF2E ReignMaker | Applied CSS to hide Kingmaker hex controls button');
        // Deactivate the button if it's currently active
        deactivateKingmakerButton('hex');
    } else {
        document.body.classList.remove('hide-kingmaker-hex-controls');
    }
    
    if (hideShowRegions) {
        document.body.classList.add('hide-kingmaker-show-regions');
        console.log('PF2E ReignMaker | Applied CSS to hide Kingmaker show regions button');
        // Deactivate the button if it's currently active
        deactivateKingmakerButton('zones');
    } else {
        document.body.classList.remove('hide-kingmaker-show-regions');
    }
}

/**
 * Deactivate a Kingmaker button if it's currently active
 * This ensures hidden buttons don't leave their functionality running
 */
function deactivateKingmakerButton(toolName: string) {
    // Wait for DOM to be ready
    setTimeout(() => {
        const button = document.querySelector(`button[data-tool="${toolName}"]`) as HTMLButtonElement;
        if (button && button.getAttribute('aria-pressed') === 'true') {
            console.log(`PF2E ReignMaker | Deactivating Kingmaker button: ${toolName}`);
            button.click(); // Click to toggle it off
        }
    }, 100);
}

/**
 * Initialize the module when Foundry is ready
 */
Hooks.once('init', () => {
    // Register module settings
    registerModuleSettings();

    // Apply CSS classes to hide Kingmaker buttons based on settings
    applyKingmakerButtonVisibility();

    // Initialize pipeline system (unified check resolution)
    try {
        initializePipelineSystem();
        console.log('PF2E ReignMaker | Pipeline system initialized');
    } catch (error) {
        console.error('PF2E ReignMaker | Failed to initialize pipeline system:', error);
    }

    // Initialize action dispatcher for player-to-GM communication
    try {
        initializeActionDispatcher();
        
        // Register operation handlers
        import('./services/army/handlers').then(({ registerArmyHandlers }) => {
            registerArmyHandlers();
        });
        import('./services/factions/handlers').then(({ registerFactionHandlers }) => {
            registerFactionHandlers();
        });
        import('./services/kingdom/handlers').then(({ registerKingdomHandlers }) => {
            registerKingdomHandlers();
        });
        import('./services/handlers/VoteHandler').then(({ registerVoteHandlers }) => {
            registerVoteHandlers();
        });
    } catch (error) {
        console.error('PF2E ReignMaker | Failed to initialize action dispatcher:', error);
    }
    
    // Register the hook to add Kingdom icons to party actors
    registerKingdomIconHook();
    
    // Register kingdom hex highlighting scene control
    registerKingdomHexControl();
    
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
    // Initialize logger from setting
    const { logger, LogLevel } = await import('./utils/Logger');
    // @ts-ignore
    const logLevelSetting = game.settings.get('pf2e-reignmaker', 'logLevel') as string;
    const level = parseInt(logLevelSetting);
    logger.setLevel(level);
    logger.debug(`PF2E ReignMaker | Module ready (log level: ${LogLevel[level]})`);
    
    // Initialize the new Foundry-first kingdom system
    try {
        initializeKingdomSystem();
        
        // Initialize KingdomStore with the kingdom actor (if available)
        // This ensures the store is ready for all components (Kingdom UI, map overlay, etc.)
        const { initializeKingdomActor } = await import('./stores/KingdomStore');
        const kingdomActor = await getKingdomActor();
        if (kingdomActor) {
            initializeKingdomActor(kingdomActor);
            
            // Auto-migrate kingmakerFeatures if needed
            const { needsKingmakerFeaturesMigration, migrateKingmakerFeatures } = await import('./utils/migrateKingmakerFeatures');
            if (await needsKingmakerFeaturesMigration()) {
                console.log('PF2E ReignMaker | Detected kingmakerFeatures in kingdom data, running migration...');
                await migrateKingmakerFeatures();
            }
        }
        
        // Initialize party level sync hooks
        const { initializePartyLevelHooks } = await import('./hooks/partyLevelHooks');
        initializePartyLevelHooks();
        
        // Initialize vote system hooks
        const { initializeVoteHooks } = await import('./hooks/voteHooks');
        initializeVoteHooks();

        // Initialize army types cache
        const { armyTypesService } = await import('./services/armyTypes');
        await armyTypesService.initializeCache();

        // Ensure barrier segments exist for rivers (migration for older kingdoms)
        const { ensureBarrierSegments, recalculateBarrierSegments } = await import('./utils/barrierSegmentUtils');
        await ensureBarrierSegments();

        // Register debug command for manual recalculation
        const game = globalThis as any;
        if (!game.reignmaker) game.reignmaker = {};
        game.reignmaker.recalculateRiverBarriers = recalculateBarrierSegments;
    } catch (error) {
        console.error('[Module] Failed to initialize kingdom system:', error);
    }
    
    // Initialize Kingmaker sync if available using Territory Service
    // Old Kingmaker sync removed - now handled by src/hooks/kingdomSync.ts
    // if (territoryService.isKingmakerAvailable()) {
    //     initializeKingmakerSync();
    // }
    
    // Create openKingdomUI function using static import
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
            
            try {
                // Use the new manual sync function
                import('./hooks/kingdomSync').then(({ manualTerritorySync }) => {
                    manualTerritorySync();
                });
                
                // Log debug info
                // @ts-ignore
                const km = typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker;
                console.log('PF2E ReignMaker | Sync debug:', {
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
                
                return true;
            } catch (error) {
                console.error('PF2E ReignMaker | Sync error:', error);
                return false;
            }
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
            const actor = await getKingdomActor();
            if (actor) {
                const kingdomData = actor.getKingdomData?.() || actor.getFlag?.('pf2e-reignmaker', 'kingdom-data');
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
                        const actor = await getKingdomActor();
                        if (actor) {
                            if (actor.setKingdomData) {
                                await actor.setKingdomData(kingdomData);
                            } else {
                                await actor.setFlag('pf2e-reignmaker', 'kingdom-data', kingdomData);
                            }
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
        
        const recalculateProduction = async () => {
            // Production is now calculated directly from hexes on-demand
            // This function is kept for backwards compatibility but is no longer needed
            // @ts-ignore
            ui?.notifications?.info('Production is now calculated directly from hex data (no cache to refresh)');
            console.log('PF2E ReignMaker | Production is calculated on-demand from hex data');
        };
        
        // Register production inspector for debugging
        const { registerProductionInspector } = await import('./debug/inspectProduction');
        registerProductionInspector();
        
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
                resetKingdom,
                recalculateProduction
            };
            // For backwards compatibility
            module.openKingdomUI = openKingdomUI;
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
            resetKingdom,
            recalculateProduction
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
                resetKingdom,
                recalculateProduction
            };
        }
        
        // API functions available via game.pf2eReignMaker.*
});

// Hot Module Replacement support for development
if (import.meta.hot) {
    import.meta.hot.accept();
    console.log('PF2E ReignMaker | Hot Module Replacement enabled');
}
