// Debug script to check production values in the console
console.log('=== PRODUCTION DEBUG ===');

// Check if game is available
if (typeof game !== 'undefined') {
    console.log('Foundry detected');
    
    // Try to access the kingdom state
    if (game.pf2eReignMaker) {
        console.log('PF2E ReignMaker module found');
        
        // Try to get current kingdom state through the store
        if (window.__svelte__ && window.__svelte__.stores) {
            console.log('Svelte stores available');
            
            // Get kingdom state
            const kingdomState = window.__svelte__.stores.kingdomState;
            if (kingdomState) {
                const state = kingdomState.get();
                console.log('Kingdom State:', {
                    hexCount: state.hexes.length,
                    cachedProduction: Object.fromEntries(state.cachedProduction),
                    cachedProductionByHex: state.cachedProductionByHex.length,
                    worksiteCount: Object.fromEntries(state.worksiteCount)
                });
                
                // Check individual hexes
                console.log('Hex Details:');
                state.hexes.forEach(hex => {
                    if (hex.worksite) {
                        const production = hex.getProduction();
                        console.log(`  Hex ${hex.id} (${hex.terrain}):`, {
                            worksite: hex.worksite.type,
                            hasSpecialTrait: hex.hasSpecialTrait,
                            production: Object.fromEntries(production)
                        });
                    }
                });
                
                // Check totalProduction store
                const totalProduction = window.__svelte__.stores.totalProduction;
                if (totalProduction) {
                    console.log('Total Production Store:', totalProduction.get());
                }
            }
        }
    }
    
    // Check Kingmaker module data
    const km = typeof kingmaker !== 'undefined' ? kingmaker : globalThis.kingmaker;
    if (km && km.state && km.state.hexes) {
        console.log('Kingmaker hexes:', Object.keys(km.state.hexes).length);
        
        // Check a few claimed hexes
        const claimedHexes = Object.entries(km.state.hexes)
            .filter(([id, hex]) => hex.claimed)
            .slice(0, 3);
            
        console.log('Sample claimed hexes:');
        claimedHexes.forEach(([id, hex]) => {
            console.log(`  ${id}:`, {
                terrain: hex.terrain,
                camp: hex.camp,
                commodity: hex.commodity,
                features: hex.features
            });
        });
    }
}

console.log('=== END DEBUG ===');
console.log('Run this script in the browser console after opening the Kingdom UI');
