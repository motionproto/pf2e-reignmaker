/**
 * Reset Kingdom Data Macro
 * 
 * This macro completely resets the kingdom data on the party actor,
 * removing any corrupted or nested structures and initializing a
 * clean, flat KingdomData structure that matches our architecture.
 */
(async () => {
  console.log('🔄 Resetting kingdom data...');
  
  // Find the party actor
  const party = game.actors.find(a => a.type === 'party');
  if (!party) {
    ui.notifications.error('No party actor found!');
    return;
  }
  
  console.log(`Found party actor: ${party.name}`);
  
  // 1. Delete ALL ReignMaker data
  await party.unsetFlag('pf2e-reignmaker', 'kingdom-data');
  await party.unsetFlag('pf2e-reignmaker', 'territory-data');
  await party.unsetFlag('pf2e-reignmaker', 'game-progression-data');
  console.log('✅ Deleted old ReignMaker data');
  
  // 2. Initialize fresh kingdom data with proper flat structure
  const defaultKingdom = {
    currentTurn: 1,
    currentPhase: 'Kingdom Status',
    currentPhaseStepIndex: 0,
    resources: { 
      gold: 0, 
      food: 0, 
      lumber: 0, 
      stone: 0, 
      ore: 0, 
      luxuries: 0 
    },
    hexes: [],
    settlements: [],
    size: 0,
    worksiteCount: {},
    cachedProduction: {},
    armies: [],
    buildQueue: [],
    unrest: 0,
    imprisonedUnrest: 0,
    fame: 0,
    isAtWar: false,
    ongoingEvents: [],
    activeModifiers: [],
    eventDC: 15,
    currentPhaseSteps: [],
    phaseComplete: false,
    oncePerTurnActions: [],
    playerActions: {}
  };
  
  await party.setFlag('pf2e-reignmaker', 'kingdom-data', defaultKingdom);
  console.log('✅ Initialized fresh kingdom data');
  
  // 3. Log the new clean data structure
  console.log('📊 New Kingdom Data Structure:', defaultKingdom);
  console.log('📊 Detailed breakdown:');
  console.log('  - Current Turn:', defaultKingdom.currentTurn);
  console.log('  - Current Phase:', defaultKingdom.currentPhase);
  console.log('  - Resources:', defaultKingdom.resources);
  console.log('  - Settlements:', defaultKingdom.settlements.length);
  console.log('  - Hexes:', defaultKingdom.hexes.length);
  console.log('  - Unrest:', defaultKingdom.unrest);
  console.log('  - Fame:', defaultKingdom.fame);
  
  ui.notifications.info('Kingdom data reset successfully! Reload the world to see changes.');
  console.log('✅ Kingdom data reset complete!');
  console.log('💡 Next step: Reload your world to ensure all systems pick up the new data.');
})();
