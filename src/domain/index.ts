/**
 * Domain Layer - Pure Game Logic
 * 
 * This module contains pure functions that implement game rules without
 * any Foundry VTT dependencies. These functions can be used by:
 * - Production code (via execution modules)
 * - Simulation/testing (directly)
 * 
 * Key principles:
 * - All functions are pure: same inputs = same outputs
 * - No side effects (no UI, no network, no file I/O)
 * - No Foundry dependencies (no game, no foundry, no ui)
 * - Mutations are explicit: functions modify data passed to them
 */

// Territory operations
export * from './territory/claimHexesLogic';
export * from './territory/exploreLogic';
export * from './territory/worksiteLogic';
export * from './territory/adjacencyLogic';

// Resource operations
export * from './resources/collectionLogic';
export * from './resources/decayLogic';

// Check/roll operations
export * from './checks/outcomeLogic';
export * from './checks/dcLogic';

// Unrest operations
export * from './unrest/unrestLogic';
export * from './unrest/incidentLogic';

// Settlement operations
export * from './settlements/feedingLogic';
export * from './settlements/tierLogic';

// Structure operations
export * from './structures/capacityLogic';
export * from './structures/effectsLogic';

