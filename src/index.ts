// Main entry point for PF2e Kingdom Lite module
// Using Svelte + TyphonJS Runtime Library

// Import and initialize the Kingdom Icon handler
import { registerKingdomIconHook } from './ui/KingdomIcon';

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
});

/**
 * Setup module once the game is ready
 */
Hooks.once('ready', () => {
    console.log('PF2e Kingdom Lite | Module ready');
    console.log('PF2e Kingdom Lite | Svelte Kingdom system initialized');
});
