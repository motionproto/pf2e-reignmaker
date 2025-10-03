/**
 * Structured Game Effects System
 * 
 * Represents non-resource gameplay effects from actions
 * (territory expansion, construction, military operations, etc.)
 */

/**
 * All possible game effect types
 */
export type GameEffectType =
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
  | 'grantReroll';

/**
 * Proficiency scaling for effects
 */
export interface ProficiencyScaling {
  trained: number;
  expert: number;
  master: number;
  legendary: number;
}

/**
 * Base game effect interface
 */
export interface BaseGameEffect {
  type: GameEffectType;
}

/**
 * Claim hexes effect
 */
export interface ClaimHexesEffect extends BaseGameEffect {
  type: 'claimHexes';
  count: number | 'proficiency-scaled';
  scaling?: ProficiencyScaling;
  bonus?: number; // Extra hexes beyond base
}

/**
 * Build roads effect
 */
export interface BuildRoadsEffect extends BaseGameEffect {
  type: 'buildRoads';
  hexCount: number | 'standard';
  bonus?: number;
}

/**
 * Found settlement effect
 */
export interface FoundSettlementEffect extends BaseGameEffect {
  type: 'foundSettlement';
  tier: 'village' | 'town' | 'city';
}

/**
 * Upgrade settlement effect
 */
export interface UpgradeSettlementEffect extends BaseGameEffect {
  type: 'upgradeSettlement';
  structureBonus?: number; // Free structures on upgrade
}

/**
 * Build structure effect
 */
export interface BuildStructureEffect extends BaseGameEffect {
  type: 'buildStructure';
  count: number;
  costReduction?: number; // Percentage (50 = 50% off)
}

/**
 * Repair structure effect
 */
export interface RepairStructureEffect extends BaseGameEffect {
  type: 'repairStructure';
  targetStructure: 'damaged' | 'specific';
}

/**
 * Create worksite effect
 */
export interface CreateWorksiteEffect extends BaseGameEffect {
  type: 'createWorksite';
  worksiteType: 'farm' | 'mine' | 'quarry' | 'lumbermill';
  immediateResource?: boolean; // Get resource immediately on crit success
}

/**
 * Army effects
 */
export interface RecruitArmyEffect extends BaseGameEffect {
  type: 'recruitArmy';
  level: number | 'kingdom-level';
}

export interface TrainArmyEffect extends BaseGameEffect {
  type: 'trainArmy';
  levelIncrease: number;
}

export interface DeployArmyEffect extends BaseGameEffect {
  type: 'deployArmy';
  targetArmy: string; // Army identifier
}

export interface OutfitArmyEffect extends BaseGameEffect {
  type: 'outfitArmy';
  targetArmy: string;
}

export interface RecoverArmyEffect extends BaseGameEffect {
  type: 'recoverArmy';
  targetArmy: string;
}

export interface DisbandArmyEffect extends BaseGameEffect {
  type: 'disbandArmy';
  targetArmy: string;
}

/**
 * Diplomatic effects
 */
export interface EstablishDiplomaticRelationsEffect extends BaseGameEffect {
  type: 'establishDiplomaticRelations';
  targetNation: string;
}

export interface RequestEconomicAidEffect extends BaseGameEffect {
  type: 'requestEconomicAid';
  resourceType: 'gold' | 'food' | 'resources';
}

export interface RequestMilitaryAidEffect extends BaseGameEffect {
  type: 'requestMilitaryAid';
}

/**
 * Event management effects
 */
export interface ResolveEventEffect extends BaseGameEffect {
  type: 'resolveEvent';
  eventId?: string; // Specific event or player choice
  bonus?: number; // Circumstance bonus to resolution check
}

export interface HireAdventurersEffect extends BaseGameEffect {
  type: 'hireAdventurers';
  mode: 'resolve-event' | 'bonus-to-event';
  bonus?: number;
}

/**
 * Unrest management effects
 */
export interface ArrestDissidentsEffect extends BaseGameEffect {
  type: 'arrestDissidents';
  unrestToImprison: number | 'dice'; // Converts unrest to imprisoned
  dice?: string; // e.g., '1d4'
}

export interface ExecutePrisonersEffect extends BaseGameEffect {
  type: 'executePrisoners';
  removeAllImprisoned?: boolean;
  removeAmount?: number | 'dice';
  dice?: string;
}

export interface PardonPrisonersEffect extends BaseGameEffect {
  type: 'pardonPrisoners';
  removeAllImprisoned?: boolean;
  removeAmount?: number | 'dice';
  dice?: string;
}

/**
 * Support & bonus effects
 */
export interface AidBonusEffect extends BaseGameEffect {
  type: 'aidBonus';
  target: 'other-pc';
  bonusType: 'circumstance' | 'proficiency-scaled';
  value: number | ProficiencyScaling;
  allowReroll?: boolean;
}

export interface GrantRerollEffect extends BaseGameEffect {
  type: 'grantReroll';
  condition: 'on-failure' | 'always';
}

/**
 * Special operations
 */
export interface InfiltrationEffect extends BaseGameEffect {
  type: 'infiltration';
  targetNation: string;
}

export interface SendScoutsEffect extends BaseGameEffect {
  type: 'sendScouts';
  purpose: 'exploration' | 'intelligence';
}

export interface FortifyHexEffect extends BaseGameEffect {
  type: 'fortifyHex';
  targetHex: string;
}

/**
 * Union type of all game effects
 */
export type GameEffect =
  | ClaimHexesEffect
  | BuildRoadsEffect
  | FoundSettlementEffect
  | UpgradeSettlementEffect
  | BuildStructureEffect
  | RepairStructureEffect
  | CreateWorksiteEffect
  | RecruitArmyEffect
  | TrainArmyEffect
  | DeployArmyEffect
  | OutfitArmyEffect
  | RecoverArmyEffect
  | DisbandArmyEffect
  | EstablishDiplomaticRelationsEffect
  | RequestEconomicAidEffect
  | RequestMilitaryAidEffect
  | ResolveEventEffect
  | HireAdventurersEffect
  | ArrestDissidentsEffect
  | ExecutePrisonersEffect
  | PardonPrisonersEffect
  | AidBonusEffect
  | GrantRerollEffect
  | InfiltrationEffect
  | SendScoutsEffect
  | FortifyHexEffect;
