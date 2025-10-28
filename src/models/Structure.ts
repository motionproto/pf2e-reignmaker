// Structure model for PF2e Kingdom Lite
// Based on Reignmaker Lite rules

/**
 * Structure family representation for consolidated JSON format
 */
export interface StructureFamily {
  type: 'skill' | 'support';
  family: string;
  category: string;  // Kebab-case category identifier
  description: string;
  skills?: string[];  // Only for skill structures
  tiers: any[]; // Array of raw structure data (will be parsed into Structure objects)
}

/**
 * Structure types - matches JSON data
 */
export type StructureType = 'skill' | 'support';

/**
 * Structure categories
 */
export enum StructureCategory {
  // Skill-based categories
  CRIME_INTRIGUE = 'crime-intrigue',
  CIVIC_GOVERNANCE = 'civic-governance',
  MILITARY_TRAINING = 'military-training',
  CRAFTING_TRADE = 'crafting-trade',
  KNOWLEDGE_MAGIC = 'knowledge-magic',
  FAITH_NATURE = 'faith-nature',
  MEDICINE_HEALING = 'medicine-healing',
  PERFORMANCE_CULTURE = 'performance-culture',
  EXPLORATION_WILDERNESS = 'exploration-wilderness',
  
  // Support categories
  FOOD_STORAGE = 'food-storage',
  FORTIFICATIONS = 'fortifications',
  LOGISTICS = 'logistics',
  COMMERCE = 'commerce',
  CULTURE = 'culture',
  REVENUE = 'revenue',
  JUSTICE = 'justice',
  DIPLOMACY = 'diplomacy'
}

/**
 * Resource cost for construction
 */
export interface ResourceCost {
  lumber?: number;
  stone?: number;
  ore?: number;
  gold?: number;
}

/**
 * Special abilities that structures can provide
 */
export enum SpecialAbility {
  NEGATE_FOOD_SPOILAGE = 'negate-food-spoilage', // Strategic Reserves
  CONVERT_UNREST = 'convert-unrest', // Donjon
  AUTO_REDUCE_UNREST = 'auto-reduce-unrest', // Citadel, Auditorium
  AUTO_GAIN_FAME = 'auto-gain-fame', // Auditorium
  DEFENDER_RECOVERY = 'defender-recovery' // Grand Battlements
}

/**
 * GameEffect types for structures (permanent passive capabilities)
 */
export type GameEffectType = 'unlock' | 'ruleMod';

/**
 * Unlock effect - enables player actions
 */
export interface UnlockEffect {
  type: 'unlock';
  actions: string[];  // List of action IDs to unlock
  msg?: string;       // Optional custom message describing this effect
}

/**
 * RuleMod effect - modifies game rules/mechanics
 */
export interface RuleModEffect {
  type: 'ruleMod';
  rule: string;       // Rule identifier
  value?: any;        // Rule-specific data
  msg?: string;       // Optional custom message describing this effect
}

/**
 * Union type for all game effects
 */
export type GameEffect = UnlockEffect | RuleModEffect;

/**
 * Manual effect that requires GM interpretation
 */
export interface ManualEffect {
  effect: string;     // Description of the effect
  msg?: string;       // Optional custom message
}

/**
 * Structure bonuses and effects
 */
export interface StructureEffects {
  // Storage capacities
  foodStorage?: number;
  imprisonedUnrestCapacity?: number;
  
  // Gold generation
  goldPerTurn?: number;
  
  // Army support
  armySupportBonus?: number;
  armyACBonus?: number;
  armyLevelBonus?: number;
  
  // Unrest reduction
  unrestReductionPerTurn?: number;
  unrestReductionBonus?: number;
  
  // Fame
  famePerTurn?: number;
  
  // Trade improvements
  sellRatio?: { resources: number; gold: number }; // e.g. {resources: 3, gold: 2} for 3:2
  buyRatio?: { gold: number; resources: number };  // e.g. {gold: 1, resources: 1} for 1:1
  
  // Diplomatic capacity
  diplomaticCapacity?: number;
  
  // Special abilities
  allowsPersonalIncome?: boolean;
  allowsPardonAction?: boolean;
  specialAbilities?: SpecialAbility[];
  
  // Special mechanics
  convertUnrestPerTurn?: number; // Donjon: convert regular to imprisoned
  defenderRecovery?: boolean; // Grand Battlements
  negateFoodSpoilage?: boolean; // Strategic Reserves
  
  // Skill bonuses
  skillBonus?: number;
  skillsSupported?: string[];
  earnIncomeLevel?: string; // e.g. "Settlement lvl + 2"
  rerollFailedCheck?: boolean;
}

/**
 * Represents a structure that can be built in settlements
 */
export interface Structure {
  id: string;
  name: string;
  type: StructureType;  // 'skill' or 'support'
  category: StructureCategory;
  tier: number; // 1-4
  
