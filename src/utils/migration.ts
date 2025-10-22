/**
 * Migration utilities for transitioning from store-based to Foundry-first architecture
 */

import type { KingdomActor, KingdomData } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';

declare const game: any;
declare const ui: any;

/**
 * Migrate from old KingdomState format to new KingdomData format
 */
export function migrateKingdomState(oldState: any): KingdomData {
  const newKingdom = createDefaultKingdom();
  
  try {
    // Copy basic fields
    if (oldState.currentTurn) newKingdom.currentTurn = oldState.currentTurn;
    if (oldState.currentPhase) newKingdom.currentPhase = oldState.currentPhase;
    if (oldState.unrest !== undefined) newKingdom.unrest = oldState.unrest;
    if (oldState.fame !== undefined) newKingdom.fame = oldState.fame;
    if (oldState.size !== undefined) newKingdom.size = oldState.size;
    if (oldState.isAtWar !== undefined) newKingdom.isAtWar = oldState.isAtWar;
    if (oldState.eventDC !== undefined) newKingdom.eventDC = oldState.eventDC;
    
    // Convert Maps to objects
    if (oldState.resources instanceof Map) {
      newKingdom.resources = Object.fromEntries(oldState.resources);
    } else if (oldState.resources && typeof oldState.resources === 'object') {
      newKingdom.resources = { ...oldState.resources };
    }
    
    if (oldState.worksiteCount instanceof Map) {
      newKingdom.worksiteCount = Object.fromEntries(oldState.worksiteCount);
    } else if (oldState.worksiteCount && typeof oldState.worksiteCount === 'object') {
      newKingdom.worksiteCount = { ...oldState.worksiteCount };
    }
    
    if (oldState.cachedProduction instanceof Map) {
      newKingdom.cachedProduction = Object.fromEntries(oldState.cachedProduction);
    } else if (oldState.cachedProduction && typeof oldState.cachedProduction === 'object') {
      newKingdom.cachedProduction = { ...oldState.cachedProduction };
    }
    
    // Convert phase tracking
    if (oldState.phaseStepsCompleted instanceof Map) {
      newKingdom.phaseStepsCompleted = Object.fromEntries(oldState.phaseStepsCompleted);
    } else if (oldState.phaseStepsCompleted && typeof oldState.phaseStepsCompleted === 'object') {
      newKingdom.phaseStepsCompleted = { ...oldState.phaseStepsCompleted };
    }
    
    if (oldState.phasesCompleted instanceof Set) {
      newKingdom.phasesCompleted = Array.from(oldState.phasesCompleted);
    } else if (Array.isArray(oldState.phasesCompleted)) {
      newKingdom.phasesCompleted = [...oldState.phasesCompleted];
    }
    
    if (oldState.oncePerTurnActions instanceof Set) {
      newKingdom.oncePerTurnActions = Array.from(oldState.oncePerTurnActions);
    } else if (Array.isArray(oldState.oncePerTurnActions)) {
      newKingdom.oncePerTurnActions = [...oldState.oncePerTurnActions];
    }
    
    // Convert player actions
    if (oldState.playerActions instanceof Map) {
      newKingdom.playerActions = Object.fromEntries(oldState.playerActions);
    } else if (oldState.playerActions && typeof oldState.playerActions === 'object') {
      newKingdom.playerActions = { ...oldState.playerActions };
    }
    
    // Copy arrays
    if (Array.isArray(oldState.hexes)) {
      newKingdom.hexes = oldState.hexes.map((hex: any) => ({
        id: hex.id,
        terrain: hex.terrain,
        worksite: hex.worksite ? { type: hex.worksite.type } : null,
        hasSpecialTrait: hex.hasSpecialTrait,
        name: hex.name
      }));
    }
    
    if (Array.isArray(oldState.settlements)) {
      newKingdom.settlements = [...oldState.settlements];
    }
    
    if (Array.isArray(oldState.armies)) {
      newKingdom.armies = [...oldState.armies];
    }
    
    if (Array.isArray(oldState.buildQueue)) {
      newKingdom.buildQueue = [...oldState.buildQueue];
    }
    
    if (Array.isArray(oldState.ongoingEvents)) {
      newKingdom.ongoingEvents = [...oldState.ongoingEvents];
    }
    
    if (Array.isArray(oldState.modifiers)) {
      newKingdom.modifiers = [...oldState.modifiers];
    }
    
    // Copy event data
    if (oldState.currentEvent) {
      newKingdom.currentEvent = oldState.currentEvent;
    }
    
    // Copy event tracking fields
    if (oldState.currentEventId !== undefined) newKingdom.currentEventId = oldState.currentEventId;
    if (oldState.currentIncidentId !== undefined) newKingdom.currentIncidentId = oldState.currentIncidentId;
    if (oldState.incidentRoll !== undefined) newKingdom.incidentRoll = oldState.incidentRoll;
    if (oldState.eventStabilityRoll !== undefined) newKingdom.eventStabilityRoll = oldState.eventStabilityRoll;
    if (oldState.eventRollDC !== undefined) newKingdom.eventRollDC = oldState.eventRollDC;
    if (oldState.eventTriggered !== undefined) newKingdom.eventTriggered = oldState.eventTriggered;
    
    console.log('[Migration] Successfully migrated kingdom state');
    return newKingdom;
    
  } catch (error) {
    console.error('[Migration] Error migrating kingdom state:', error);
    return newKingdom; // Return default if migration fails
  }
}

/**
 * Check if migration is needed by looking for old persistence data
 */
export async function checkMigrationNeeded(): Promise<boolean> {
  try {
    // Check for old persistence service data
    const partyActor = game.actors?.find((a: any) => a.type === 'party');
    if (partyActor) {
      const oldData = partyActor.getFlag('pf2e-reignmaker', 'kingdom-data');
      if (oldData && oldData.kingdomState) {
        return true; // Old format detected
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Migration] Error checking migration status:', error);
    return false;
  }
}

/**
 * Perform migration from old system to new system
 */
export async function performMigration(): Promise<boolean> {
  try {
    const partyActor = game.actors?.find((a: any) => a.type === 'party');
    if (!partyActor) {
      console.log('[Migration] No party actor found, skipping migration');
      return false;
    }
    
    const oldData = partyActor.getFlag('pf2e-reignmaker', 'kingdom-data');
    if (!oldData || !oldData.kingdomState) {
      console.log('[Migration] No old data found, skipping migration');
      return false;
    }
    
    console.log('[Migration] Starting migration from old format...');
    
    // Migrate the kingdom state
    const migratedKingdom = migrateKingdomState(oldData.kingdomState);
    
    // Find or create kingdom actor
    const { ensureKingdomActor } = await import('../hooks/kingdomSync');
    const kingdomActor = await ensureKingdomActor() as KingdomActor;
    
    if (!kingdomActor) {
      console.error('[Migration] Failed to create kingdom actor');
      return false;
    }
    
    // Set the migrated data
    await kingdomActor.setKingdomData(migratedKingdom);
    
    // Clear old data (backup first)
    await partyActor.setFlag('pf2e-reignmaker', 'kingdom-data-backup', oldData);
    await partyActor.unsetFlag('pf2e-reignmaker', 'kingdom-data');
    
    console.log('[Migration] Migration completed successfully');
    
    // Notify user
    if (typeof ui !== 'undefined' && ui.notifications) {
      ui.notifications.info('Kingdom data migrated to new format successfully!');
    }
    
    return true;
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    
    if (typeof ui !== 'undefined' && ui.notifications) {
      ui.notifications.error('Kingdom data migration failed. Please check console for details.');
    }
    
    return false;
  }
}
