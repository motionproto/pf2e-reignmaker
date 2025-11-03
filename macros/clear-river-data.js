/**
 * Clear all river data from the kingdom
 * This removes:
 * - All canonical river edges from kingdom.rivers.edges
 * - All river features from hex features arrays
 * 
 * Run this from the Foundry console or as a macro
 */

(async function() {
  try {
    // Get the kingdom actor
    const kingdomActor = game.actors.find(a => a.getFlag('pf2e-reignmaker', 'kingdom-data'));
    
    if (!kingdomActor) {
      ui.notifications.error('No kingdom actor found!');
      return;
    }
    
    // Get current kingdom data
    const kingdomData = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data');
    
    if (!kingdomData) {
      ui.notifications.error('No kingdom data found!');
      return;
    }
    
    console.log('[ClearRiverData] Starting river data cleanup...');
    
    // Count existing river data for logging
    const existingEdges = Object.keys(kingdomData.rivers?.edges || {}).length;
    const hexesWithRivers = kingdomData.hexes?.filter(h => 
      h.features?.some(f => f.type === 'river')
    ).length || 0;
    
    console.log(`[ClearRiverData] Found ${existingEdges} canonical edges and ${hexesWithRivers} hexes with river features`);
    
    // Create updated kingdom data - clear all river paths (sequential system)
    const updatedData = {
      ...kingdomData,
      rivers: {
        paths: []  // Clear all river paths (sequential connect-the-dots system)
      },
      hexes: kingdomData.hexes.map(hex => ({
        ...hex,
        features: (hex.features || []).filter(f => f.type !== 'river')
      }))
    };
    
    // CRITICAL: Use update() instead of setFlag() to ensure proper save
    // setFlag may not trigger reactivity properly
    await kingdomActor.update({
      'flags.pf2e-reignmaker.kingdom-data': updatedData
    });
    
    console.log('[ClearRiverData] ✅ Cleared all river data (canonical edges + hex features)');
    
    // Verify the data was actually cleared
    const verifyData = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data');
    const verifyEdges = Object.keys(verifyData.rivers?.edges || {}).length;
    const verifyHexes = verifyData.hexes?.filter(h => h.features?.some(f => f.type === 'river')).length || 0;
    
    console.log('[ClearRiverData] 🔍 Verification after save:', {
      canonicalEdges: verifyEdges,
      hexesWithRivers: verifyHexes
    });
    
    if (verifyEdges > 0 || verifyHexes > 0) {
      console.error('[ClearRiverData] ❌ WARNING: Data not fully cleared!', {
        remainingEdges: verifyEdges,
        remainingHexes: verifyHexes
      });
      ui.notifications.warn(`River data partially cleared. ${verifyEdges} edges and ${verifyHexes} hexes with rivers remain.`);
    }
    
    // Force refresh the map layer if it exists
    try {
      const { ReignMakerMapLayer } = await import('/modules/pf2e-reignmaker/dist/pf2e-reignmaker.js');
      const mapLayer = ReignMakerMapLayer.getInstance();
      if (mapLayer) {
        await mapLayer.drawWaterConnections();
        console.log('[ClearRiverData] ✅ Map layer refreshed');
      }
    } catch (error) {
      console.log('[ClearRiverData] Map layer refresh skipped (module not loaded)');
    }
    
    // Force refresh editor mode if it's active
    try {
      const { getEditorModeService } = await import('/modules/pf2e-reignmaker/dist/pf2e-reignmaker.js');
      const editorService = getEditorModeService();
      if (editorService && editorService.isActive() && editorService.getCurrentTool() === 'river-edit') {
        console.log('[ClearRiverData] Editor is active with river-edit tool, refreshing...');
        // Re-set the tool to force a refresh
        await editorService.setTool('river-edit');
        console.log('[ClearRiverData] ✅ Editor refreshed');
      }
    } catch (error) {
      console.log('[ClearRiverData] Editor refresh skipped:', error.message);
    }
    
    ui.notifications.info('All river data has been cleared.');
    
  } catch (error) {
    console.error('[ClearRiverData] ❌ Error:', error);
    ui.notifications.error('Failed to clear river data. Check console for details.');
  }
})();
