// Faction Service for PF2e Kingdom Lite
// Manages faction CRUD operations and diplomatic relations

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import type { Faction, AttitudeLevel } from '../../models/Faction';
import { createDefaultFaction } from '../../models/Faction';

export class FactionService {
  /**
   * Create a new faction
   * 
   * @param name - Faction name
   * @param attitude - Initial attitude level
   * @returns Created faction
   */
  async createFaction(name: string, attitude: AttitudeLevel = 'Indifferent'): Promise<Faction> {
    console.log(`🤝 [FactionService] Creating faction: ${name} (${attitude})`);
    
    const faction = createDefaultFaction(name, attitude);
    
    await updateKingdom(kingdom => {
      if (!kingdom.factions) {
        kingdom.factions = [];
      }
      kingdom.factions.push(faction);
    });
    
    console.log(`✅ [FactionService] Faction created: ${name}`);
    return faction;
  }
  
  /**
   * Update faction with partial data
   * 
   * @param factionId - Faction ID
   * @param updates - Partial faction updates
   */
  async updateFaction(factionId: string, updates: Partial<Faction>): Promise<void> {
    console.log(`🤝 [FactionService] Updating faction: ${factionId}`);
    
    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find(f => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      // Apply updates
      Object.assign(faction, updates);
    });
    
    console.log(`✅ [FactionService] Faction updated`);
  }
  
  /**
   * Update faction with full detail data
   * Used by the detail view to save all fields at once
   * 
   * @param factionId - Faction ID
   * @param factionData - Complete faction data
   */
  async updateFactionDetails(factionId: string, factionData: Faction): Promise<void> {
    console.log(`🤝 [FactionService] Updating faction details: ${factionId}`);
    
    await updateKingdom(kingdom => {
      const factionIndex = kingdom.factions?.findIndex(f => f.id === factionId);
      if (factionIndex === undefined || factionIndex === -1) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      // Replace entire faction (preserving the ID)
      kingdom.factions[factionIndex] = { ...factionData, id: factionId };
    });
    
    console.log(`✅ [FactionService] Faction details updated`);
  }
  
  /**
   * Delete a faction
   * 
   * @param factionId - Faction ID to delete
   */
  async deleteFaction(factionId: string): Promise<void> {
    console.log(`🤝 [FactionService] Deleting faction: ${factionId}`);
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const faction = kingdom.factions?.find(f => f.id === factionId);
    if (!faction) {
      throw new Error(`Faction not found: ${factionId}`);
    }
    
    await updateKingdom(kingdom => {
      kingdom.factions = kingdom.factions.filter(f => f.id !== factionId);
    });
    
    console.log(`✅ [FactionService] Faction deleted: ${faction.name}`);
  }
  
  /**
   * Update faction attitude
   * 
   * @param factionId - Faction ID
   * @param attitude - New attitude level
   */
  async updateAttitude(factionId: string, attitude: AttitudeLevel): Promise<void> {
    console.log(`🤝 [FactionService] Updating attitude for ${factionId} to ${attitude}`);
    
    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find(f => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      faction.attitude = attitude;
    });
    
    console.log(`✅ [FactionService] Attitude updated to ${attitude}`);
  }
  
  /**
   * Update faction progress clock
   * 
   * @param factionId - Faction ID
   * @param current - Current progress value
   * @param max - Optional max value (if changing the clock size)
   */
  async updateProgressClock(factionId: string, current: number, max?: number): Promise<void> {
    console.log(`🤝 [FactionService] Updating progress clock for ${factionId}: ${current}${max ? `/${max}` : ''}`);
    
    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find(f => f.id === factionId);
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
    
    console.log(`✅ [FactionService] Progress clock updated`);
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
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const faction = kingdom.factions?.find(f => f.id === factionId);
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
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    const faction = kingdom.factions?.find(f => f.id === factionId);
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
    
    const kingdom = actor.getKingdom();
    if (!kingdom) return null;
    
    return kingdom.factions?.find(f => f.id === factionId) || null;
  }
  
  /**
   * Get all factions
   * 
   * @returns Array of all factions
   */
  getAllFactions(): Faction[] {
    const actor = getKingdomActor();
    if (!actor) return [];
    
    const kingdom = actor.getKingdom();
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
    return this.getAllFactions().filter(f => f.attitude === attitude);
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
}

// Export singleton instance
export const factionService = new FactionService();
