// Main entry point for PF2e Kingdom Lite module
// Using Svelte + TyphonJS Runtime Library

// Import and initialize the Kingdom Icon handler
import { registerKingdomIconHook } from './ui/KingdomIcon';

/**
 * Initialize the module when Foundry is ready
 */
Hooks.once('init', () => {
    console.log('PF2e Kingdom Lite | Initializing module (Svelte/TRL version)');
    
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
