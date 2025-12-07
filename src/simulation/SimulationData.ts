/**
 * Simulation Data
 * 
 * Standalone action/event/incident definitions for simulation.
 * These are simplified versions that don't have TypeScript execution logic
 * or Svelte component dependencies.
 */

import type { EventModifier } from '../types/modifiers';

/**
 * Simplified check definition for simulation
 */
export interface SimCheck {
  id: string;
  name: string;
  checkType: 'action' | 'event' | 'incident';
  category?: string;
  severity?: 'minor' | 'moderate' | 'major';
  
  /** Resource costs (actions only) */
  cost?: Record<string, number>;
  
  /** Outcomes with modifiers */
  outcomes: {
    criticalSuccess?: { modifiers: EventModifier[] };
    success?: { modifiers: EventModifier[] };
    failure?: { modifiers: EventModifier[] };
    criticalFailure?: { modifiers: EventModifier[] };
  };
}

/**
 * Action definitions for simulation
 */
export const SIM_ACTIONS: SimCheck[] = [
  // Economic Actions
  {
    id: 'deal-with-unrest',
    name: 'Deal with Unrest',
    checkType: 'action',
    category: 'unrest-reduction',
    outcomes: {
      criticalSuccess: { modifiers: [] }, // -2 unrest (handled in simplified effects)
      success: { modifiers: [] }, // -1 unrest (handled in simplified effects)
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'sell-surplus',
    name: 'Sell Surplus',
    checkType: 'action',
    category: 'economic',
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
    checkType: 'action',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [] }, // Player chooses resources
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] }
    }
  },
  {
    id: 'harvest-resources',
    name: 'Harvest Resources',
    checkType: 'action',
    category: 'resource-generation',
    outcomes: {
      criticalSuccess: { modifiers: [] }, // Handled in simplified effects
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'gold', value: -1, duration: 'immediate' }] }
    }
  },
  {
    id: 'collect-stipend',
    name: 'Collect Stipend',
    checkType: 'action',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'request-economic-aid',
    name: 'Request Economic Aid',
    checkType: 'action',
    category: 'economic',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // Territory Actions
  {
    id: 'claim-hexes',
    name: 'Claim Hexes',
    checkType: 'action',
    category: 'territory-expansion',
    outcomes: {
      criticalSuccess: { modifiers: [] }, // Handled in simplified effects
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'send-scouts',
    name: 'Send Scouts',
    checkType: 'action',
    category: 'territory-expansion',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'build-roads',
    name: 'Build Roads',
    checkType: 'action',
    category: 'infrastructure',
    cost: { lumber: 1, stone: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'fortify-hex',
    name: 'Fortify Hex',
    checkType: 'action',
    category: 'infrastructure',
    cost: { stone: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'create-worksite',
    name: 'Create Worksite',
    checkType: 'action',
    category: 'food-production',
    cost: { lumber: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'build-structure',
    name: 'Build Structure',
    checkType: 'action',
    category: 'infrastructure',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'establish-settlement',
    name: 'Establish Settlement',
    checkType: 'action',
    category: 'territory-expansion',
    cost: { gold: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'upgrade-settlement',
    name: 'Upgrade Settlement',
    checkType: 'action',
    category: 'infrastructure',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // Military Actions
  {
    id: 'recruit-unit',
    name: 'Recruit Unit',
    checkType: 'action',
    category: 'military',
    cost: { gold: 2 },
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'train-army',
    name: 'Train Army',
    checkType: 'action',
    category: 'military',
    cost: { gold: 1 },
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'deploy-army',
    name: 'Deploy Army',
    checkType: 'action',
    category: 'military',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  }
];

/**
 * Event definitions for simulation
 * All 37 events from the actual game
 */
export const SIM_EVENTS: SimCheck[] = [
  // ============================================================
  // PRIORITY EVENTS (#1-9)
  // ============================================================
  {
    id: 'assassination-attempt',
    name: 'Assassination Attempt',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'food-surplus',
    name: 'Food Surplus',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'food', formula: '2d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'food', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'food-shortage',
    name: 'Food Shortage',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }] },
      failure: { modifiers: [
        { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'food', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'grand-tournament',
    name: 'Grand Tournament',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [
        { type: 'static', resource: 'fame', value: 2, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
      ] },
      success: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'land-rush',
    name: 'Land Rush',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'notorious-heist',
    name: 'Notorious Heist',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '3d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'bandit-activity',
    name: 'Bandit Activity',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'archaeological-find',
    name: 'Archaeological Find',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '3d6', duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
      ] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'natural-disaster',
    name: 'Natural Disaster',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', negative: true, duration: 'immediate' }] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  
  // ============================================================
  // BENEFICIAL EVENTS (#10-23)
  // ============================================================
  {
    id: 'boomtown',
    name: 'Boomtown',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'criminal-trial',
    name: 'Criminal Trial',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'diplomatic-overture',
    name: 'Diplomatic Overture',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
      ] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'economic-surge',
    name: 'Economic Surge',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'festive-invitation',
    name: 'Festive Invitation',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 2, duration: 'immediate' }] },
      success: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'good-weather',
    name: 'Good Weather',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'food', formula: '2d4', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'food', formula: '1d4', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'immigration',
    name: 'Immigration',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
      ] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'military-exercises',
    name: 'Military Exercises',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'natures-blessing',
    name: "Nature's Blessing",
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [
        { type: 'dice', resource: 'food', formula: '2d6', duration: 'immediate' },
        { type: 'dice', resource: 'lumber', formula: '1d6', duration: 'immediate' }
      ] },
      success: { modifiers: [{ type: 'dice', resource: 'food', formula: '1d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'pilgrimage',
    name: 'Pilgrimage',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }
      ] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'remarkable-treasure',
    name: 'Remarkable Treasure',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '4d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'scholarly-discovery',
    name: 'Scholarly Discovery',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 2, duration: 'immediate' }] },
      success: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [] }
    }
  },
  {
    id: 'trade-agreement',
    name: 'Trade Agreement',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', duration: 'immediate' }] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  {
    id: 'visiting-celebrity',
    name: 'Visiting Celebrity',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 2, duration: 'immediate' }] },
      success: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] }
    }
  },
  
  // ============================================================
  // DANGEROUS EVENTS (#24-37)
  // ============================================================
  {
    id: 'cult-activity',
    name: 'Cult Activity',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'demand-expansion',
    name: 'Demand for Expansion',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'demand-structure',
    name: 'Demand for Structure',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'drug-den',
    name: 'Drug Den',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'feud',
    name: 'Feud',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'inquisition',
    name: 'Inquisition',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'local-disaster',
    name: 'Local Disaster',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '3d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'magical-discovery',
    name: 'Magical Discovery',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'monster-attack',
    name: 'Monster Attack',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'plague',
    name: 'Plague',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'public-scandal',
    name: 'Public Scandal',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'raiders',
    name: 'Raiders',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'sensational-crime',
    name: 'Sensational Crime',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'undead-uprising',
    name: 'Undead Uprising',
    checkType: 'event',
    outcomes: {
      criticalSuccess: { modifiers: [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  }
];

/**
 * Incident definitions for simulation (triggered by unrest)
 * All 30 incidents from the actual game
 */
export const SIM_INCIDENTS: SimCheck[] = [
  // ============================================================
  // MINOR INCIDENTS (unrest 5-7) - 8 total
  // ============================================================
  {
    id: 'bandit-raids',
    name: 'Bandit Raids',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }] }
    }
  },
  {
    id: 'corruption-scandal',
    name: 'Corruption Scandal',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'crime-wave',
    name: 'Crime Wave',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'diplomatic-incident',
    name: 'Diplomatic Incident',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'emigration-threat',
    name: 'Emigration Threat',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'protests',
    name: 'Protests',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'rising-tensions',
    name: 'Rising Tensions',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'work-stoppage',
    name: 'Work Stoppage',
    checkType: 'incident',
    severity: 'minor',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' }] }
    }
  },
  
  // ============================================================
  // MODERATE INCIDENTS (unrest 8-9) - 10 total
  // ============================================================
  {
    id: 'assassin-attack',
    name: 'Assassin Attack',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'diplomatic-crisis',
    name: 'Diplomatic Crisis',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'disease-outbreak',
    name: 'Disease Outbreak',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'infrastructure-damage',
    name: 'Infrastructure Damage',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }] }
    }
  },
  {
    id: 'mass-exodus',
    name: 'Mass Exodus',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'production-strike',
    name: 'Production Strike',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'food', formula: '1d6', negative: true, duration: 'immediate' },
        { type: 'dice', resource: 'lumber', formula: '1d6', negative: true, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'food', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'dice', resource: 'lumber', formula: '2d6', negative: true, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'riot',
    name: 'Riot',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] }
    }
  },
  {
    id: 'settlement-crisis',
    name: 'Settlement Crisis',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'tax-revolt',
    name: 'Tax Revolt',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '3d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'trade-embargo',
    name: 'Trade Embargo',
    checkType: 'incident',
    severity: 'moderate',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' }] }
    }
  },
  
  // ============================================================
  // MAJOR INCIDENTS (unrest 10+) - 12 total
  // ============================================================
  {
    id: 'border-raid',
    name: 'Border Raid',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ] },
      criticalFailure: { modifiers: [
        { type: 'dice', resource: 'gold', formula: '4d6', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ] }
    }
  },
  {
    id: 'economic-crash',
    name: 'Economic Crash',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'dice', resource: 'gold', formula: '1d6', negative: true, duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '5d6', negative: true, duration: 'immediate' }] }
    }
  },
  {
    id: 'guerrilla-movement',
    name: 'Guerrilla Movement',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'international-crisis',
    name: 'International Crisis',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'international-scandal',
    name: 'International Scandal',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'mass-desertion-threat',
    name: 'Mass Desertion Threat',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'noble-conspiracy',
    name: 'Noble Conspiracy',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 4, duration: 'immediate' }] }
    }
  },
  {
    id: 'prison-breaks',
    name: 'Prison Breaks',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'religious-schism',
    name: 'Religious Schism',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'secession-crisis',
    name: 'Secession Crisis',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }] }
    }
  },
  {
    id: 'settlement-collapse',
    name: 'Settlement Collapse',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'static', resource: 'unrest', value: 4, duration: 'immediate' }] }
    }
  },
  {
    id: 'trade-war',
    name: 'Trade War',
    checkType: 'incident',
    severity: 'major',
    outcomes: {
      criticalSuccess: { modifiers: [] },
      success: { modifiers: [] },
      failure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '3d6', negative: true, duration: 'immediate' }] },
      criticalFailure: { modifiers: [{ type: 'dice', resource: 'gold', formula: '5d6', negative: true, duration: 'immediate' }] }
    }
  }
];

/**
 * Get action by category
 */
export function getActionsByCategory(category: string): SimCheck[] {
  return SIM_ACTIONS.filter(a => a.category === category);
}

/**
 * Get incidents by severity
 */
export function getIncidentsBySeverity(severity: 'minor' | 'moderate' | 'major'): SimCheck[] {
  return SIM_INCIDENTS.filter(i => i.severity === severity);
}

