// Test script to check worksite production calculations
import { Hex, Worksite, WorksiteType } from './dist/pf2e-reignmaker.js';

console.log('Testing Worksite Production Calculations');
console.log('==========================================\n');

// Test quarry on different terrains
console.log('QUARRY PRODUCTION:');
const quarryHills = new Hex('test1', 'Hills', new Worksite(WorksiteType.QUARRY), false);
const quarryHillsBonus = new Hex('test2', 'Hills', new Worksite(WorksiteType.QUARRY), true);
const quarryMountains = new Hex('test3', 'Mountains', new Worksite(WorksiteType.QUARRY), false);

console.log(`Quarry on Hills (no bonus): ${Array.from(quarryHills.getProduction().entries()).map(([r,a]) => `${a} ${r}`).join(', ')}`);
console.log(`Quarry on Hills (with bonus): ${Array.from(quarryHillsBonus.getProduction().entries()).map(([r,a]) => `${a} ${r}`).join(', ')}`);
console.log(`Quarry on Mountains: ${Array.from(quarryMountains.getProduction().entries()).map(([r,a]) => `${a} ${r}`).join(', ')}`);

// Test mine on different terrains
console.log('\nMINE PRODUCTION:');
const mineMountains = new Hex('test4', 'Mountains', new Worksite(WorksiteType.MINE), false);
const mineSwamp = new Hex('test5', 'Swamp', new Worksite(WorksiteType.MINE), false);
const mineSwampBonus = new Hex('test6', 'Swamp', new Worksite(WorksiteType.MINE), true);

console.log(`Mine on Mountains: ${Array.from(mineMountains.getProduction().entries()).map(([r,a]) => `${a} ${r}`).join(', ')}`);
console.log(`Mine on Swamp (no bonus): ${Array.from(mineSwamp.getProduction().entries()).map(([r,a]) => `${a} ${r}`).join(', ')}`);
console.log(`Mine on Swamp (with bonus): ${Array.from(mineSwampBonus.getProduction().entries()).map(([r,a]) => `${a} ${r}`).join(', ')}`);

console.log('\n==========================================');
console.log('Expected values according to user:');
console.log('- Quarry on Hills with bonus: 6 stone (3 base + 2 hills + 1 bonus)');
console.log('- Mine on Swamp: 1 ore');
console.log('\nActual values from Reignmaker Lite rules:');
console.log('- Quarry on Hills: 1 stone');
console.log('- Quarry on Hills with bonus: 2 stone');
console.log('- Mine on Swamp: 1 ore');
