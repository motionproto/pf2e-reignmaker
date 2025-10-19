/**
 * Debug utility to test hex selector without full action flow
 */

import { hexSelectorService } from '../services/hex-selector';

/**
 * Test hex selector with configurable options
 */
export async function testHexSelector(
  count: number = 3,
  type: 'claim' | 'road' | 'settlement' | 'scout' = 'claim'
): Promise<void> {
  console.log(`🧪 [HexSelector Test] Starting test with ${count} hexes of type "${type}"`);
  
  try {
    const result = await hexSelectorService.selectHexes({
      title: `[TEST] Select ${count} Hex${count !== 1 ? 'es' : ''}`,
      count,
      colorType: type
    });
    
    if (result) {
      console.log(`✅ [HexSelector Test] Success! Selected hexes:`, result);
      const ui = (globalThis as any).ui;
      ui?.notifications?.info(`Test complete! Selected: ${result.join(', ')}`);
    } else {
      console.log(`❌ [HexSelector Test] Cancelled or failed`);
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('Hex selection was cancelled');
    }
  } catch (error) {
    console.error(`❌ [HexSelector Test] Error:`, error);
    const ui = (globalThis as any).ui;
    ui?.notifications?.error(`Hex selector error: ${error}`);
  }
}

// Expose to global scope for console access
(globalThis as any).testHexSelector = testHexSelector;

console.log(`
🧪 Hex Selector Debug Tool Loaded!

Usage from browser console:
  testHexSelector()               // Select 3 hexes (claim type)
  testHexSelector(5)              // Select 5 hexes (claim type)
  testHexSelector(2, 'road')      // Select 2 hexes (road type)
  testHexSelector(1, 'settlement') // Select 1 hex (settlement type)
  testHexSelector(4, 'scout')     // Select 4 hexes (scout type)
`);
