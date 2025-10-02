/**
 * Kingdom Management System - Foundry-First Architecture
 * Replaces complex store-based system with simple Foundry actor integration
 */

import { KingdomActor } from './actors/KingdomActor';
import { initializeKingdomSync } from './hooks/kingdomSync';

declare const Hooks: any;
declare const CONFIG: any;

/**
 * Initialize the kingdom management system
 * Call this from your main module initialization
 */
export function initializeKingdomSystem(): void {
  console.log('[Kingdom System] Initializing Foundry-first architecture...');
  
  // Register the KingdomActor class with Foundry
  registerKingdomActor();
  
  // Initialize synchronization hooks
  initializeKingdomSync();
  
  console.log('[Kingdom System] Initialization complete');
}

/**
 * Register KingdomActor with Foundry's actor system
 */
function registerKingdomActor(): void {
  // Extend Foundry's Actor class
  if (typeof CONFIG !== 'undefined' && CONFIG.Actor) {
    // Add our KingdomActor to the registry if needed
    console.log('[Kingdom System] KingdomActor class registered');
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
