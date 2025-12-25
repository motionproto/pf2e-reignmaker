/**
 * Production Inspector - Debug tool for diagnosing production issues
 * 
 * Usage in browser console:
 * ```
 * await game.pf2eReignMaker.inspectProduction()
 * ```
 */

import { getKingdomActor } from '../main.kingdom';
import { logger } from '../utils/Logger';
import { PLAYER_KINGDOM } from '../types/ownership';

export async function inspectProduction(): Promise<void> {
  console.log('=== PRODUCTION INSPECTION ===');
  
  const actor = await getKingdomActor();
  if (!actor) {
    console.error('❌ No kingdom actor found');
    return;
  }
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    console.error('❌ No kingdom data found');
    return;
  }
  
  console.log('📊 Kingdom Data Overview:');
  console.log('  Total hexes:', kingdom.hexes?.length || 0);
  console.log('  Claimed hexes:', kingdom.hexes?.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length || 0);
  
  // Find hexes with worksites
  const hexesWithWorksites = kingdom.hexes?.filter((h: any) => h.worksite) || [];
  console.log('  Hexes with worksites:', hexesWithWorksites.length);
  
  if (hexesWithWorksites.length === 0) {
    console.warn('⚠️ No worksites found in hex data!');
    console.log('This means worksites were not properly saved to kingdom data.');
    return;
  }
  
  // Inspect each worksite
  console.log('\n🏭 Worksite Details:');
  hexesWithWorksites.forEach((hex: any) => {
    console.log(`\nHex ${hex.id}:`);
    console.log('  Terrain:', hex.terrain || '❌ MISSING');
    console.log('  Worksite Type:', hex.worksite?.type || '❌ MISSING');
    console.log('  Claimed By:', hex.claimedBy);
    console.log('  Has Commodity Bonus:', hex.hasCommodityBonus || false);
    
    // Calculate expected production
    const terrain = hex.terrain?.toLowerCase();
    const worksiteType = hex.worksite?.type;
    
    let expectedProduction = 'None (terrain mismatch)';
    
    if (worksiteType === 'Logging Camp' && terrain === 'forest') {
      expectedProduction = '2 lumber';
    } else if (worksiteType === 'Quarry' && (terrain === 'hills' || terrain === 'mountains')) {
      expectedProduction = '1 stone';
    } else if ((worksiteType === 'Mine' || worksiteType === 'Bog Mine') && (terrain === 'mountains' || terrain === 'swamp')) {
      expectedProduction = '1 ore';
    } else if (worksiteType === 'Farmstead') {
      if (terrain === 'plains') {
        expectedProduction = '2 food';
      } else {
        expectedProduction = '1 food';
      }
    }
    
    console.log('  Expected Production:', expectedProduction);
  });
  
  // Calculate production directly from hexes (no cache)
  const { calculateProduction } = await import('../services/economics/production');
  const result = calculateProduction(kingdom.hexes || [], []);

  console.log('\n📈 Calculated Production (from hexes):');
  const production: Record<string, number> = {};
  result.totalProduction.forEach((value, key) => {
    production[key] = value;
  });
  console.log(production);

  // Check if production is empty
  const hasProduction = Object.values(production).some((v: any) => v > 0);

  if (!hasProduction && hexesWithWorksites.length > 0) {
    console.warn('⚠️ Calculated production is empty despite having worksites!');
    console.log('Possible causes:');
    console.log('  1. Terrain data is missing or incorrect');
    console.log('  2. Worksites are on incompatible terrain');
    console.log('  3. Production calculation logic has an error');
  }

  console.log('\n=== END INSPECTION ===');
}

/**
 * Register the debug command
 */
export function registerProductionInspector(): void {
  if (!(globalThis as any).game?.pf2eReignMaker) {
    (globalThis as any).game = (globalThis as any).game || {};
    (globalThis as any).game.pf2eReignMaker = {};
  }
  
  (globalThis as any).game.pf2eReignMaker.inspectProduction = inspectProduction;
  console.log('✅ Production inspector registered: game.pf2eReignMaker.inspectProduction()');
}
