/**
 * Clear Water Features Macro
 * Removes all lakes and swamps from kingdom data
 */

(async () => {
  // Find party actor
  const partyActor = game.actors.find(a => a.type === 'party');
  
  if (!partyActor) {
    ui.notifications.error('No party actor found!');
    return;
  }
  
  // Check if kingdom data exists
  const kingdom = partyActor.getFlag('pf2e-reignmaker', 'kingdom-data');
  
  if (!kingdom) {
    ui.notifications.error('No kingdom data found on party actor!');
    return;
  }
  
  // Clear water features
  await partyActor.setFlag('pf2e-reignmaker', 'kingdom-data', {
    ...kingdom,
    waterFeatures: {
      lakes: [],
      swamps: []
    }
  });
  
  ui.notifications.info('✅ Cleared all water features (lakes and swamps)');
  console.log('✅ Water features cleared successfully');
})();
