/**
 * Execution Functions Index
 *
 * Simple execution functions extracted from prepare/commit and immediate-execute patterns.
 * Preview logic has been moved to pipeline configurations.
 * Global variables have been eliminated (replaced with CheckContext.metadata).
 */

// Army Commands
export { recruitArmyExecution } from './armies/recruitArmy';
export { disbandArmyExecution } from './armies/disbandArmy';
export { trainArmyExecution } from './armies/trainArmy';
export { deployArmyExecution } from './armies/deployArmy';

// Settlement Commands
export { foundSettlementExecution } from './settlements/foundSettlement';

// Resource Commands
export { giveActorGoldExecution } from './resources/giveActorGold';

// Unrest Commands
export { releaseImprisonedExecution } from './unrest/releaseImprisoned';
export { reduceImprisonedExecution } from './unrest/reduceImprisoned';

// Structure Commands
export { damageStructureExecution } from './structures/damageStructure';
export { destroyStructureExecution } from './structures/destroyStructure';

// Faction Commands
export { adjustFactionAttitudeExecution } from './factions/adjustFactionAttitude';

// Territory Commands
export { claimHexesExecution } from './territory/claimHexes';
