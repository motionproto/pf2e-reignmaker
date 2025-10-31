/**
 * Debug utility to check hex data across different sources
 */

import { logger } from '../utils/Logger';
import { get } from 'svelte/store';
import { kingdomData } from '../stores/KingdomStore';

/**
 * Check hex data in Kingmaker vs Kingdom Store
 */
export function checkHexData(hexId: string): void {
  logger.info(`========== HEX ${hexId} DATA CHECK ==========`);
  
  // Check Kingmaker data
  try {
    // @ts-ignore - Kingmaker global
    const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
    
    if (km?.state?.hexes) {
      // Convert dot notation to Kingmaker format (3.20 → 3020)
      const [row, col] = hexId.split('.');
      const kingmakerKey = (parseInt(row) * 1000) + parseInt(col);
      
      const hexState = km.state.hexes[kingmakerKey];
      
      logger.info(`\n[KINGMAKER] Hex ${hexId} (key ${kingmakerKey}):`);
      if (hexState) {
        logger.info(`  claimed: ${hexState.claimed}`);
        logger.info(`  features:`, hexState.features);
        logger.info(`  camp: ${hexState.camp}`);
        
        // Check specifically for roads
        const hasRoadInKingmaker = hexState.features?.some((f: any) => f.type === 'road');
        logger.info(`  HAS ROAD IN KINGMAKER: ${hasRoadInKingmaker}`);
      } else {
        logger.info(`  (No hex state in Kingmaker)`);
      }
    } else {
      logger.info(`\n[KINGMAKER] Not available`);
    }
  } catch (error) {
    logger.error('[KINGMAKER] Error checking data:', error);
  }
  
  // Check Kingdom Store data
  try {
    const kingdom = get(kingdomData);
    const hexData = kingdom.hexes?.find((h: any) => h.id === hexId);
    
    logger.info(`\n[KINGDOM STORE] Hex ${hexId}:`);
    if (hexData) {
      logger.info(`  terrain: ${(hexData as any).terrain}`);
      logger.info(`  travel: ${(hexData as any).travel}`);
      logger.info(`  hasRoad: ${(hexData as any).hasRoad}`);
      logger.info(`  features:`, (hexData as any).features);
      logger.info(`  claimedBy: ${(hexData as any).claimedBy}`);
    } else {
      logger.info(`  (Not found in Kingdom Store)`);
    }
  } catch (error) {
    logger.error('[KINGDOM STORE] Error checking data:', error);
  }
  
  logger.info(`========== END HEX DATA CHECK ==========\n`);
}

/**
 * Register debug utility
 */
export function registerHexDataCheck(): void {
  const game = (globalThis as any).game;
  if (!game) return;
  
  if (!game.reignmaker) {
    game.reignmaker = {};
  }
  
  game.reignmaker.checkHexData = checkHexData;
  logger.info('[Debug] ✅ Hex data checker registered: game.reignmaker.checkHexData(hexId)');
}
