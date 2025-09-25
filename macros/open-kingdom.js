// Macro to open PF2E ReignMaker UI
// You can create this as a macro in Foundry and run it to open the Kingdom UI

(async () => {
    // Check if module is active
    const moduleId = 'pf2e-reignmaker';
    const module = game.modules.get(moduleId);

    if (!module?.active) {
        ui.notifications.error("PF2E ReignMaker module is not active. Please enable it in Module Settings.");
        return;
    }
    
    // Debug: Check Kingmaker module status
    const kingmakerModule = game.modules.get('pf2e-kingmaker');
    console.log("PF2E ReignMaker | Kingmaker module status:", {
        installed: !!kingmakerModule,
        active: kingmakerModule?.active,
        globalKingmaker: typeof kingmaker !== 'undefined' ? kingmaker : null,
        globalThisKingmaker: globalThis.kingmaker,
        windowKingmaker: window.kingmaker
    });
    
    // Debug: Try to trigger a manual sync
    if (window.pf2eReignMaker?.syncKingmaker) {
        console.log("PF2E ReignMaker | Attempting manual sync...");
        const syncResult = window.pf2eReignMaker.syncKingmaker();
        console.log("PF2E ReignMaker | Sync result:", syncResult);
    }
    
    // Try multiple ways to access the kingdom UI function
    let openKingdomUI = null;
    
    // Try the module API first
    if (module.api?.openKingdomUI) {
        openKingdomUI = module.api.openKingdomUI;
    } 
    // Try direct method on module
    else if (module.openKingdomUI) {
        openKingdomUI = module.openKingdomUI;
    }
    // Try global object
    else if (game.pf2eReignMaker?.openKingdomUI) {
        openKingdomUI = game.pf2eReignMaker.openKingdomUI;
    }
    // Fallback for development
    else if (window.pf2eReignMaker?.openKingdomUI) {
        openKingdomUI = window.pf2eReignMaker.openKingdomUI;
    }
    // Legacy fallback - try to import the module directly
    else {
        try {
            // For production builds, try to import from the built module
            const modulePath = '/modules/pf2e-reignmaker/dist/index.js';
            const { KingdomApp } = await import(modulePath);
            
            // Find a party actor
            const partyActor = game.actors.find(a => a.type === 'party');
            if (!partyActor) {
                ui.notifications.warn("No party actor found. Please create a party actor first.");
                return;
            }
            
            const app = new KingdomApp({ actorId: partyActor.id });
            app.render(true, { focus: true });
            ui.notifications.info("Kingdom UI opened!");
            return;
        } catch (importError) {
            console.error("PF2E ReignMaker | Failed to import module:", importError);
        }
    }
    
    // If we found a function, use it
    if (openKingdomUI) {
        try {
            openKingdomUI();
            ui.notifications.info("Kingdom UI opened!");
        } catch (error) {
            console.error("PF2E ReignMaker | Failed to open Kingdom UI:", error);
            ui.notifications.error("Failed to open Kingdom UI. Check console for details.");
        }
    } else {
        ui.notifications.error("PF2E ReignMaker module is active but UI function not found! Try refreshing the page.");
        console.error("PF2E ReignMaker | Available access points:", {
            module,
            moduleAPI: module?.api,
            moduleOpenKingdomUI: module?.openKingdomUI,
            gamePf2eReignMaker: game.pf2eReignMaker,
            windowPf2eReignMaker: window.pf2eReignMaker,
            windowOpenKingdomUI: window.openKingdomUI
        });
        console.log("PF2E ReignMaker | Hint: Make sure the dev server is running (npm run dev) and refresh Foundry after it starts.");
    }
})();
