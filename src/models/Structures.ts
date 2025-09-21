// Data model for Kingdom Structures based on Reignmaker Lite rules
// Auto-converted and fixed from Structures.kt

/**
 * Categories of structures
 */
export enum StructureCategory {
    // Skill-based categories
    CRIME_INTRIGUE = "Crime & Intrigue",
    CIVIC_GOVERNANCE = "Civic & Governance",
    MILITARY_TRAINING = "Military & Training",
    CRAFTING_TRADE = "Crafting & Trade",
    KNOWLEDGE_MAGIC = "Knowledge & Magic",
    FAITH_NATURE = "Faith & Nature",
    MEDICINE_HEALING = "Medicine & Healing",
    PERFORMANCE_CULTURE = "Performance & Culture",
    EXPLORATION_WILDERNESS = "Exploration & Wilderness",
    // Support categories
    FOOD_STORAGE = "Food Storage",
    FORTIFICATIONS = "Fortifications",
    LOGISTICS = "Logistics",
    COMMERCE = "Commerce",
    CULTURE = "Culture",
    REVENUE = "Revenue",
    JUSTICE = "Justice",
    DIPLOMACY = "Diplomacy"
}

/**
 * Skills that can be used with structures
 */
export enum StructureSkill {
    // Core skills
    THIEVERY = "Thievery",
    DECEPTION = "Deception",
    STEALTH = "Stealth",
    SOCIETY = "Society",
    DIPLOMACY = "Diplomacy",
    ATHLETICS = "Athletics",
    ACROBATICS = "Acrobatics",
    INTIMIDATION = "Intimidation",
    CRAFTING = "Crafting",
    LORE = "Lore",
    ARCANA = "Arcana",
    OCCULTISM = "Occultism",
    RELIGION = "Religion",
    MEDICINE = "Medicine",
    NATURE = "Nature",
    PERFORMANCE = "Performance",
    SURVIVAL = "Survival"
}

/**
 * Settlement tiers
 */
export enum SettlementTier {
    VILLAGE = 1,
    TOWN = 2,
    CITY = 3,
    METROPOLIS = 4
}

/**
 * Base interface for all structure effects
 */
export interface StructureEffect {
    type: string;
    description: string;
}

/**
 * Provides an income level bonus for earn income actions
 */
export interface EarnIncomeEffect extends StructureEffect {
    type: 'earn_income';
    levelBonus: number;
}

/**
 * Provides a circumstance bonus to skill checks
 */
export interface SkillBonusEffect extends StructureEffect {
    type: 'skill_bonus';
    bonus: number;
    skills: StructureSkill[];
}

/**
 * Allows one reroll per turn on failed skill checks
 */
export interface RerollEffect extends StructureEffect {
    type: 'reroll';
    usesPerTurn: number;
}

/**
 * Provides storage capacity for resources
 */
export interface StorageEffect extends StructureEffect {
    type: 'storage';
    foodCapacity?: number;
    lumberCapacity?: number;
    stoneCapacity?: number;
    oreCapacity?: number;
}

/**
 * Provides defensive bonuses
 */
export interface DefenseEffect extends StructureEffect {
    type: 'defense';
    acBonus: number;
    effectiveLevelBonus: number;
    specialDefense?: string | null;
}

/**
 * Increases military unit capacity
 */
export interface MilitaryCapacityEffect extends StructureEffect {
    type: 'military_capacity';
    additionalUnits: number;
}

/**
 * Provides gold income per turn
 */
export interface GoldIncomeEffect extends StructureEffect {
    type: 'gold_income';
    goldPerTurn: number;
}

/**
 * Reduces unrest per turn
 */
export interface UnrestReductionEffect extends StructureEffect {
    type: 'unrest_reduction';
    unrestReduction: number;
}

/**
 * Provides fame per turn
 */
export interface FameEffect extends StructureEffect {
    type: 'fame';
    famePerTurn: number;
}

/**
 * Enables trade with different conversion rates
 */
export interface TradeEffect extends StructureEffect {
    type: 'trade';
    sellRatio: [number, number];
    buyRatio?: [number, number];
    enablesPurchasing?: string | null;
}

/**
 * Holds imprisoned unrest
 */
export interface ImprisonmentEffect extends StructureEffect {
    type: 'imprisonment';
    capacity: number;
    allowsExecute: boolean;
    allowsPardon: boolean;
    autoConvert: boolean;
}

/**
 * Diplomatic relationship capacity
 */
export interface DiplomaticEffect extends StructureEffect {
    type: 'diplomatic';
    helpfulRelationships: number;
}

/**
 * Represents a single structure that can be built
 */
export interface Structure {
    id: string;
    name: string;
    category: StructureCategory;
    tier: number;
    description: string;
    cost: Map<string, number>;
    skillsSupported?: StructureSkill[];
    effects?: StructureEffect[];
    upgradesFrom?: string | null;
    settlementTierRequired: SettlementTier;
    special?: string | null;
}

/**
 * Settlement interface
 */
export interface Settlement {
    id: string;
    name: string;
    tier: SettlementTier;
}

/**
 * Helper function to create structures
 */
