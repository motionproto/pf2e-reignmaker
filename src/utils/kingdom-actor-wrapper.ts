/**
 * Kingdom Actor Wrapper Utility
 * 
 * This module provides functions to wrap Foundry party actors with kingdom-specific methods.
 * Since we store kingdom data on party actor flags (not a custom actor class), we need to
 * add our custom methods at runtime.
 * 
 * Usage:
 *   const actor = findPartyActor();
 *   const wrappedActor = wrapKingdomActor(actor);
 *   const data = wrappedActor.getKingdomData();
 */

import type { KingdomData } from '../actors/KingdomActor';
import { createDefaultKingdom } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';

const MODULE_ID = 'pf2e-reignmaker';
const KINGDOM_DATA_KEY = 'kingdom-data';

/**
 * Wraps a party actor with kingdom-specific methods
 * This allows us to use actor.getKingdomData() on regular Foundry actors
 * 
 * @param actor - The Foundry party actor to wrap
 * @returns The same actor with kingdom methods added
 */
export function wrapKingdomActor(actor: any): any {
  // Check if already wrapped (avoid double-wrapping)
  if (actor._kingdomWrapped) {
    return actor;
  }
  
  // Add getKingdomData method
  actor.getKingdomData = function(): KingdomData | null {
    return this.getFlag(MODULE_ID, KINGDOM_DATA_KEY) as KingdomData || null;
  };
  
  // Add setKingdomData method
  actor.setKingdomData = async function(kingdom: KingdomData): Promise<void> {
    await this.setFlag(MODULE_ID, KINGDOM_DATA_KEY, kingdom);
  };
  
  // Add updateKingdomData method
  actor.updateKingdomData = async function(updater: (kingdom: KingdomData) => void): Promise<void> {
    const kingdom = this.getKingdomData();
    if (!kingdom) {
      logger.warn('[KingdomActor] No kingdom data found, cannot update');
      return;
    }
    updater(kingdom);
    await this.setKingdomData(kingdom);
  };
  
  // Add initializeKingdom method
  actor.initializeKingdom = async function(name: string = 'New Kingdom'): Promise<void> {
    const defaultKingdom = createDefaultKingdom(name);
    await this.setKingdomData(defaultKingdom);
  };
  
  // Add isCurrentPhaseComplete method
  actor.isCurrentPhaseComplete = function(): boolean {
    const kingdom = this.getKingdomData();
    if (!kingdom) return false;
    return kingdom.phaseComplete || false;
  };
  
  // Add modifyResource method
  actor.modifyResource = async function(resource: string, amount: number): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      const current = kingdom.resources[resource] || 0;
      kingdom.resources[resource] = Math.max(0, current + amount);
    });
  };
  
  // Add setResource method
  actor.setResource = async function(resource: string, amount: number): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      kingdom.resources[resource] = Math.max(0, amount);
    });
  };
  
  // Add addSettlement method
  actor.addSettlement = async function(settlement: any): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      kingdom.settlements.push(settlement);
    });
  };
  
  // Add removeSettlement method
  actor.removeSettlement = async function(settlementId: string): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      kingdom.settlements = kingdom.settlements.filter((s: any) => s.id !== settlementId);
    });
  };
  
  // Add updateSettlement method
  actor.updateSettlement = async function(settlementId: string, updates: any): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      const index = kingdom.settlements.findIndex((s: any) => s.id === settlementId);
      if (index >= 0) {
        kingdom.settlements[index] = { ...kingdom.settlements[index], ...updates };
      }
    });
  };
  
  // Add addArmy method
  actor.addArmy = async function(army: any): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      kingdom.armies.push(army);
    });
  };
  
  // Add removeArmy method
  actor.removeArmy = async function(armyId: string): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      kingdom.armies = kingdom.armies.filter((a: any) => a.id !== armyId);
    });
  };
  
  // Add addActiveModifier method
  actor.addActiveModifier = async function(modifier: any): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
      kingdom.activeModifiers.push(modifier);
    });
  };
  
  // Add removeActiveModifier method
  actor.removeActiveModifier = async function(modifierId: string): Promise<void> {
    await this.updateKingdomData((kingdom: KingdomData) => {
      if (!kingdom.activeModifiers) return;
      kingdom.activeModifiers = kingdom.activeModifiers.filter((m: any) => m.id !== modifierId);
    });
  };
  
  // Mark as wrapped
  actor._kingdomWrapped = true;
  
  return actor;
}

/**
 * Standalone utility functions for accessing kingdom data
 * These can be used when you don't need the full actor wrapper
 */

export function getKingdomData(actor: any): KingdomData | null {
  if (!actor) return null;
  return actor.getFlag(MODULE_ID, KINGDOM_DATA_KEY) as KingdomData || null;
}

export async function setKingdomData(actor: any, data: KingdomData): Promise<void> {
  if (!actor) return;
  await actor.setFlag(MODULE_ID, KINGDOM_DATA_KEY, data);
}

export async function updateKingdomData(
  actor: any,
  updater: (kingdom: KingdomData) => void
): Promise<void> {
  if (!actor) return;
  
  const kingdom = getKingdomData(actor);
  if (!kingdom) {
    logger.warn('[Kingdom Data] No kingdom data found on actor');
    return;
  }
  
  updater(kingdom);
  await setKingdomData(actor, kingdom);
}
