// Faction Service for PF2e Kingdom Lite
// Manages faction CRUD operations and diplomatic relations

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import type { Faction, AttitudeLevel } from '../../models/Faction';
import { createDefaultFaction } from '../../models/Faction';
import { loadDefaultFactions } from '../../models/DefaultFactions';
import { adjustAttitudeBySteps } from '../../utils/faction-attitude-adjuster';
export class FactionService {
  /**
   * Create a new faction
   * 
   * @param name - Faction name
   * @param attitude - Initial attitude level
   * @returns Created faction
   */
  async createFaction(name: string, attitude: AttitudeLevel = 'Indifferent'): Promise<Faction> {

    const faction = createDefaultFaction(name, attitude);
    
    await updateKingdom(kingdom => {
      if (!kingdom.factions) {
        kingdom.factions = [];
      }
      kingdom.factions.push(faction);
    });

    return faction;
  }
  
  /**
   * Update faction with partial data
   * 
   * @param factionId - Faction ID
   * @param updates - Partial faction updates
   */
  async updateFaction(factionId: string, updates: Partial<Faction>): Promise<void> {

    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find((f: Faction) => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      // Apply updates
      Object.assign(faction, updates);
    });

  }
  
  /**
   * Update faction with full detail data
   * Used by the detail view to save all fields at once
   * 
   * @param factionId - Faction ID
   * @param factionData - Complete faction data
   */
  async updateFactionDetails(factionId: string, factionData: Faction): Promise<void> {

    await updateKingdom(kingdom => {
      const factionIndex = kingdom.factions?.findIndex((f: Faction) => f.id === factionId);
      if (factionIndex === undefined || factionIndex === -1) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      // Replace entire faction (preserving the ID)
      kingdom.factions[factionIndex] = { ...factionData, id: factionId };
    });

  }
  
  /**
   * Delete a faction
   * 
   * @param factionId - Faction ID to delete
   */
  async deleteFaction(factionId: string): Promise<void> {

    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const faction = kingdom.factions?.find((f: Faction) => f.id === factionId);
    if (!faction) {
      throw new Error(`Faction not found: ${factionId}`);
    }
    
    await updateKingdom(kingdom => {
      kingdom.factions = kingdom.factions.filter((f: Faction) => f.id !== factionId);
    });

  }
  
  /**
   * Update faction attitude
   * 
   * @param factionId - Faction ID
   * @param attitude - New attitude level
   */
  async updateAttitude(factionId: string, attitude: AttitudeLevel): Promise<void> {

    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find((f: Faction) => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      faction.attitude = attitude;
    });

  }
  
  /**
   * Adjust faction attitude by N steps (with optional constraints)
   * 
   * @param factionId - Faction ID
   * @param steps - Number of steps to adjust (+1 = improve, -1 = worsen, +2 = improve twice, etc.)
   * @param options - Optional constraints (maxLevel, minLevel)
   * @returns Result with old/new attitudes and success status
   */
  async adjustAttitude(
    factionId: string,
    steps: number,
    options?: {
      maxLevel?: AttitudeLevel;
      minLevel?: AttitudeLevel;
    }
  ): Promise<{
    success: boolean;
    oldAttitude: AttitudeLevel;
    newAttitude: AttitudeLevel | null;
    reason?: string;
  }> {
    const faction = this.getFaction(factionId);
    if (!faction) {
      return { 
        success: false, 
        oldAttitude: 'Indifferent', 
        newAttitude: null,
        reason: `Faction not found: ${factionId}`
      };
    }

    const newAttitude = adjustAttitudeBySteps(faction.attitude, steps, options);
    
    if (!newAttitude) {
      return {
        success: false,
        oldAttitude: faction.attitude,
        newAttitude: null,
        reason: `Cannot adjust attitude from ${faction.attitude} by ${steps} steps${options?.maxLevel ? ` (max: ${options.maxLevel})` : ''}${options?.minLevel ? ` (min: ${options.minLevel})` : ''}`
      };
    }

    await this.updateAttitude(factionId, newAttitude);

    return {
      success: true,
      oldAttitude: faction.attitude,
      newAttitude
    };
  }
  
  /**
   * Update faction progress clock
   * 
   * @param factionId - Faction ID
   * @param current - Current progress value
   * @param max - Optional max value (if changing the clock size)
   */
  async updateProgressClock(factionId: string, current: number, max?: number): Promise<void> {

    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find((f: Faction) => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      faction.progressClock.current = Math.max(0, current);
      
      if (max !== undefined) {
        faction.progressClock.max = Math.max(1, max);
        // Clamp current to new max
        faction.progressClock.current = Math.min(faction.progressClock.current, faction.progressClock.max);
      }
    });

  }
  
  /**
   * Increment progress clock by 1
   * 
   * @param factionId - Faction ID
   */
  async incrementProgress(factionId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const faction = kingdom.factions?.find((f: Faction) => f.id === factionId);
    if (!faction) {
      throw new Error(`Faction not found: ${factionId}`);
    }
    
    const newCurrent = Math.min(faction.progressClock.current + 1, faction.progressClock.max);
    await this.updateProgressClock(factionId, newCurrent);
  }
  
  /**
   * Decrement progress clock by 1
   * 
   * @param factionId - Faction ID
   */
  async decrementProgress(factionId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const faction = kingdom.factions?.find((f: Faction) => f.id === factionId);
    if (!faction) {
      throw new Error(`Faction not found: ${factionId}`);
    }
    
    const newCurrent = Math.max(0, faction.progressClock.current - 1);
    await this.updateProgressClock(factionId, newCurrent);
  }
  
  /**
   * Get faction by ID
   * 
   * @param factionId - Faction ID
   * @returns Faction or null if not found
   */
  getFaction(factionId: string): Faction | null {
    const actor = getKingdomActor();
    if (!actor) return null;
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) return null;
    
    return kingdom.factions?.find((f: Faction) => f.id === factionId) || null;
  }
  
  /**
   * Get all factions
   * 
   * @returns Array of all factions
   */
  getAllFactions(): Faction[] {
    const actor = getKingdomActor();
    if (!actor) return [];
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) return [];
    
    return kingdom.factions || [];
  }
  
  /**
   * Get factions by attitude level
   * 
   * @param attitude - Attitude level to filter by
   * @returns Factions with the specified attitude
   */
  getFactionsByAttitude(attitude: AttitudeLevel): Faction[] {
    return this.getAllFactions().filter((f: Faction) => f.attitude === attitude);
  }
  
  /**
   * Calculate diplomatic capacity based on structures
   * (Placeholder for future diplomatic structure integration)
   * 
   * @returns Number of Helpful relationships that can be maintained
   */
  calculateDiplomaticCapacity(): number {
    // TODO: Implement when diplomatic structures are added
    // For now, unlimited capacity
    return 999;
  }
  
  /**
   * Restore default factions from data file
   * Only adds factions that don't already exist (by ID)
   * Protects against data loss by never overwriting existing factions
   * 
   * @returns Object with added count and list of added faction names
   */
  async restoreDefaultFactions(): Promise<{ added: number; factionNames: string[] }> {

    // Load default factions from file
    const defaultFactions = await loadDefaultFactions();
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    // Get existing faction IDs
    const existingIds = new Set((kingdom.factions || []).map((f: Faction) => f.id));
    
    // Filter to only missing factions
    const missingFactions = defaultFactions.filter((f: Faction) => !existingIds.has(f.id));
    
    if (missingFactions.length === 0) {

      return { added: 0, factionNames: [] };
    }
    
    // Add missing factions
    await updateKingdom(kingdom => {
      if (!kingdom.factions) {
        kingdom.factions = [];
      }
      kingdom.factions.push(...missingFactions);
    });
    
    const addedNames = missingFactions.map((f: Faction) => f.name);

    return { 
      added: missingFactions.length, 
      factionNames: addedNames 
    };
  }
}

// Export singleton instance
export const factionService = new FactionService();