  // Requirements
  minimumSettlementTier?: number; // 1=Village, 2=Town, 3=City, 4=Metropolis
  upgradeFrom?: string | null; // ID of prerequisite structure (null for tier 1)
  unique?: boolean; // Only one can exist in settlement
  uniqueKingdomWide?: boolean; // Only one can exist in entire kingdom (revenue structures)
  
  // Costs
  constructionCost: ResourceCost;
  
  // Effects
  effects: StructureEffects;
  gameEffects?: GameEffect[]; // Permanent passive capabilities (unlocks, rule modifications)
  modifiers?: any[]; // EventModifier array - capacity changes, etc.
  manualEffects?: (string | ManualEffect)[]; // Effects that require manual resolution
  
  // Description
  description?: string; // Short description (e.g., "Basic grain storage facility")
  effect: string; // Human-readable effect description
  special?: string; // Special rules or notes
  traits?: string[];
}

/**
 * Load structure data from JSON
 */
export function parseStructureFromJSON(data: any): Structure {
  const structure: Structure = {
    id: data.id,
    name: data.name,
    type: data.type as StructureType,
    category: data.category as StructureCategory,
    tier: data.tier,
    constructionCost: data.cost || {},
    effects: {},
    effect: '',
    description: data.description,
    special: data.special,
    traits: data.traits,
    upgradeFrom: data.upgradeFrom,
    modifiers: data.modifiers,
    manualEffects: data.manualEffects
  };
  
  // Handle skill structures vs support structures
  if (data.type === 'skill') {
    // Parse settlementSkillBonus effects from gameEffects
    const skillBonuses = new Map<string, number>();
    
    if (data.gameEffects && Array.isArray(data.gameEffects)) {
      for (const effect of data.gameEffects) {
        if (effect.type === 'settlementSkillBonus') {
          const skill = effect.skill;
          const value = effect.value || 0;
          // Track highest bonus per skill (though shouldn't have duplicates)
          skillBonuses.set(skill, Math.max(skillBonuses.get(skill) || 0, value));
        }
      }
    }
    
    // Extract skills and determine highest bonus value
    const skills = Array.from(skillBonuses.keys());
    const maxBonus = Math.max(0, ...Array.from(skillBonuses.values()));
    
    // Generate effect text
    if (data.tier === 1 || maxBonus === 0) {
      structure.effect = `Enables Earn Income with listed skills at settlement level.`;
    } else {
      const earnLevel = data.earnIncomeLevel || 'settlement level';
      structure.effect = `Provides +${maxBonus} to listed skills in this settlement.\nEnables Earn Income with listed skills at ${earnLevel}`;
    }
    
    structure.effects.skillBonus = maxBonus;
    structure.effects.skillsSupported = skills;
    structure.effects.earnIncomeLevel = data.earnIncomeLevel || 'settlement';
  } else {
    // Support structures have various effects described in the effect field
    structure.effect = data.effect || '';
  }
  
  // Parse effects from the effect string (for support structures)
  const effectStr = (data.effect?.toLowerCase() || '') + ' ' + (data.special?.toLowerCase() || '');
  
  // Food storage
  const foodMatch = effectStr.match(/\+(\d+) food/);
  if (foodMatch) {
    structure.effects.foodStorage = parseInt(foodMatch[1]);
  }
  
  // Imprisoned unrest
  const prisonMatch = effectStr.match(/hold (\d+) imprisoned/);
  if (prisonMatch) {
    structure.effects.imprisonedUnrestCapacity = parseInt(prisonMatch[1]);
  }
  
  // Gold per turn
  const goldMatch = effectStr.match(/gains? (\d+) gold/i);
  if (goldMatch) {
    structure.effects.goldPerTurn = parseInt(goldMatch[1]);
  }
  
  // Army support
  const armyMatch = effectStr.match(/capacity by \+(\d+)/);
  if (armyMatch) {
    structure.effects.armySupportBonus = parseInt(armyMatch[1]);
  }
  
  // Unrest reduction per turn
  if (effectStr.includes('reduce') && effectStr.includes('unrest by 1')) {
    structure.effects.unrestReductionPerTurn = 1;
  }
  
  // Unrest reduction bonus for checks
  const unrestBonusMatch = effectStr.match(/\+(\d+) to checks.*reduce unrest/i);
  if (unrestBonusMatch) {
    structure.effects.unrestReductionBonus = parseInt(unrestBonusMatch[1]);
  }
  
  // Fame per turn
  if (effectStr.includes('+1 fame each turn')) {
    structure.effects.famePerTurn = 1;
  }
  
  // Trade ratios
  if (effectStr.includes('3:2') && effectStr.includes('resources:gold')) {
    structure.effects.sellRatio = { resources: 3, gold: 2 };
  } else if (effectStr.includes('2:1') && effectStr.includes('resources:gold')) {
    structure.effects.sellRatio = { resources: 2, gold: 1 };
  } else if (effectStr.includes('1:1') && (effectStr.includes('resources:gold') || effectStr.includes('selling surplus'))) {
    structure.effects.sellRatio = { resources: 1, gold: 1 };
  }
  
  // Personal income
  if (effectStr.includes('personal income')) {
    structure.effects.allowsPersonalIncome = true;
  }
  
  // Pardon action
  if (effectStr.includes('pardon')) {
    structure.effects.allowsPardonAction = true;
  }
  
  // Special abilities based on structure ID
  structure.effects.specialAbilities = [];
  
  // Strategic Reserves - food spoilage protection
  if (data.id === 'strategic-reserves') {
    structure.effects.negateFoodSpoilage = true;
    structure.effects.specialAbilities.push(SpecialAbility.NEGATE_FOOD_SPOILAGE);
  }
  
  // Donjon - convert unrest
  if (data.id === 'donjon') {
    structure.effects.convertUnrestPerTurn = 1;
    structure.effects.specialAbilities.push(SpecialAbility.CONVERT_UNREST);
  }
  
  // Citadel - auto reduce unrest
  if (data.id === 'citadel') {
    structure.effects.specialAbilities.push(SpecialAbility.AUTO_REDUCE_UNREST);
  }
  
  // Auditorium - fame and unrest
  if (data.id === 'auditorium') {
    structure.effects.specialAbilities.push(SpecialAbility.AUTO_GAIN_FAME);
    structure.effects.specialAbilities.push(SpecialAbility.AUTO_REDUCE_UNREST);
  }
  
  // Grand Battlements - defender recovery
  if (data.id === 'grand-battlements') {
    structure.effects.defenderRecovery = true;
    structure.effects.specialAbilities.push(SpecialAbility.DEFENDER_RECOVERY);
  }
  
  // Parse gameEffects if present
  if (data.gameEffects && Array.isArray(data.gameEffects)) {
    structure.gameEffects = data.gameEffects as GameEffect[];
  }
  
  // Kingdom-wide unique for revenue structures
  if (structure.category === StructureCategory.REVENUE) {
    structure.uniqueKingdomWide = true;
  }
  
  // Set minimum settlement tier based on structure tier for support structures
  if (structure.type === 'support') {
    structure.minimumSettlementTier = structure.tier;
  }
  
  return structure;
}

