/**
 * Default Factions - Loads default factions from data file
 */

import { createDefaultFaction } from './Faction';
import type { Faction, AttitudeLevel } from './Faction';
import factionsData from '../data-compiled/factions.json';

interface DefaultFactionData {
  id: string;
  name: string;
  attitude: AttitudeLevel;
}

/**
 * Load default factions from compiled data
 * Uses ES module import for proper HMR support (matches pattern in event-loader.ts, action-loader.ts, etc.)
 */
export async function loadDefaultFactions(): Promise<Faction[]> {
  try {
    // Use the imported JSON data directly
    const data: DefaultFactionData[] = factionsData as DefaultFactionData[];
    
    // Convert to Faction objects, using the predefined IDs
    return data.map(item => {
      const faction = createDefaultFaction(item.name, item.attitude);
      faction.id = item.id;  // Use the predefined ID from JSON
      return faction;
    });
  } catch (error) {
    console.error('[DefaultFactions] Error loading default factions:', error);
    return [];
  }
}
