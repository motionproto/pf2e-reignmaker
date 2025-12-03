/**
 * Cleanup Army-Settlement Data Macro
 * 
 * Fixes data inconsistencies between armies and settlements:
 * 1. Removes orphaned army IDs from settlement.supportedUnits
 * 2. Clears army.supportedBySettlementId if settlement doesn't list the army
 * 3. Syncs settlement.ownedBy with hex.claimedBy (deprecated field)
 * 
 * Run this macro after testing incidents that modify army/settlement ownership.
 */

(async () => {
  const actor = game.actors.find(a => a.getFlag('pf2e-reignmaker', 'kingdom-data'));
  if (!actor) {
    ui.notifications.error('No kingdom actor found!');
    return;
  }

  const kingdom = actor.getFlag('pf2e-reignmaker', 'kingdom-data');
  if (!kingdom) {
    ui.notifications.error('No kingdom data found!');
    return;
  }

  console.log('🧹 [Cleanup] Starting army-settlement data cleanup...');
  console.log('📊 [Cleanup] Current state:');
  console.log(`   Armies: ${kingdom.armies?.length || 0}`);
  console.log(`   Settlements: ${kingdom.settlements?.length || 0}`);
  
  // Diagnostic: List all armies
  console.log('\n📋 [Cleanup] All armies in kingdom data:');
  for (const army of (kingdom.armies || [])) {
    console.log(`   - ${army.name} (id: ${army.id}, ledBy: ${army.ledBy}, supportedBy: ${army.supportedBySettlementId || 'none'})`);
  }
  
  // Diagnostic: List all settlements and their supportedUnits
  console.log('\n📋 [Cleanup] All settlements and their supported units:');
  for (const settlement of (kingdom.settlements || [])) {
    const units = settlement.supportedUnits || [];
    console.log(`   - ${settlement.name}: ${units.length} units - [${units.join(', ')}]`);
    
    // Check each unit
    for (const unitId of units) {
      const army = kingdom.armies?.find(a => a.id === unitId);
      if (!army) {
        console.log(`     ⚠️ ORPHAN: "${unitId}" does not exist in armies!`);
      } else {
        console.log(`     ✓ "${army.name}" (${unitId})`);
      }
    }
  }
  
  let fixes = {
    orphanedArmyRefs: 0,
    mismatchedSupport: 0,
    ownershipSynced: 0
  };

  // Create a deep copy to modify
  const updatedKingdom = foundry.utils.deepClone(kingdom);
  const armies = updatedKingdom.armies || [];
  const settlements = updatedKingdom.settlements || [];
  const hexes = updatedKingdom.hexes || [];

  // Build army ID set for quick lookup
  const armyIds = new Set(armies.map(a => a.id));
  console.log(`\n🔍 [Cleanup] Valid army IDs: ${[...armyIds].join(', ')}`);

  // 1. Clean up settlement.supportedUnits - remove orphaned and non-player army references
  console.log('\n🔧 [Cleanup] Checking for orphaned and non-player army references...');
  for (const settlement of settlements) {
    if (!settlement.supportedUnits || settlement.supportedUnits.length === 0) continue;
    
    const originalLength = settlement.supportedUnits.length;
    const validUnits = settlement.supportedUnits.filter(armyId => {
      // Check if army exists
      if (!armyIds.has(armyId)) {
        console.log(`   ❌ Removing orphaned army ref "${armyId}" from ${settlement.name}`);
        fixes.orphanedArmyRefs++;
        return false;
      }
      
      // Check if army is still player-owned (non-player armies shouldn't be in player settlements)
      const army = armies.find(a => a.id === armyId);
      if (army && army.ledBy !== 'player' && army.ledBy !== null) {
        console.log(`   ❌ Removing non-player army "${army.name}" (ledBy: ${army.ledBy}) from ${settlement.name}`);
        // Also clear the army's supportedBySettlementId
        army.supportedBySettlementId = null;
        fixes.orphanedArmyRefs++;
        return false;
      }
      
      return true;
    });
    
    if (validUnits.length !== originalLength) {
      settlement.supportedUnits = validUnits;
      console.log(`   📝 ${settlement.name}: ${originalLength} → ${validUnits.length} units`);
    }
  }

  // 2. Fix army-settlement support mismatches
  console.log('\n🔧 [Cleanup] Checking for support mismatches...');
  for (const army of armies) {
    if (army.supportedBySettlementId) {
      const settlement = settlements.find(s => s.id === army.supportedBySettlementId);
      
      if (!settlement) {
        // Settlement doesn't exist - clear the reference
        console.log(`   ❌ Army "${army.name}" references non-existent settlement "${army.supportedBySettlementId}" - clearing`);
        army.supportedBySettlementId = null;
        army.isSupported = false;
        fixes.mismatchedSupport++;
      } else if (!settlement.supportedUnits?.includes(army.id)) {
        // Settlement exists but doesn't list this army - either add it or clear
        const tierConfig = {
          'Village': 1,
          'Town': 2,
          'City': 3,
          'Metropolis': 4
        };
        const capacity = tierConfig[settlement.tier] || 1;
        
        if ((settlement.supportedUnits?.length || 0) < capacity) {
          if (!settlement.supportedUnits) settlement.supportedUnits = [];
          settlement.supportedUnits.push(army.id);
          console.log(`   ✅ Added "${army.name}" to ${settlement.name}'s supported units`);
        } else {
          // No capacity - clear the army's reference
          console.log(`   ❌ ${settlement.name} at capacity - clearing "${army.name}" support reference`);
          army.supportedBySettlementId = null;
          army.isSupported = false;
        }
        fixes.mismatchedSupport++;
      }
    }
    
    // Also check: if army has no supportedBySettlementId but a settlement lists it
    if (!army.supportedBySettlementId) {
      for (const settlement of settlements) {
        if (settlement.supportedUnits?.includes(army.id)) {
          console.log(`   ❌ Removing "${army.name}" from ${settlement.name} (army doesn't reference settlement)`);
          settlement.supportedUnits = settlement.supportedUnits.filter(id => id !== army.id);
          fixes.mismatchedSupport++;
        }
      }
    }
  }

  // 3. Sync settlement.ownedBy with hex.claimedBy (for deprecated field)
  console.log('\n🔧 [Cleanup] Syncing ownership fields...');
  for (const settlement of settlements) {
    if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) {
      continue; // Skip unmapped settlements
    }
    
    const hex = hexes.find(h => 
      h.row === settlement.location.x && h.col === settlement.location.y
    );
    
    if (hex && settlement.ownedBy !== hex.claimedBy) {
      console.log(`   🔄 Syncing ${settlement.name} ownedBy: ${settlement.ownedBy} → ${hex.claimedBy}`);
      settlement.ownedBy = hex.claimedBy;
      fixes.ownershipSynced++;
    }
  }

  // Apply the changes
  const totalFixes = fixes.orphanedArmyRefs + fixes.mismatchedSupport + fixes.ownershipSynced;
  
  if (totalFixes > 0) {
    await actor.setFlag('pf2e-reignmaker', 'kingdom-data', updatedKingdom);
    
    const summary = [];
    if (fixes.orphanedArmyRefs > 0) summary.push(`${fixes.orphanedArmyRefs} orphaned army refs removed`);
    if (fixes.mismatchedSupport > 0) summary.push(`${fixes.mismatchedSupport} support mismatches fixed`);
    if (fixes.ownershipSynced > 0) summary.push(`${fixes.ownershipSynced} ownership fields synced`);
    
    console.log(`\n✅ [Cleanup] Complete: ${summary.join(', ')}`);
    ui.notifications.info(`Cleanup complete: ${summary.join(', ')}`);
  } else {
    console.log('\n✅ [Cleanup] No issues found - data is clean!');
    ui.notifications.info('No issues found - data is already clean!');
  }
  
  // Final state
  console.log('\n📊 [Cleanup] Final state:');
  for (const settlement of updatedKingdom.settlements || []) {
    const units = settlement.supportedUnits || [];
    console.log(`   - ${settlement.name}: ${units.length} supported units`);
  }
})();
