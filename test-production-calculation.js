// Test script to verify production calculation
import { Hex, Worksite, WorksiteType } from './src/models/Hex.js';
import { economicsService } from './src/services/economics/index.js';

// Create test hexes - 2 plains with farmsteads
const hex1 = new Hex('92.9', 'Plains', new Worksite(WorksiteType.FARMSTEAD), false, 'North Farm');
const hex2 = new Hex('93.9', 'Plains', new Worksite(WorksiteType.FARMSTEAD), false, 'South Farm');

// Create test hexes array
const hexes = [hex1, hex2];

console.log('Testing Production Calculation');
console.log('==============================\n');

// Test individual hex production
console.log('Individual Hex Production:');
hexes.forEach(hex => {
    const production = hex.getProduction();
    console.log(`Hex ${hex.id} (${hex.terrain}) with ${hex.worksite?.type}:`);
    production.forEach((amount, resource) => {
        console.log(`  - ${resource}: ${amount}`);
    });
});

console.log('\nTotal Production via Economics Service:');
// Calculate total production using economics service
const productionResult = economicsService.calculateProduction(hexes, []);

console.log('Base Production:');
productionResult.baseProduction.forEach((amount, resource) => {
    console.log(`  - ${resource}: ${amount}`);
});

console.log('\nTotal Production:');
productionResult.totalProduction.forEach((amount, resource) => {
    console.log(`  - ${resource}: ${amount}`);
});

console.log('\nProduction by Hex:');
productionResult.byHex.forEach(({ hex, production }) => {
    console.log(`Hex ${hex.id}:`);
    production.forEach((amount, resource) => {
        console.log(`  - ${resource}: ${amount}`);
    });
});

// Test with special trait
console.log('\n\nTesting with Special Trait:');
const hex3 = new Hex('94.9', 'Plains', new Worksite(WorksiteType.FARMSTEAD), true, 'Fertile Farm');
const specialProduction = hex3.getProduction();
console.log(`Hex with special trait produces:`);
specialProduction.forEach((amount, resource) => {
    console.log(`  - ${resource}: ${amount}`);
});
