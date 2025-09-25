// Debug script to check what terrain data is coming from Kingmaker
// Run this in the browser console

console.log("=== Kingmaker Data Debug ===");

const km = typeof kingmaker !== 'undefined' ? kingmaker : globalThis.kingmaker;

if (!km?.state?.hexes) {
    console.error("Kingmaker module not available");
} else {
    // Get all claimed hexes
    const claimedHexes = Object.keys(km.state.hexes)
        .filter(id => km.state.hexes[id]?.claimed)
        .map(id => {
            const hex = km.state.hexes[id];
            const num = parseInt(id);
            const row = Math.floor(num / 1000);
            const col = num % 1000;
            const dotId = `${row}.${col}`;
            
            // Check for farmland features
            const hasFarmland = hex.features?.some(f => f.type === 'farmland');
            
            return {
                id: dotId,
                terrain: hex.terrain,
                camp: hex.camp,
                features: hex.features,
                hasFarmland: hasFarmland,
                commodity: hex.commodity
            };
        });
    
    // Show hexes with farmland
    const farmlandHexes = claimedHexes.filter(h => h.hasFarmland);
    console.log(`Found ${farmlandHexes.length} hexes with farmland features:`);
    
    farmlandHexes.forEach(hex => {
        console.log(`Hex ${hex.id}:`);
        console.log(`  - Terrain: "${hex.terrain}"`);
        console.log(`  - Features:`, hex.features);
        console.log(`  - Commodity:`, hex.commodity);
        
        // Check what terrain normalization would do
        const normalized = hex.terrain ? hex.terrain.toLowerCase() : 'plains';
        let normalizedTerrain;
        switch (normalized) {
            case 'plains': normalizedTerrain = 'Plains'; break;
            case 'forest': normalizedTerrain = 'Forest'; break;
            case 'hills': normalizedTerrain = 'Hills'; break;
            case 'mountains': normalizedTerrain = 'Mountains'; break;
            case 'swamp': normalizedTerrain = 'Swamp'; break;
            case 'wetlands': normalizedTerrain = 'Swamp'; break;
            case 'desert': normalizedTerrain = 'Desert'; break;
            case 'lake': normalizedTerrain = 'Plains'; break;
            default: normalizedTerrain = 'Plains'; break;
        }
        
        console.log(`  - Normalized terrain: "${normalizedTerrain}"`);
        
        // Check expected production
        if (normalizedTerrain === 'Plains') {
            console.log(`  ✅ Should produce 2 food`);
        } else if (normalizedTerrain === 'Hills') {
            console.log(`  ✅ Should produce 1 food`);
        } else {
            console.log(`  ❌ Will NOT produce food on ${normalizedTerrain} terrain!`);
        }
    });
}

console.log("=== End Debug ===");
