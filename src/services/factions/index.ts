// Faction Service for PF2e Kingdom Lite
// Manages faction CRUD operations and diplomatic relations

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import type { Faction, AttitudeLevel } from '../../models/Faction';
import { createDefaultFaction } from '../../models/Faction';
import { loadDefaultFactions } from '../../models/DefaultFactions';
import { logger } from '../../utils/Logger';

export class FactionService {
  /**
   * Create a new faction
   * 
   * @param name - Faction name
   * @param attitude - Initial attitude level
   * @returns Created faction
   */
  async createFaction(name: string, attitude: AttitudeLevel = 'Indifferent'): Promise<Faction> {
    logger.debug(`🤝 [FactionService] Creating faction: ${name} (${attitude})`);
    
    const faction = createDefaultFaction(name, attitude);
    
    await updateKingdom(kingdom => {
      if (!kingdom.factions) {
        kingdom.factions = [];
      }
      kingdom.factions.push(faction);
    });
    
    logger.debug(`✅ [FactionService] Faction created: ${name}`);
    return faction;
  }
  
  /**
   * Update faction with partial data
   * 
   * @param factionId - Faction ID
   * @param updates - Partial faction updates
   */
  async updateFaction(factionId: string, updates: Partial<Faction>): Promise<void> {
    logger.debug(`🤝 [FactionService] Updating faction: ${factionId}`);
    
    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find(f => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      // Apply updates
      Object.assign(faction, updates);
    });
    
    logger.debug(`✅ [FactionService] Faction updated`);
  }
  
  /**
   * Update faction with full detail data
   * Used by the detail view to save all fields at once
   * 
   * @param factionId - Faction ID
   * @param factionData - Complete faction data
   */
  async updateFactionDetails(factionId: string, factionData: Faction): Promise<void> {
    logger.debug(`🤝 [FactionService] Updating faction details: ${factionId}`);
    
    await updateKingdom(kingdom => {
      const factionIndex = kingdom.factions?.findIndex(f => f.id === factionId);
      if (factionIndex === undefined || factionIndex === -1) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      // Replace entire faction (preserving the ID)
      kingdom.factions[factionIndex] = { ...factionData, id: factionId };
    });
    
    logger.debug(`✅ [FactionService] Faction details updated`);
  }
  
  /**
   * Delete a faction
   * 
   * @param factionId - Faction ID to delete
   */
  async deleteFaction(factionId: string): Promise<void> {
    logger.debug(`🤝 [FactionService] Deleting faction: ${factionId}`);
    
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
    
    logger.debug(`✅ [FactionService] Faction deleted: ${faction.name}`);
  }
  
  /**
   * Update faction attitude
   * 
   * @param factionId - Faction ID
   * @param attitude - New attitude level
   */
  async updateAttitude(factionId: string, attitude: AttitudeLevel): Promise<void> {
    logger.debug(`🤝 [FactionService] Updating attitude for ${factionId} to ${attitude}`);
    
    await updateKingdom(kingdom => {
      const faction = kingdom.factions?.find(f => f.id === factionId);
      if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
      }
      
      faction.attitude = attitude;
    });
    
    logger.debug(`✅ [FactionService] Attitude updated to ${attitude}`);
  }
  
  /**
   * Update faction progress clock
   * 
   * @param factionId - Faction ID
   * @param current - Current progress value
   * @param max - Optional max value (if changing the clock size)
   */
  async updateProgressClock(factionId: string, current: number, max?: number): Promise<void> {
    logger.debug(`🤝 [FactionService] Updating progress clock for ${factionId}: ${current}${max ? `/${max}` : ''}`);
    
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
    
    logger.debug(`✅ [FactionService] Progress clock updated`);
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
  
  /**
   * Restore default factions from data file
   * Only adds factions that don't already exist (by ID)
   * Protects against data loss by never overwriting existing factions
   * 
   * @returns Object with added count and list of added faction names
   */
  async restoreDefaultFactions(): Promise<{ added: number; factionNames: string[] }> {
    logger.debug('🤝 [FactionService] Restoring default factions');
    
    // Load default factions from file
    const defaultFactions = await loadDefaultFactions();
    
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('No kingdom actor available');
    }
    
    const kingdom = actor.getKingdom();
    if (!kingdom) {
      throw new Error('No kingdom data available');
    }
    
    // Get existing faction IDs
    const existingIds = new Set((kingdom.factions || []).map(f => f.id));
    
    // Filter to only missing factions
    const missingFactions = defaultFactions.filter(f => !existingIds.has(f.id));
    
    if (missingFactions.length === 0) {
      logger.debug('✅ [FactionService] All default factions already exist');
      return { added: 0, factionNames: [] };
    }
    
    // Add missing factions
    await updateKingdom(kingdom => {
      if (!kingdom.factions) {
        kingdom.factions = [];
      }
      kingdom.factions.push(...missingFactions);
    });
    
    const addedNames = missingFactions.map(f => f.name);
    logger.debug(`✅ [FactionService] Added ${missingFactions.length} default factions: ${addedNames.join(', ')}`);
    
    return { 
      added: missingFactions.length, 
      factionNames: addedNames 
    };
  }
}

// Export singleton instance
export const factionService = new FactionService();
