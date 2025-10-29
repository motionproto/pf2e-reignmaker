/**
 * Structured Game Commands System
 * 
 * Represents non-resource gameplay commands from actions
 * (territory expansion, construction, military operations, etc.)
 */

/**
 * All possible game command types
 */
export type GameCommandType =
  // Territory & Expansion
  | 'claimHexes'
  | 'fortifyHex'
  | 'buildRoads'
  
  // Settlement & Construction
  | 'foundSettlement'
  | 'upgradeSettlement'
  | 'buildStructure'
  | 'repairStructure'
  | 'createWorksite'
  
  // Military Operations
  | 'recruitArmy'
  | 'trainArmy'
  | 'deployArmy'
  | 'outfitArmy'
  | 'recoverArmy'
  | 'disbandArmy'
  
  // Diplomatic & Special
  | 'establishDiplomaticRelations'
  | 'requestEconomicAid'
  | 'requestMilitaryAid'
  | 'infiltration'
  | 'sendScouts'
  
  // Event & Unrest Management
  | 'resolveEvent'
  | 'hireAdventurers'
  | 'arrestDissidents'
  | 'executePrisoners'
  | 'pardonPrisoners'
  
  // Support & Bonuses
  | 'aidBonus'
  | 'grantReroll'
  
  // Personal Actions
  | 'giveActorGold'
  
  // Structure Management
  | 'damageStructure';

/**
 * Proficiency scaling for commands
 */
export interface ProficiencyScaling {
  trained: number;
  expert: number;
  master: number;
  legendary: number;
}

/**
 * Base game command interface
 */
export interface BaseGameCommand {
  type: GameCommandType;
}

/**
 * Claim hexes command
 */
export interface ClaimHexesCommand extends BaseGameCommand {
  type: 'claimHexes';
  count: number | 'proficiency-scaled';
  scaling?: ProficiencyScaling;
  bonus?: number; // Extra hexes beyond base
}

/**
 * Build roads command
 */
export interface BuildRoadsCommand extends BaseGameCommand {
  type: 'buildRoads';
  hexCount: number | 'standard';
  bonus?: number;
}

/**
 * Found settlement command
 */
export interface FoundSettlementCommand extends BaseGameCommand {
  type: 'foundSettlement';
  tier: 'village' | 'town' | 'city';
}

/**
 * Upgrade settlement command
 */
export interface UpgradeSettlementCommand extends BaseGameCommand {
  type: 'upgradeSettlement';
  structureBonus?: number; // Free structures on upgrade
}

/**
 * Build structure command
 */
export interface BuildStructureCommand extends BaseGameCommand {
  type: 'buildStructure';
  count: number;
  costReduction?: number; // Percentage (50 = 50% off)
}

/**
 * Repair structure command
 */
export interface RepairStructureCommand extends BaseGameCommand {
  type: 'repairStructure';
  targetStructure: 'damaged' | 'specific';
}

/**
 * Create worksite command
 */
export interface CreateWorksiteCommand extends BaseGameCommand {
  type: 'createWorksite';
  worksiteType: 'farm' | 'mine' | 'quarry' | 'lumbermill';
  immediateResource?: boolean; // Get resource immediately on crit success
}

/**
 * Army commands
 */
export interface RecruitArmyCommand extends BaseGameCommand {
  type: 'recruitArmy';
  level: number | 'kingdom-level';
}

export interface TrainArmyCommand extends BaseGameCommand {
  type: 'trainArmy';
  levelIncrease: number;
}

export interface DeployArmyCommand extends BaseGameCommand {
  type: 'deployArmy';
  targetArmy: string; // Army identifier
}

export interface OutfitArmyCommand extends BaseGameCommand {
  type: 'outfitArmy';
  targetArmy: string;
}

export interface RecoverArmyCommand extends BaseGameCommand {
  type: 'recoverArmy';
  targetArmy: string;
}

export interface DisbandArmyCommand extends BaseGameCommand {
  type: 'disbandArmy';
  targetArmy: string;
}

/**
 * Diplomatic commands
 */
