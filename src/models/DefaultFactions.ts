/**
 * Default Factions - Loads default factions from data file
 */

import { createDefaultFaction } from './Faction';
import type { Faction, AttitudeLevel } from './Faction';

interface DefaultFactionData {
  id: string;
  name: string;
  attitude: AttitudeLevel;
}

/**
 * Load default factions from combined dist file
 */
export async function loadDefaultFactions(): Promise<Faction[]> {
  try {
    // Import the combined JSON file from dist
    const response = await fetch('modules/pf2e-reignmaker/dist/factions.json');
    if (!response.ok) {
      console.warn('[DefaultFactions] Could not load default factions, using empty array');
      return [];
    }
    
    const data: DefaultFactionData[] = await response.json();
    
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
