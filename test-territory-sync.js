// Test script to manually trigger territory sync
// Run in browser console after loading the Kingdom UI

console.log("=== Testing Territory Service Sync ===");

// Check if Kingmaker is available
const km = typeof kingmaker !== 'undefined' ? kingmaker : globalThis.kingmaker;
console.log("Kingmaker available:", !!km);
console.log("Kingmaker state:", km?.state);
console.log("Kingmaker hexes:", km?.state?.hexes ? Object.keys(km.state.hexes).length : 0);

// Get the first few hex IDs to see their format
if (km?.state?.hexes) {
    const hexIds = Object.keys(km.state.hexes).slice(0, 5);
    console.log("Sample hex IDs:", hexIds);
    
    // Check for claimed hexes
    const claimedHexes = Object.keys(km.state.hexes)
        .filter(id => km.state.hexes[id]?.claimed)
        .slice(0, 3);
    
    console.log("Sample claimed hex IDs:", claimedHexes);
    
    if (claimedHexes.length > 0) {
        const firstHex = km.state.hexes[claimedHexes[0]];
        console.log("First claimed hex data:", firstHex);
    }
}

// Try to manually sync
console.log("Attempting manual sync...");
if (game.pf2eKingdomLite?.syncKingmaker) {
    const result = game.pf2eKingdomLite.syncKingmaker();
    console.log("Sync result:", result);
}

console.log("=== Test Complete ===");
console.log("To clear cache and reload:");
console.log("1. Open DevTools (F12)");
console.log("2. Right-click the refresh button");
console.log("3. Select 'Empty Cache and Hard Reload'");
console.log("Or press Ctrl+Shift+R (Cmd+Shift+R on Mac)");