/**
 * Generate effect messages for a structure
 * Returns an array of effect messages (for gameEffects and manualEffects)
 */
export function generateEffectMessages(structure: Structure): string[] {
  const messages: string[] = [];
  
  // Generate messages for gameEffects
  if (structure.gameEffects && structure.gameEffects.length > 0) {
    for (const effect of structure.gameEffects) {
      if (effect.msg) {
        // Use custom message if provided
        messages.push(effect.msg);
      } else {
        // Generate message based on effect type
        if (effect.type === 'unlock') {
          const actionNames = effect.actions.join(', ');
          messages.push(`Unlocks: ${actionNames}`);
        } else if (effect.type === 'ruleMod') {
          messages.push(`Modifies rule: ${effect.rule}`);
        }
      }
    }
  }
  
  // Generate messages for manualEffects
  if (structure.manualEffects && structure.manualEffects.length > 0) {
    for (const effect of structure.manualEffects) {
      // manualEffects are plain strings or ManualEffect objects
      if (typeof effect === 'string') {
        messages.push(effect);
      } else if (typeof effect === 'object' && 'effect' in effect) {
        messages.push(effect.msg || effect.effect);
      }
    }
  }
  
  return messages;
}

/**
 * Get the display name for a structure category
 */
export function getCategoryDisplayName(category: StructureCategory): string {
  const names: Record<StructureCategory, string> = {
    [StructureCategory.CRIME_INTRIGUE]: 'Crime & Intrigue',
    [StructureCategory.CIVIC_GOVERNANCE]: 'Civic & Governance',
    [StructureCategory.MILITARY_TRAINING]: 'Military & Training',
    [StructureCategory.CRAFTING_TRADE]: 'Crafting & Trade',
    [StructureCategory.KNOWLEDGE_MAGIC]: 'Knowledge & Magic',
    [StructureCategory.FAITH_NATURE]: 'Faith & Nature',
    [StructureCategory.MEDICINE_HEALING]: 'Medicine & Healing',
    [StructureCategory.PERFORMANCE_CULTURE]: 'Hospitality',
    [StructureCategory.EXPLORATION_WILDERNESS]: 'Exploration & Wilderness',
    [StructureCategory.FOOD_STORAGE]: 'Food Storage',
    [StructureCategory.FORTIFICATIONS]: 'Fortifications',
    [StructureCategory.LOGISTICS]: 'Logistics',
    [StructureCategory.COMMERCE]: 'Commerce',
    [StructureCategory.CULTURE]: 'Culture',
    [StructureCategory.REVENUE]: 'Revenue',
    [StructureCategory.JUSTICE]: 'Justice',
    [StructureCategory.DIPLOMACY]: 'Diplomacy'
  };
  
  return names[category] || category;
}