function createStructure(data: Partial<Structure> & {
    id: string;
    name: string;
    category: StructureCategory;
    tier: number;
    settlementTierRequired: SettlementTier;
}): Structure {
    return {
        description: '',
        cost: new Map(),
        skillsSupported: [],
        effects: [],
        upgradesFrom: null,
        special: null,
        ...data
    };
}

/**
 * Data object containing all structure definitions
 */
export const StructuresData = {
    
    /**
     * Get all skill-based structures
     */
    getSkillStructures(): Structure[] {
        return [
            // Crime & Intrigue structures
            createStructure({
                id: "rats_warren",
                name: "Rats' Warren",
                category: StructureCategory.CRIME_INTRIGUE,
                tier: 1,
                description: "A network of underground tunnels and hideouts for thieves",
                cost: new Map([["lumber", 2]]),
                skillsSupported: [StructureSkill.THIEVERY],
                effects: [{
                    type: 'earn_income',
                    levelBonus: 0,
                    description: "Earn Income at settlement level"
                } as EarnIncomeEffect],
                settlementTierRequired: SettlementTier.VILLAGE
            }),
            createStructure({
                id: "smugglers_den",
                name: "Smugglers' Den",
                category: StructureCategory.CRIME_INTRIGUE,
                tier: 2,
                description: "A secret warehouse for contraband and illicit trade",
                cost: new Map([["lumber", 2], ["stone", 2]]),
                skillsSupported: [StructureSkill.THIEVERY, StructureSkill.DECEPTION],
                effects: [
                    {
                        type: 'earn_income',
                        levelBonus: 2,
                        description: "Earn Income at settlement level + 2"
                    } as EarnIncomeEffect,
                    {
                        type: 'skill_bonus',
                        bonus: 1,
                        skills: [StructureSkill.THIEVERY, StructureSkill.DECEPTION],
                        description: "+1 to Thievery and Deception"
                    } as SkillBonusEffect
                ],
                upgradesFrom: "rats_warren",
                settlementTierRequired: SettlementTier.TOWN
            }),
            createStructure({
                id: "thieves_guild",
                name: "Thieves' Guild",
                category: StructureCategory.CRIME_INTRIGUE,
                tier: 3,
                description: "An organized criminal syndicate with extensive reach",
                cost: new Map([["lumber", 2], ["stone", 3], ["ore", 3]]),
                skillsSupported: [StructureSkill.THIEVERY, StructureSkill.DECEPTION, StructureSkill.STEALTH],
                effects: [
                    {
                        type: 'earn_income',
                        levelBonus: 4,
                        description: "Earn Income at settlement level + 4"
                    } as EarnIncomeEffect,
                    {
                        type: 'skill_bonus',
                        bonus: 2,
                        skills: [StructureSkill.THIEVERY, StructureSkill.DECEPTION, StructureSkill.STEALTH],
                        description: "+2 to Thievery, Deception, and Stealth"
                    } as SkillBonusEffect
                ],
                upgradesFrom: "smugglers_den",
                settlementTierRequired: SettlementTier.CITY
            }),
            // Add more skill structures here...
        ];
    },
    
    /**
     * Get all support structures
     */
    getSupportStructures(): Structure[] {
        return [
            // Food Storage structures
            createStructure({
                id: "granary",
                name: "Granary",
                category: StructureCategory.FOOD_STORAGE,
                tier: 1,
                description: "Basic food storage facility",
                cost: new Map([["lumber", 2]]),
                effects: [{
                    type: 'storage',
                    foodCapacity: 4,
                    description: "Store up to 4 Food"
                } as StorageEffect],
                settlementTierRequired: SettlementTier.VILLAGE
            }),
            createStructure({
                id: "storehouses",
                name: "Storehouses",
                category: StructureCategory.FOOD_STORAGE,
                tier: 2,
                description: "Expanded storage for food and materials",
                cost: new Map([["lumber", 2], ["stone", 2]]),
                effects: [{
                    type: 'storage',
                    foodCapacity: 8,
                    description: "Store up to 8 Food"
                } as StorageEffect],
                upgradesFrom: "granary",
                settlementTierRequired: SettlementTier.TOWN
            }),
            // Add more support structures here...
        ];
    },
    
    /**
     * Get all structures
     */
    getAllStructures(): Structure[] {
        return [...this.getSkillStructures(), ...this.getSupportStructures()];
    },
    
    /**
     * Get a structure by ID
     */
    getStructureById(id: string): Structure | null {
        return this.getAllStructures().find(s => s.id === id) || null;
    },
    
    /**
     * Get structures by category
     */
    getStructuresByCategory(category: StructureCategory): Structure[] {
        return this.getAllStructures().filter(s => s.category === category);
    },
    
    /**
     * Get structures available for a settlement tier
     */
    getStructuresForSettlement(tier: SettlementTier): Structure[] {
        return this.getAllStructures().filter(structure => 
            structure.tier <= tier
        );
    },
    
    /**
     * Get structures that can be built in a settlement
     */
    getBuildableStructures(
        settlement: Settlement, 
        existingStructures: string[]
    ): Structure[] {
        return this.getStructuresForSettlement(settlement.tier).filter(structure =>
            // Check if we already have this structure
            !existingStructures.includes(structure.id) &&
            // Check if we have the prerequisite for upgrading
            (!structure.upgradesFrom || existingStructures.includes(structure.upgradesFrom))
        );
    }
};
