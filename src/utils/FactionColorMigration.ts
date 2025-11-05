/**
 * FactionColorMigration - Ensure all factions have colors
 * Automatically assigns colors to factions that don't have them
 */

import type { KingdomData } from '../actors/KingdomActor';
import { generateFactionColor } from './FactionColorGenerator';
import { logger } from './Logger';

/**
 * Migrate faction colors - ensure all factions have colors assigned
 * This is called when loading kingdom data to handle legacy saves
 * 
 * @param kingdom - Kingdom data to migrate
 * @returns true if any migrations were performed
 */
export function migrateFactionColors(kingdom: KingdomData): boolean {
  let migrated = false;
  
  // Check for factions without colors
  const factionsWithoutColors = kingdom.factions.filter(f => !f.color);
  
  if (factionsWithoutColors.length > 0) {
    logger.info(`[FactionColorMigration] Found ${factionsWithoutColors.length} faction(s) without colors, assigning...`);
    
    // Extract existing colors (from factions that already have them)
    const existingColors = kingdom.factions
      .filter(f => f.color)
      .map(f => f.color);
    
    // Also include player kingdom color in existing colors to avoid conflicts
    if (kingdom.playerKingdomColor) {
      existingColors.push(kingdom.playerKingdomColor);
    }
    
    // Assign colors to factions without them
    factionsWithoutColors.forEach(faction => {
      faction.color = generateFactionColor(existingColors);
      existingColors.push(faction.color);  // Track assigned colors
      logger.info(`[FactionColorMigration]   - ${faction.name}: ${faction.color}`);
    });
    
    migrated = true;
  }
  
  // Ensure playerKingdomColor is set
  if (!kingdom.playerKingdomColor) {
    kingdom.playerKingdomColor = '#5b9bd5';  // Default blue
    logger.info('[FactionColorMigration] Set default player kingdom color: #5b9bd5');
    migrated = true;
  }
  
  if (migrated) {
    logger.info('[FactionColorMigration] ✅ Migration complete');
  }
  
  return migrated;
}
