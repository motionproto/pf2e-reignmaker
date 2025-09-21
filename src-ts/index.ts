// Entry point for PF2e Kingdom Lite module
// Auto-converted and fixed from Main.kt

/// <reference path="./types/global.d.ts" />

// Module ID constant
const MODULE_ID = 'pf2e-kingdom-lite';

/**
 * Initialize the module
 */
function init(): void {
    console.log("PF2e Kingdom Lite: Module loading...");
    
    // Register init hook
    Hooks.once("init", () => {
        console.log("PF2e Kingdom Lite: Init hook");
        
        // Register settings
        registerSettings();
        
        // Inject the Kingdom Sheet styles
        // TODO: Import and use KingdomSheetStyles
        // injectStyles(KingdomSheetStyles.styles);
    });
    
    // Register ready hook for final setup
    Hooks.once("ready", () => {
        console.log("PF2e Kingdom Lite: Ready hook - Module fully loaded");
        
        // Register the Kingdom icon hook to add icons to party actors
        // TODO: Import registerKingdomIconHook
        // registerKingdomIconHook();
        
        // Register hooks for Kingmaker updates
        registerKingmakerHooks();
    });
}

/**
 * Register module settings
 */
function registerSettings(): void {
    console.log("PF2e Kingdom Lite: Registering settings");
    
    // Register kingdom scene setting
    const settingsConfig: any = {
        name: "Kingdom Scene",
        hint: "The scene that represents your kingdom map",
        scope: "world",
        config: false,
        type: String,
        default: ""
    };
    
    (game as any).settings.register(
        MODULE_ID,
        "kingdomSceneId",
        settingsConfig
    );
}

/**
 * Register hooks to listen for Kingmaker module updates
 */
function registerKingmakerHooks(): void {
    console.log("PF2e Kingdom Lite: Registering Kingmaker update hooks...");
    
    // Hook when hex editing is closed (indicates hex data may have changed)
    Hooks.on("closeKingmakerHexEdit", (_: any) => {
        console.log("Kingmaker hex edit detected - refreshing kingdom data");
        refreshKingdomData();
    });
    
    // Hook for general scene updates (hexes might be claimed/unclaimed)
    Hooks.on("updateScene", (...args: any[]) => {
        // Check if this is the kingdom scene
        const sceneId = args[0]?.id;
        if (sceneId != null) {
            console.log("Scene update detected - checking for kingdom changes");
            refreshKingdomData();
        }
    });
    
    // Hook for when actor updates (kingdom actor might change)
    Hooks.on("updateActor", (...args: any[]) => {
        const actor = args[0];
        if (actor?.type === "party") {
            console.log("Party actor update detected - refreshing kingdom data");
            refreshKingdomData();
        }
    });
    
    console.log("PF2e Kingdom Lite: Kingmaker hooks registered successfully");
}

/**
 * Refresh kingdom data in all open Kingdom Sheets
 */
function refreshKingdomData(): void {
    // Simply notify that data should be refreshed
    // The actual refresh happens when tabs are switched due to our existing mechanism
    console.log("Kingdom data changed - will refresh on next view");
}

// Entry point - initialize the module
init();

// Export for module system
export { init, registerSettings, registerKingmakerHooks, refreshKingdomData };