export interface EstablishDiplomaticRelationsCommand extends BaseGameCommand {
  type: 'establishDiplomaticRelations';
  targetNation: string;
}

export interface RequestEconomicAidCommand extends BaseGameCommand {
  type: 'requestEconomicAid';
  resourceType: 'gold' | 'food' | 'resources';
}

export interface RequestMilitaryAidCommand extends BaseGameCommand {
  type: 'requestMilitaryAid';
}

/**
 * Event management commands
 */
export interface ResolveEventCommand extends BaseGameCommand {
  type: 'resolveEvent';
  eventId?: string; // Specific event or player choice
  bonus?: number; // Circumstance bonus to resolution check
}

export interface HireAdventurersCommand extends BaseGameCommand {
  type: 'hireAdventurers';
  mode: 'resolve-event' | 'bonus-to-event';
  bonus?: number;
}

/**
 * Unrest management commands
 */
export interface ArrestDissidentsCommand extends BaseGameCommand {
  type: 'arrestDissidents';
  unrestToImprison: number | 'dice'; // Converts unrest to imprisoned
  dice?: string; // e.g., '1d4'
}

export interface ExecutePrisonersCommand extends BaseGameCommand {
  type: 'executePrisoners';
  removeAllImprisoned?: boolean;
  removeAmount?: number | 'dice';
  dice?: string;
}

export interface PardonPrisonersCommand extends BaseGameCommand {
  type: 'pardonPrisoners';
  removeAllImprisoned?: boolean;
  removeAmount?: number | 'dice';
  dice?: string;
}

/**
 * Support & bonus commands
 */
export interface AidBonusCommand extends BaseGameCommand {
  type: 'aidBonus';
  target: 'other-pc';
  bonusType: 'circumstance' | 'proficiency-scaled';
  value: number | ProficiencyScaling;
  allowReroll?: boolean;
}

export interface GrantRerollCommand extends BaseGameCommand {
  type: 'grantReroll';
  condition: 'on-failure' | 'always';
}

/**
 * Give gold to actor command (personal stipend)
 */
export interface GiveActorGoldCommand extends BaseGameCommand {
  type: 'giveActorGold';
  multiplier: number; // Income multiplier (2 = double, 1 = normal, 0.5 = half)
  settlementId?: string; // Settlement to calculate income from (from pending action state)
}

/**
 * Damage structure command
 */
export interface DamageStructureCommand extends BaseGameCommand {
  type: 'damageStructure';
  targetStructure?: string; // Specific structure ID or player choice
  settlementId?: string; // Optional settlement filter
  count?: number; // Number of structures to damage (default: 1)
}

/**
 * Special operations
 */
export interface InfiltrationCommand extends BaseGameCommand {
  type: 'infiltration';
  targetNation: string;
}

export interface SendScoutsCommand extends BaseGameCommand {
  type: 'sendScouts';
  purpose: 'exploration' | 'intelligence';
}

export interface FortifyHexCommand extends BaseGameCommand {
  type: 'fortifyHex';
  targetHex: string;
}

/**
 * Union type of all game commands
 */
export type GameCommand =
  | ClaimHexesCommand
  | BuildRoadsCommand
  | FoundSettlementCommand
  | UpgradeSettlementCommand
  | BuildStructureCommand
  | RepairStructureCommand
  | CreateWorksiteCommand
  | RecruitArmyCommand
  | TrainArmyCommand
  | DeployArmyCommand
  | OutfitArmyCommand
  | RecoverArmyCommand
  | DisbandArmyCommand
  | EstablishDiplomaticRelationsCommand
  | RequestEconomicAidCommand
  | RequestMilitaryAidCommand
  | ResolveEventCommand
  | HireAdventurersCommand
  | ArrestDissidentsCommand
  | ExecutePrisonersCommand
  | PardonPrisonersCommand
  | AidBonusCommand
  | GrantRerollCommand
  | GiveActorGoldCommand
  | InfiltrationCommand
  | SendScoutsCommand
  | FortifyHexCommand
  | DamageStructureCommand;
