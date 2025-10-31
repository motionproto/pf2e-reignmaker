/**
 * Hex Inspector Debug Utility
 * 
 * Click on any hex to see its properties from the kingdom store
 * 
 * Usage:
 *   game.reignmaker.hexInspector.enable()   // Start inspecting
 *   game.reignmaker.hexInspector.disable()  // Stop inspecting
 */

import { getKingdomData } from '../stores/KingdomStore';
import { positionToOffset, offsetToHexId } from '../services/hex-selector/coordinates';
import { getAdjacentHexIds } from '../actions/shared/hexValidation';

class HexInspector {
  private active = false;
  private clickHandler: ((event: any) => void) | null = null;
  
  /**
   * Enable hex inspection mode
   */
  enable(): void {
    if (this.active) {
      console.log('🔍 Hex Inspector already active');
      return;
    }
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      console.error('❌ Canvas not available');
      return;
    }
    
    this.clickHandler = this.handleClick.bind(this);
    canvas.stage.on('click', this.clickHandler);
    this.active = true;
    
    console.log('✅ Hex Inspector ENABLED - Click on any hex to see its properties');
    console.log('   To disable: game.reignmaker.hexInspector.disable()');
  }
  
  /**
   * Disable hex inspection mode
   */
  disable(): void {
    if (!this.active) {
      console.log('🔍 Hex Inspector already disabled');
      return;
    }
    
    const canvas = (globalThis as any).canvas;
    if (this.clickHandler) {
      canvas?.stage?.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    
    this.active = false;
    console.log('⛔ Hex Inspector DISABLED');
  }
  
  /**
   * Handle hex click
   */
  private handleClick(event: any): void {
    try {
      // Get click position
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      
      // Convert to hex offset
      const offset = positionToOffset(position.x, position.y);
      const hexId = offsetToHexId(offset);
      
      console.log('\n═══════════════════════════════════════════════════');
      console.log(`📍 HEX INSPECTOR: ${hexId}`);
      console.log('═══════════════════════════════════════════════════');
      
      // Get hex data from kingdom store
      const kingdom = getKingdomData();
      const hex = kingdom.hexes.find((h: any) => h.id === hexId);
      
      if (!hex) {
        console.log('❌ Hex not found in kingdom data');
        console.log('   This hex may not be imported from Kingmaker yet');
        return;
      }
      
      // Cast to any for debug access to all properties
      const hexAny = hex as any;
      
      // Display hex properties
      console.log('\n🗺️  HEX PROPERTIES:');
      console.log('   ID:', hex.id);
      console.log('   Row:', hex.row, '  Col:', hex.col);
      console.log('   Terrain:', hex.terrain || 'unknown');
      console.log('   Travel:', hexAny.travel || 'unknown');
      console.log('   Claimed By:', hexAny.claimedBy === null ? 'Wilderness' : hexAny.claimedBy);
      console.log('   Has Road:', hex.hasRoad || false);
      console.log('   Fortified:', hex.fortified || 0);
      console.log('   Name:', hex.name || '(unnamed)');
      
      // Worksite
      if (hex.worksite) {
        console.log('\n🏗️  WORKSITE:');
        console.log('   Type:', hex.worksite.type);
      }
      
      // Commodities
      if (hexAny.commodities && Object.keys(hexAny.commodities).length > 0) {
        console.log('\n💎 COMMODITIES:');
        for (const [resource, amount] of Object.entries(hexAny.commodities)) {
          console.log(`   ${resource}: ${amount}`);
        }
      }
      
      // Features
      if (hexAny.features && hexAny.features.length > 0) {
        console.log('\n🏛️  FEATURES:');
        hexAny.features.forEach((feature: any, i: number) => {
          console.log(`   [${i}] Type: ${feature.type}`);
          if (feature.name) console.log(`       Name: ${feature.name}`);
          if (feature.tier) console.log(`       Tier: ${feature.tier}`);
          if (feature.linked !== undefined) console.log(`       Linked: ${feature.linked}`);
          if (feature.settlementId) console.log(`       Settlement ID: ${feature.settlementId}`);
        });
      }
      
      // Check for settlements
      const settlement = kingdom.settlements?.find((s: any) => 
        s.location && s.location.x === hex.row && s.location.y === hex.col
      );
      
      if (settlement) {
        console.log('\n🏘️  SETTLEMENT:');
        console.log('   Name:', settlement.name);
        console.log('   ID:', settlement.id);
        console.log('   Tier:', settlement.tier);
        console.log('   Level:', settlement.level);
        console.log('   Owned By:', settlement.ownedBy || 'unknown');
      }
      
      // Adjacent hexes (using Foundry API)
      console.log('\n🧭 ADJACENT HEXES (Foundry API):');
      const adjacentHexIds = getAdjacentHexIds(hexId);
      adjacentHexIds.forEach((adjId, i) => {
        const adjHex = kingdom.hexes.find((h: any) => h.id === adjId);
        if (adjHex) {
          const claimed = adjHex.claimedBy !== null && adjHex.claimedBy !== undefined;
          const road = adjHex.hasRoad;
          const adjSettlement = kingdom.settlements?.find((s: any) => 
            s.location && `${s.location.x}.${s.location.y}` === adjId
          );
          
          let status = [];
          if (claimed) status.push('claimed');
          if (road) status.push('road');
          if (adjSettlement) status.push(`settlement: ${adjSettlement.name}`);
          
          console.log(`   [${i}] ${adjId} (${adjHex.terrain}) ${status.length > 0 ? '→ ' + status.join(', ') : ''}`);
        } else {
          console.log(`   [${i}] ${adjId} (not in kingdom data)`);
        }
      });
      
      // Raw hex object
      console.log('\n📦 RAW HEX OBJECT:');
      console.log(hex);
      
      console.log('═══════════════════════════════════════════════════\n');
      
    } catch (error) {
      console.error('❌ Hex Inspector error:', error);
    }
  }
}

// Export singleton
export const hexInspector = new HexInspector();

// Make it available on game object for console access
declare global {
  interface Game {
    reignmaker?: {
      hexInspector?: HexInspector;
    };
  }
}

export function initializeHexInspector(): void {
  const game = (globalThis as any).game;
  if (!game) return;
  
  if (!game.reignmaker) {
    game.reignmaker = {};
  }
  
  game.reignmaker.hexInspector = hexInspector;
  
  console.log('🔍 Hex Inspector initialized');
  console.log('   Enable: game.reignmaker.hexInspector.enable()');
  console.log('   Disable: game.reignmaker.hexInspector.disable()');
}
