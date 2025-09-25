// Test script for enhanced structures system with special abilities
// Run with: node test-enhanced-structures.js

console.log('Testing Enhanced Structures System...\n');

// Mock the Svelte store
const mockState = {
  resources: new Map([
    ['lumber', 10],
    ['stone', 10],
    ['ore', 10],
    ['gold', 10],
    ['food', 10]
  ]),
  settlements: []
};

// Mock get function
global.get = function(store) {
  return mockState;
};

// Mock kingdomState
global.kingdomState = mockState;

// Import after mocking
import('./src/services/structures/index.js').then(async (module) => {
  const { structuresService } = module;
  
  // Import models
  const { createSettlement } = await import('./src/models/Settlement.js');
  const { SpecialAbility } = await import('./src/models/Structure.js');
  
  // Load structures first
  console.log('Loading structures...');
  await structuresService.loadStructures();
  
  console.log('Testing Kingdom-Wide Unique Validation:\n');
  
  // Create test settlements
  const village1 = createSettlement('Test Village 1', {x: 10, y: 10}, 'Village');
  const town1 = createSettlement('Test Town 1', {x: 20, y: 20}, 'Town');
  
  // Add a tax office to village1
  village1.structureIds.push('tax-office');
  mockState.settlements = [village1, town1];
  
  // Test that we can't build another revenue structure
  const isValid = structuresService.validateKingdomWideUnique('counting-house');
  console.log('Can build Counting House when Tax Office exists:', isValid ? 'NO (correct!)' : 'YES (wrong!)');
  
  // Test that we can upgrade within same settlement
  const canUpgrade = structuresService.validateKingdomWideUnique('counting-house', village1.id);
  console.log('Can upgrade Tax Office to Counting House:', canUpgrade ? 'YES (correct!)' : 'NO (wrong!)');
  
  console.log('\nTesting Special Abilities:\n');
  
  // Add structures with special abilities
  const metropolis = createSettlement('Test Metropolis', {x: 30, y: 30}, 'Metropolis');
  metropolis.structureIds = [
    'strategic-reserves', // Food spoilage protection
    'donjon',            // Convert unrest
    'citadel',           // Auto reduce unrest
    'auditorium',        // Fame + unrest reduction
    'grand-battlements'  // Defender recovery
  ];
  
  mockState.settlements = [metropolis];
  
  // Get active abilities
  const abilities = structuresService.getActiveSpecialAbilities([metropolis]);
  console.log('Active special abilities:');
  abilities.forEach((settlements, ability) => {
    console.log(`  ${ability}: ${settlements.length} settlement(s)`);
  });
  
  // Test automatic effects
  console.log('\nTesting Automatic Turn Effects:');
  const effects = structuresService.processAutomaticEffects([metropolis]);
  console.log('  Unrest Reduction:', effects.unrestReduction, '(should be 2: Citadel + Auditorium)');
  console.log('  Fame Gain:', effects.fameGain, '(should be 1: Auditorium)');
  console.log('  Converted Unrest:', effects.convertedUnrest, '(should be 1: Donjon)');
  
  // Test food spoilage protection
  const hasProtection = structuresService.hasFoodSpoilageProtection([metropolis]);
  console.log('  Food Spoilage Protection:', hasProtection ? 'YES' : 'NO');
  
  // Test defender recovery
  const defenderSettlements = structuresService.getSettlementsWithDefenderRecovery([metropolis]);
  console.log('  Settlements with Defender Recovery:', defenderSettlements.length);
  
  console.log('\nTesting Structure Availability with Kingdom-Wide Unique:\n');
  
  // Create a new village and check available structures
  const village2 = createSettlement('Test Village 2', {x: 40, y: 40}, 'Village');
  
  // First, clear revenue structures
  mockState.settlements = [village2];
  let available = structuresService.getAvailableStructures(village2);
  const hasRevenue = available.some(s => s.category === 'revenue');
  console.log('Revenue structures available when none exist:', hasRevenue ? 'YES' : 'NO');
  
  // Now add a revenue structure to another settlement
  village1.structureIds = ['tax-office'];
  mockState.settlements = [village1, village2];
  available = structuresService.getAvailableStructures(village2);
  const hasRevenueNow = available.some(s => s.category === 'revenue');
  console.log('Revenue structures available when one exists elsewhere:', hasRevenueNow ? 'NO (correct!)' : 'YES (wrong!)');
  
  console.log('\nTesting Special Structure Details:\n');
  
  // Get specific structures
  const strategicReserves = structuresService.getStructure('strategic-reserves');
  if (strategicReserves) {
    console.log('Strategic Reserves:');
    console.log('  Food Storage:', strategicReserves.effects.foodStorage);
    console.log('  Special Abilities:', strategicReserves.effects.specialAbilities);
    console.log('  Negate Food Spoilage:', strategicReserves.effects.negateFoodSpoilage);
  }
  
  const donjon = structuresService.getStructure('donjon');
  if (donjon) {
    console.log('\nDonjon:');
    console.log('  Imprisoned Capacity:', donjon.effects.imprisonedUnrestCapacity);
    console.log('  Convert Unrest/Turn:', donjon.effects.convertUnrestPerTurn);
    console.log('  Special Abilities:', donjon.effects.specialAbilities);
  }
  
  const exchequer = structuresService.getStructure('exchequer');
  if (exchequer) {
    console.log('\nExchequer:');
    console.log('  Gold/Turn:', exchequer.effects.goldPerTurn);
    console.log('  Kingdom-Wide Unique:', exchequer.uniqueKingdomWide);
    console.log('  Allows Personal Income:', exchequer.effects.allowsPersonalIncome);
  }
  
  console.log('\n✅ Enhanced structures test complete!');
  
}).catch(console.error);
