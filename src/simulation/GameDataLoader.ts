/**
 * GameDataLoader - Loads actual game data for realistic simulation
 * 
 * Imports real action pipelines, structures, and game rules
 * to ensure simulation accuracy matches actual gameplay.
 */

import type { EventModifier } from '../types/modifiers';

// ============================================================
// TYPES
// ============================================================

export interface SimulationAction {
  id: string;
  name: string;
  category: string;
  cost?: Record<string, number>;
  requirements?: {
    minSettlements?: number;
    minHexes?: number;
    minGold?: number;
    minFood?: number;
    minLumber?: number;
    minStone?: number;
    minOre?: number;
    hasArmy?: boolean;
    hasSettlement?: boolean;
  };
  outcomes: {
    criticalSuccess?: { modifiers: EventModifier[]; effects?: string[] };
    success?: { modifiers: EventModifier[]; effects?: string[] };
    failure?: { modifiers: EventModifier[]; effects?: string[] };
    criticalFailure?: { modifiers: EventModifier[]; effects?: string[] };
  };
}

export interface SimulationStructure {
  id: string;
  name: string;
  tier: number;
  category: string;
  type: 'skill' | 'support';
  cost: Record<string, number>;
  effects: {
    goldPerTurn?: number;
    foodStorage?: number;
    unrestReduction?: number;
    famePerTurn?: number;
    skillBonus?: number;
    skills?: string[];
    armySupport?: number;
    diplomaticCapacity?: number;
    imprisonedCapacity?: number;
    special?: string[];
  };
  upgradeFrom?: string;
  minimumSettlementTier?: number;
}

// Settlement tier information for validation
const SETTLEMENT_TIERS = {
  Village: { tier: 1, maxStructures: 4, consumption: 1, gold: 1, upgradeSize: 10, upgradeCost: 4 },
  Town: { tier: 2, maxStructures: 8, consumption: 2, gold: 2, upgradeSize: 25, upgradeCost: 8 },
  City: { tier: 3, maxStructures: 12, consumption: 3, gold: 3, upgradeSize: 50, upgradeCost: 16 },
  Metropolis: { tier: 4, maxStructures: 16, consumption: 4, gold: 4, upgradeSize: 999, upgradeCost: 999 }
};

// ============================================================
// ALL 28 ACTIONS FROM THE GAME
// Extracted from src/pipelines/actions/
// ============================================================

