/**
 * Default Factions - Loads default factions from data file
 */

import { createDefaultFaction } from './Faction';
import type { Faction, AttitudeLevel } from './Faction';
import factionsData from '../data-compiled/factions.json';
import { logger } from '../utils/Logger';

interface DefaultFactionData {
  id: string;
  name: string;
  attitude: AttitudeLevel;
  color: string;
}

/**
 * Load default factions from compiled data
 * Uses ES module import for proper HMR support
 */
export async function loadDefaultFactions(): Promise<Faction[]> {
  try {
    // Use the imported JSON data directly
    const data: DefaultFactionData[] = factionsData as DefaultFactionData[];
    
    // Convert to Faction objects, using the predefined IDs and colors
    return data.map(item => {
      const faction = createDefaultFaction(item.name, item.attitude);
      faction.id = item.id;        // Use the predefined ID from JSON
      faction.color = item.color;  // Use the predefined color from JSON
      return faction;
    });
  } catch (error) {
    logger.error('[DefaultFactions] Error loading default factions:', error);
    return [];
  }
}
