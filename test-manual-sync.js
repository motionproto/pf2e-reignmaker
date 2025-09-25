// Manual sync test to bypass the cached code issue
// Run this in the browser console after opening the Kingdom UI

console.log("=== Manual Territory Sync Test ===");

// Get the Kingmaker module data
const km = typeof kingmaker !== 'undefined' ? kingmaker : globalThis.kingmaker;

if (!km?.state?.hexes) {
    console.error("Kingmaker module not available or no hexes found");
    console.log("Kingmaker object:", km);
} else {
    console.log("Kingmaker hexes found:", Object.keys(km.state.hexes).length);
    
    // Get claimed hexes
    const claimedHexes = Object.keys(km.state.hexes)
        .filter(id => km.state.hexes[id]?.claimed)
        .map(id => {
            const hex = km.state.hexes[id];
            // Convert numeric ID to dot notation
            const num = parseInt(id);
            const row = Math.floor(num / 1000);
            const col = num % 1000;
            const dotId = `${row}.${col}`;
            
            return {
                id: dotId,
                numericId: id,
                terrain: hex.terrain,
                camp: hex.camp,
                commodity: hex.commodity,
                features: hex.features,
                claimed: hex.claimed
            };
        });
    
    console.log(`Found ${claimedHexes.length} claimed hexes`);
    console.log("Sample claimed hexes:", claimedHexes.slice(0, 3));
    
    // Try to access the kingdom store directly
    if (window.game?.modules?.get('pf2e-kingdom-lite')) {
        console.log("PF2e Kingdom Lite module found");
        
        // Try to manually update the store
        // This is a hack to bypass the import issue
        try {
            // Execute in the module's context
            const result = eval(`
                (() => {
                    // Try to access the stores from the global context
                    const storeModule = window.__pf2e_kingdom_lite_stores;
                    if (storeModule && storeModule.kingdomState) {
                        console.log("Found kingdom store via global");
                        // Update would go here
                        return true;
                    }
                    return false;
                })()
            `);
            
            if (!result) {
                console.log("Could not access kingdom store directly");
                console.log("You may need to:");
                console.log("1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)");
                console.log("2. Clear browser cache");
                console.log("3. Restart Foundry VTT");
            }
        } catch (e) {
            console.error("Error accessing stores:", e);
        }
    }
}

console.log("=== End Test ===");
console.log("");
console.log("To fix the caching issue:");
console.log("1. Close the Kingdom UI");
console.log("2. Press F12 to open DevTools");
console.log("3. Right-click the refresh button");
console.log("4. Select 'Empty Cache and Hard Reload'");
console.log("5. Once reloaded, open the Kingdom UI again");