export const ALL_ACTIONS: SimulationAction[] = [
  // === ECONOMIC ACTIONS ===
  {
    id: 'collect-stipend',
    name: 'Collect Stipend',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'sell-surplus',
    name: 'Sell Surplus',
    category: 'economic',
    requirements: { minFood: 1 }, // Need something to sell
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d4', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'purchase-resources',
    name: 'Purchase Resources',
    category: 'economic',
    requirements: { minGold: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Gain 4 commodities for 2 gold'] },
      success: { modifiers: [], effects: ['Gain 2 commodities for 2 gold'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] }
    }
  },
  {
    id: 'request-economic-aid',
    name: 'Request Economic Aid',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // === TERRITORY ACTIONS ===
  {
    id: 'claim-hexes',
    name: 'Claim Hexes',
    category: 'territory',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Claim up to proficiency rank hexes (min 2)'] },
      success: { modifiers: [], effects: ['Claim 1 hex'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'send-scouts',
    name: 'Send Scouts',
    category: 'territory',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Reveal 4 hexes for future claiming'] },
      success: { modifiers: [], effects: ['Reveal 2 hexes for future claiming'] },
      failure: { modifiers: [], effects: ['Reveal 1 hex'] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // === URBAN PLANNING ACTIONS ===
  {
    id: 'establish-settlement',
    name: 'Establish Settlement',
    category: 'urban-planning',
    cost: { gold: 2, lumber: 2, food: 2 },
    requirements: { minGold: 2, minLumber: 2, minFood: 2, minHexes: 1 },
    outcomes: {
      criticalSuccess: { 
        modifiers: [],
        effects: ['Found village', 'Gain free Tier 1 structure']
      },
      success: { 
        modifiers: [],
        effects: ['Found village']
      },
      failure: { 
        modifiers: [
          { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
          { type: 'static', resource: 'lumber', value: -1, duration: 'immediate' },
          { type: 'static', resource: 'food', value: -1, duration: 'immediate' }
        ]
      },
      criticalFailure: { 
        modifiers: [
          { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
        ]
      }
    }
  },
  {
    id: 'build-structure',
    name: 'Build Structure',
    category: 'urban-planning',
    requirements: { hasSettlement: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Build structure at 50% cost'] },
      success: { modifiers: [], effects: ['Build structure'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'upgrade-settlement',
    name: 'Upgrade Settlement',
    category: 'urban-planning',
    requirements: { hasSettlement: true, minHexes: 10 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Upgrade settlement tier at reduced cost'] },
      success: { modifiers: [], effects: ['Upgrade settlement tier'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'repair-structure',
    name: 'Repair Structure',
    category: 'urban-planning',
    requirements: { hasSettlement: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Repair structure for free'] },
      success: { modifiers: [], effects: ['Repair structure at half cost'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // === INFRASTRUCTURE ACTIONS ===
  {
    id: 'build-roads',
    name: 'Build Roads',
    category: 'infrastructure',
    cost: { lumber: 1, stone: 1 },
    requirements: { minLumber: 1, minStone: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Build roads in 2 hexes'] },
      success: { modifiers: [], effects: ['Build roads in 1 hex'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'create-worksite',
    name: 'Create Worksite',
    category: 'infrastructure',
    cost: { lumber: 1 },
    requirements: { minLumber: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Create worksite with bonus production'] },
      success: { modifiers: [], effects: ['Create worksite'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'fortify-hex',
    name: 'Fortify Hex',
    category: 'infrastructure',
    cost: { stone: 2, ore: 1 },
    requirements: { minStone: 2, minOre: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Build fortification at reduced cost'] },
      success: { modifiers: [], effects: ['Build fortification'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'harvest-resources',
    name: 'Harvest Resources',
    category: 'infrastructure',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Gain 3 commodities based on terrain'] },
      success: { modifiers: [], effects: ['Gain 2 commodities based on terrain'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'gold', value: -1, duration: 'immediate' }] }
    }
  },
  
  // === STABILITY ACTIONS ===
  {
    id: 'deal-with-unrest',
    name: 'Deal with Unrest',
    category: 'stability',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Reduce unrest by 2'] },
      success: { modifiers: [], effects: ['Reduce unrest by 1'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'arrest-dissidents',
    name: 'Arrest Dissidents',
    category: 'stability',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Convert 2 unrest to imprisoned'] },
      success: { modifiers: [], effects: ['Convert 1 unrest to imprisoned'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'execute-or-pardon-prisoners',
    name: 'Execute or Pardon Prisoners',
    category: 'stability',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Release prisoners with bonus'] },
      success: { modifiers: [], effects: ['Release prisoners'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // === MILITARY ACTIONS ===
  {
    id: 'recruit-unit',
    name: 'Recruit Unit',
    category: 'military',
    cost: { gold: 2 },
    requirements: { minGold: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Recruit unit with bonus XP'] },
      success: { modifiers: [], effects: ['Recruit unit'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'train-army',
    name: 'Train Army',
    category: 'military',
    cost: { gold: 1 },
    requirements: { hasArmy: true, minGold: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Army gains 2 XP'] },
      success: { modifiers: [], effects: ['Army gains 1 XP'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'deploy-army',
    name: 'Deploy Army',
    category: 'military',
    requirements: { hasArmy: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Deploy army with tactical advantage'] },
      success: { modifiers: [], effects: ['Deploy army'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'outfit-army',
    name: 'Outfit Army',
    category: 'military',
    cost: { gold: 2, ore: 1 },
    requirements: { hasArmy: true, minGold: 2, minOre: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Upgrade army gear at reduced cost'] },
      success: { modifiers: [], effects: ['Upgrade army gear'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'disband-army',
    name: 'Disband Army',
    category: 'military',
    requirements: { hasArmy: true },
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'tend-wounded',
    name: 'Tend Wounded',
    category: 'military',
    requirements: { hasArmy: true },
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Heal all army casualties'] },
      success: { modifiers: [], effects: ['Heal half army casualties'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'request-military-aid',
    name: 'Request Military Aid',
    category: 'military',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Gain allied army'] },
      success: { modifiers: [], effects: ['Gain allied units'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // === DIPLOMATIC ACTIONS ===
  {
    id: 'diplomatic-mission',
    name: 'Diplomatic Mission',
    category: 'diplomatic',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Improve faction attitude by 2'] },
      success: { modifiers: [], effects: ['Improve faction attitude by 1'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'aid-another',
    name: 'Aid Another',
    category: 'diplomatic',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Grant +4 bonus to ally action'] },
      success: { modifiers: [], effects: ['Grant +2 bonus to ally action'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'infiltration',
    name: 'Infiltration',
    category: 'diplomatic',
    outcomes: {
      criticalSuccess: { modifiers: [], effects: ['Gain intel and sabotage options'] },
      success: { modifiers: [], effects: ['Gain intel on enemy'] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  }
];

// ============================================================
// STRUCTURES - Full catalog from structures.json
// ============================================================

export const ALL_STRUCTURES: SimulationStructure[] = [
  // === TIER 1 STRUCTURES (Village) ===
  // Civic & Governance
  { id: 'town-hall', name: 'Meeting House', tier: 1, category: 'civic', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['society'] } },
  
  // Crafting & Trade  
  { id: 'workshop', name: 'Workshop', tier: 1, category: 'crafting', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['crafting'] } },
  
  // Knowledge & Learning
  { id: 'library', name: 'Library', tier: 1, category: 'knowledge', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['arcana', 'occultism', 'nature', 'religion'] } },
  
  // Faith & Religion
  { id: 'shrine', name: 'Shrine', tier: 1, category: 'faith', type: 'skill',
    cost: { lumber: 1, stone: 1 }, effects: { skillBonus: 1, skills: ['religion'] } },
  
  // Medicine & Healing
  { id: 'herbalist', name: 'Herbalist', tier: 1, category: 'medicine', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['medicine', 'nature'] } },
  
  // Entertainment
  { id: 'tavern', name: 'Tavern', tier: 1, category: 'entertainment', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['diplomacy', 'performance'] } },
  
  // Law & Order
  { id: 'watchtower', name: 'Watchtower', tier: 1, category: 'law', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['perception'] } },
  
  // Military Training
  { id: 'training-yard', name: 'Training Yard', tier: 1, category: 'military', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['athletics', 'acrobatics'] } },
  
  // Espionage
  { id: 'back-alley', name: 'Back Alley', tier: 1, category: 'espionage', type: 'skill',
    cost: { lumber: 1 }, effects: { skillBonus: 1, skills: ['thievery', 'stealth'] } },
  
  // Wilderness
  { id: 'hunters-lodge', name: "Hunter's Lodge", tier: 1, category: 'wilderness', type: 'skill',
    cost: { lumber: 2 }, effects: { skillBonus: 1, skills: ['survival', 'nature'] } },
  
  // === SUPPORT STRUCTURES (Tier 1) ===
  { id: 'granary', name: 'Granary', tier: 1, category: 'storage', type: 'support',
    cost: { lumber: 2 }, effects: { foodStorage: 4 } },
    
  { id: 'marketplace', name: 'Marketplace', tier: 1, category: 'commerce', type: 'support',
    cost: { lumber: 2 }, effects: { goldPerTurn: 1 } },
    
  { id: 'houses', name: 'Houses', tier: 1, category: 'residential', type: 'support',
    cost: { lumber: 2 }, effects: {} },
    
  { id: 'monument', name: 'Monument', tier: 1, category: 'culture', type: 'support',
    cost: { stone: 2 }, effects: { unrestReduction: 1 } },
    
  { id: 'dive-bar', name: 'Dive Bar', tier: 1, category: 'hospitality', type: 'support',
    cost: { lumber: 2 }, effects: { unrestReductionBonus: 1 } },
    
  { id: 'donjon', name: 'Donjon', tier: 1, category: 'detention', type: 'support',
    cost: { stone: 2, ore: 1 }, effects: { imprisonedCapacity: 2, special: ['Converts 1 unrest to imprisoned per turn'] } },
  
  // === TIER 2 STRUCTURES (Town) ===
  { id: 'city-hall', name: 'Town Hall', tier: 2, category: 'civic', type: 'skill',
    cost: { lumber: 2, stone: 2 }, effects: { skillBonus: 1, skills: ['society', 'diplomacy'] },
    upgradeFrom: 'town-hall', minimumSettlementTier: 2 },
    
  { id: 'artisans-hall', name: "Artisan's Hall", tier: 2, category: 'crafting', type: 'skill',
    cost: { lumber: 2, stone: 2 }, effects: { skillBonus: 1, skills: ['crafting'] },
    upgradeFrom: 'workshop', minimumSettlementTier: 2 },
    
  { id: 'temple', name: 'Temple', tier: 2, category: 'faith', type: 'skill',
    cost: { lumber: 2, stone: 2 }, effects: { skillBonus: 1, skills: ['religion'], unrestReduction: 1 },
    upgradeFrom: 'shrine', minimumSettlementTier: 2 },
    
  { id: 'garrison', name: 'Garrison', tier: 2, category: 'military', type: 'skill',
    cost: { lumber: 2, stone: 2 }, effects: { skillBonus: 1, skills: ['athletics', 'acrobatics', 'intimidation'], armySupport: 1 },
    upgradeFrom: 'training-yard', minimumSettlementTier: 2 },
    
  { id: 'trade-hall', name: 'Trade Hall', tier: 2, category: 'commerce', type: 'support',
    cost: { lumber: 2, stone: 2 }, effects: { goldPerTurn: 2 },
    upgradeFrom: 'marketplace', minimumSettlementTier: 2 },
    
  { id: 'warehouse', name: 'Warehouse', tier: 2, category: 'storage', type: 'support',
    cost: { lumber: 3, stone: 1 }, effects: { foodStorage: 8 },
    upgradeFrom: 'granary', minimumSettlementTier: 2 },
    
  { id: 'prison', name: 'Prison', tier: 2, category: 'detention', type: 'support',
    cost: { stone: 3, ore: 2 }, effects: { imprisonedCapacity: 4, special: ['Converts 2 unrest to imprisoned per turn'] },
    upgradeFrom: 'donjon', minimumSettlementTier: 2 },
    
  { id: 'public-house', name: 'Public House', tier: 2, category: 'hospitality', type: 'support',
    cost: { lumber: 3, stone: 1 }, effects: { unrestReductionBonus: 2 },
    upgradeFrom: 'dive-bar', minimumSettlementTier: 2 },
    
  { id: 'respectable-tavern', name: 'Respectable Tavern', tier: 3, category: 'hospitality', type: 'support',
    cost: { lumber: 4, stone: 3, ore: 1 }, effects: { unrestReductionBonus: 2, unrestReduction: 1 },
    upgradeFrom: 'public-house', minimumSettlementTier: 3 },
    
  { id: 'pleasure-palace', name: 'Pleasure Palace', tier: 4, category: 'hospitality', type: 'support',
    cost: { lumber: 6, stone: 6, ore: 4 }, effects: { famePerTurn: 1, unrestReduction: 1, unrestReductionBonus: 2 },
    upgradeFrom: 'respectable-tavern', minimumSettlementTier: 4 },
  
  // === TIER 3 STRUCTURES (City) ===
  { id: 'diplomatic-quarter', name: 'Council Chambers', tier: 3, category: 'civic', type: 'skill',
    cost: { lumber: 2, stone: 4, ore: 2 }, effects: { skillBonus: 2, skills: ['society', 'diplomacy', 'deception'], diplomaticCapacity: 1 },
    upgradeFrom: 'city-hall', minimumSettlementTier: 3 },
    
  { id: 'cathedral', name: 'Cathedral', tier: 3, category: 'faith', type: 'skill',
    cost: { lumber: 2, stone: 4, ore: 2 }, effects: { skillBonus: 2, skills: ['religion'], unrestReduction: 2 },
    upgradeFrom: 'temple', minimumSettlementTier: 3 },
    
  { id: 'fortress', name: 'Fortress', tier: 3, category: 'military', type: 'skill',
    cost: { stone: 4, ore: 4 }, effects: { skillBonus: 2, skills: ['athletics', 'acrobatics', 'intimidation'], armySupport: 2 },
    upgradeFrom: 'garrison', minimumSettlementTier: 3 },
    
  { id: 'merchant-guild', name: 'Merchant Guild', tier: 3, category: 'commerce', type: 'support',
    cost: { lumber: 2, stone: 4, ore: 2 }, effects: { goldPerTurn: 3 },
    upgradeFrom: 'trade-hall', minimumSettlementTier: 3 },
    
  { id: 'strategic-reserve', name: 'Strategic Reserve', tier: 3, category: 'storage', type: 'support',
    cost: { lumber: 4, stone: 4 }, effects: { foodStorage: 16, special: ['Food does not spoil'] },
    upgradeFrom: 'warehouse', minimumSettlementTier: 3 },
  
  // === TIER 4 STRUCTURES (Metropolis) ===
  { id: 'grand-forum', name: 'Royal Court', tier: 4, category: 'civic', type: 'skill',
    cost: { lumber: 4, stone: 6, ore: 6 }, effects: { skillBonus: 3, skills: ['society', 'diplomacy', 'deception'], special: ['Reroll 1 failed check per turn'] },
    upgradeFrom: 'diplomatic-quarter', minimumSettlementTier: 4 },
    
  { id: 'grand-cathedral', name: 'Grand Cathedral', tier: 4, category: 'faith', type: 'skill',
    cost: { stone: 8, ore: 4 }, effects: { skillBonus: 3, skills: ['religion'], unrestReduction: 3, famePerTurn: 1 },
    upgradeFrom: 'cathedral', minimumSettlementTier: 4 },
    
  { id: 'citadel', name: 'Citadel', tier: 4, category: 'military', type: 'skill',
    cost: { stone: 8, ore: 8 }, effects: { skillBonus: 3, skills: ['athletics', 'acrobatics', 'intimidation'], armySupport: 4 },
    upgradeFrom: 'fortress', minimumSettlementTier: 4 },
    
  { id: 'royal-treasury', name: 'Royal Treasury', tier: 4, category: 'commerce', type: 'support',
    cost: { stone: 6, ore: 6 }, effects: { goldPerTurn: 4, special: ['Double gold from trade'] },
    upgradeFrom: 'merchant-guild', minimumSettlementTier: 4 }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getActionsByCategory(category: string): SimulationAction[] {
  return ALL_ACTIONS.filter(a => a.category === category);
}

export function getAffordableStructures(
  resources: Record<string, number>,
  settlementTier: number
): SimulationStructure[] {
  return ALL_STRUCTURES.filter(s => {
    // Check tier requirement
    if (s.minimumSettlementTier && s.minimumSettlementTier > settlementTier) {
      return false;
    }
    
    // Check cost
    for (const [resource, amount] of Object.entries(s.cost)) {
      if ((resources[resource] || 0) < amount) {
        return false;
      }
    }
    
    return true;
  });
}

export function getStructureById(id: string): SimulationStructure | undefined {
  return ALL_STRUCTURES.find(s => s.id === id);
}

export function getActionById(id: string): SimulationAction | undefined {
  return ALL_ACTIONS.find(a => a.id === id);
}

export function canPerformAction(
  action: SimulationAction,
  kingdom: {
    resources: Record<string, number>;
    settlements: any[];
    hexes: any[];
    armies: any[];
    exploredHexIds?: Set<string>;
  }
): boolean {
  const req = action.requirements;
  const r = kingdom.resources;
  const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === 'player') || [];
  const claimedCount = claimedHexes.length;
  
  // Check basic requirements
  if (req) {
    if (req.minGold && (r.gold || 0) < req.minGold) return false;
    if (req.minFood && (r.food || 0) < req.minFood) return false;
    if (req.minLumber && (r.lumber || 0) < req.minLumber) return false;
    if (req.minStone && (r.stone || 0) < req.minStone) return false;
    if (req.minOre && (r.ore || 0) < req.minOre) return false;
    if (req.minHexes && claimedCount < req.minHexes) return false;
    if (req.minSettlements && (kingdom.settlements?.length || 0) < req.minSettlements) return false;
    if (req.hasSettlement && (kingdom.settlements?.length || 0) === 0) return false;
    if (req.hasArmy && (kingdom.armies?.length || 0) === 0) return false;
  }
  
  // Check action cost
  if (action.cost) {
    for (const [resource, amount] of Object.entries(action.cost)) {
      if ((r[resource] || 0) < amount) return false;
    }
  }
  
  // Action-specific eligibility checks
  switch (action.id) {
    case 'build-structure': {
      // Limit total queue size to prevent over-queuing
      const totalQueued = (kingdom.buildQueue || []).length;
      if (totalQueued >= 2) return false; // Max 2 structures in queue at once
      
      // Need a settlement with room for more structures (including queued)
      const queuedBySettlement = new Map<string, number>();
      for (const project of kingdom.buildQueue || []) {
        const count = queuedBySettlement.get(project.settlementId) || 0;
        queuedBySettlement.set(project.settlementId, count + 1);
      }
      
      const hasSettlementWithRoom = kingdom.settlements?.some(s => {
        const tierInfo = SETTLEMENT_TIERS[s.tier as keyof typeof SETTLEMENT_TIERS];
        const builtCount = s.structures?.length || 0;
        const queuedCount = queuedBySettlement.get(s.id) || 0;
        return tierInfo && (builtCount + queuedCount) < tierInfo.maxStructures;
      });
      if (!hasSettlementWithRoom) return false;
      
      // Check we have at least one unbuild structure available (don't check affordability - build queue handles payment)
      const settlement = kingdom.settlements?.find(s => {
        const tierInfo = SETTLEMENT_TIERS[s.tier as keyof typeof SETTLEMENT_TIERS];
        const builtCount = s.structures?.length || 0;
        const queuedCount = queuedBySettlement.get(s.id) || 0;
        return tierInfo && (builtCount + queuedCount) < tierInfo.maxStructures;
      });
      if (settlement) {
        const settlementTier = SETTLEMENT_TIERS[settlement.tier as keyof typeof SETTLEMENT_TIERS]?.tier || 1;
        const allStructures = ALL_STRUCTURES.filter(s => 
          (!s.minimumSettlementTier || s.minimumSettlementTier <= settlementTier) &&
          s.tier <= settlementTier
        );
        const existingIds = settlement.structures?.map((s: any) => s.id) || [];
        const queuedIds = (kingdom.buildQueue || [])
          .filter(p => p.settlementId === settlement.id)
          .map(p => p.structureId);
        const available = allStructures.filter(s => 
          !existingIds.includes(s.id) && !queuedIds.includes(s.id)
        );
        if (available.length === 0) return false;
      }
      break;
    }
    
    case 'create-worksite': {
      // Need a claimed hex without worksite or settlement
      const eligibleHex = claimedHexes.find(h => 
        !h.worksite && !h.features?.some((f: any) => f.type === 'settlement')
      );
      if (!eligibleHex) return false;
      break;
    }
    
    case 'claim-hexes': {
      // Need explored unclaimed hexes (check exploredHexIds if available)
      const unclaimedHexes = kingdom.hexes?.filter(h => !h.claimedBy) || [];
      if (unclaimedHexes.length === 0) return false;
      break;
    }
    
    case 'establish-settlement': {
      // Need a claimed hex without a settlement
      const eligibleHex = claimedHexes.find(h => 
        !h.features?.some((f: any) => f.type === 'settlement')
      );
      if (!eligibleHex) return false;
      break;
    }
    
    case 'upgrade-settlement': {
      // Need a settlement eligible for upgrade based on territory size
      const canUpgrade = kingdom.settlements?.some(s => {
        const tierInfo = SETTLEMENT_TIERS[s.tier as keyof typeof SETTLEMENT_TIERS];
        return tierInfo && claimedCount >= tierInfo.upgradeSize && s.tier !== 'Metropolis';
      });
      if (!canUpgrade) return false;
      break;
    }
    
    case 'build-roads': {
      // Need a claimed hex without a road
      const eligibleHex = claimedHexes.find(h => !h.hasRoad);
      if (!eligibleHex) return false;
      break;
    }
    
    case 'sell-surplus': {
      // Need surplus resources (>20 of something)
      const hasSurplus = ['food', 'lumber', 'stone', 'ore'].some(res => (r[res] || 0) > 20);
      if (!hasSurplus) return false;
      break;
    }
    
    case 'deal-with-unrest': {
      // Don't deal with unrest if at 0-2 - Fame conversion (-1/turn) handles low unrest
      // Let the kingdom tolerate moderate unrest to free up actions for growth
      if ((kingdom as any).unrest <= 2) return false;
      break;
    }
  }
  
  return true;
}

// Action categories for strategy use
export const ACTION_CATEGORIES = {
  economic: ['collect-stipend', 'sell-surplus', 'purchase-resources', 'request-economic-aid'],
  territory: ['claim-hexes', 'send-scouts'],
  urbanPlanning: ['establish-settlement', 'build-structure', 'upgrade-settlement', 'repair-structure'],
  infrastructure: ['build-roads', 'create-worksite', 'fortify-hex', 'harvest-resources'],
  stability: ['deal-with-unrest', 'arrest-dissidents', 'execute-or-pardon-prisoners'],
  military: ['recruit-unit', 'train-army', 'deploy-army', 'outfit-army', 'disband-army', 'tend-wounded', 'request-military-aid'],
  diplomatic: ['diplomatic-mission', 'aid-another', 'infiltration']
};


