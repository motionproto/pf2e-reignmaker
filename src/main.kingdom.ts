/**
 * Kingdom Management System - Foundry-First Architecture
 * Replaces complex store-based system with simple Foundry actor integration
 */

import { KingdomActor } from './actors/KingdomActor';
import { initializeKingdomSync } from './hooks/kingdomSync';
import { registerArmyActorHooks } from './hooks/armyActorHooks';
import { registerDebugUtils } from './debug/armyMovement';
import { registerHexCenterTestUtils } from './debug/hex-center-test';
import { initializeHexInspector } from './debug/hex-inspector';

declare const Hooks: any;
declare const CONFIG: any;

/**
 * Initialize the kingdom management system
 * Call this from your main module initialization
 */
export function initializeKingdomSystem(): void {
  // Register the KingdomActor class with Foundry
  registerKingdomActor();
  
  // Initialize synchronization hooks
  initializeKingdomSync();
  
  // Register army actor deletion hooks
  registerArmyActorHooks();
  
  // Register debug utilities immediately (no hook needed - already in ready hook)
  try {
    registerDebugUtils();
    registerHexCenterTestUtils();
    initializeHexInspector();
  } catch (error) {
    console.error('[Kingdom System] Failed to register debug utilities:', error);
  }
}

/**
 * Register KingdomActor with Foundry's actor system
 */
function registerKingdomActor(): void {
  // Extend Foundry's Actor class
  if (typeof CONFIG !== 'undefined' && CONFIG.Actor) {
    // Add our KingdomActor to the registry if needed
  }
}

/**
 * Utility function to get kingdom actor from any context
 */
export async function getKingdomActor(): Promise<KingdomActor | null> {
  const { getCurrentKingdomActor } = await import('./hooks/kingdomSync');
  return getCurrentKingdomActor() as KingdomActor | null;
}

/**
 * Utility function to ensure kingdom actor exists
 */
export async function ensureKingdomActor(): Promise<KingdomActor | null> {
  const { ensureKingdomActor: syncEnsureKingdomActor } = await import('./hooks/kingdomSync');
  return (await syncEnsureKingdomActor()) as KingdomActor | null;
}

/**
 * Quick access functions for common operations
 */


export async function modifyResource(resource: string, amount: number): Promise<void> {
  const actor = await getKingdomActor();
  if (actor) {
    await actor.modifyResource(resource, amount);
  }
}


// Re-export key types and classes
export { KingdomActor } from './actors/KingdomActor';
export type { KingdomData } from './actors/KingdomActor';
export * from './stores/KingdomStore';
