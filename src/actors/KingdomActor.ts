/**
 * KingdomActor - Foundry Actor class for kingdom management
 * Following the _pf2e-kingmaker-tools pattern for direct Foundry integration
 */

import { TurnPhase } from '../models/KingdomState';
import type { Settlement, Army, BuildProject } from '../models/KingdomState';
import type { KingdomEvent } from '../models/Events';
import type { KingdomModifier } from '../models/Modifiers';

// Simplified, serializable kingdom data structure
export interface KingdomData {
  // Core progression
  currentTurn: number;
  currentPhase: TurnPhase;
  
  // Resources - simple object instead of Map
  resources: Record<string, number>;
  
  // Territory
  hexes: Array<{
    id: string;
    terrain: string;
    worksite?: { type: string } | null;
    hasSpecialTrait?: boolean;
    name?: string;
  }>;
  settlements: Settlement[];
  size: number;
  worksiteCount: Record<string, number>;
  cachedProduction: Record<string, number>;
  
  // Military & Construction
  armies: Army[];
  buildQueue: BuildProject[];
  
  // Kingdom stats
  unrest: number;
  imprisonedUnrest: number;
  fame: number;
  isAtWar: boolean;
  
  // Events & Modifiers
  currentEvent: KingdomEvent | null;
  continuousEvents: KingdomEvent[];
  modifiers: KingdomModifier[];
  
  // Phase management - simple objects instead of Maps/Sets
  phaseStepsCompleted: Record<string, boolean>;
  phasesCompleted: string[];
  oncePerTurnActions: string[];
  
  // Player actions - simple object instead of Map
  playerActions: Record<string, {
    playerId: string;
    playerName: string;
    playerColor: string;
    actionSpent: boolean;
    spentInPhase?: TurnPhase;
  }>;
  
  // Event/incident tracking
  currentEventId?: string | null;
  currentIncidentId?: string | null;
  incidentRoll?: number | null;
  eventStabilityRoll?: number | null;
  eventRollDC?: number | null;
  eventTriggered?: boolean | null;
  eventDC: number;
}

export class KingdomActor extends Actor {
  private static readonly MODULE_ID = 'pf2e-reignmaker';
  private static readonly KINGDOM_DATA_KEY = 'kingdom-data';
  
  /**
   * Get kingdom data from actor flags
   */
  getKingdom(): KingdomData | null {
    const data = this.getFlag(KingdomActor.MODULE_ID, KingdomActor.KINGDOM_DATA_KEY) as KingdomData;
    return data || null;
  }
  
  /**
   * Set kingdom data to actor flags - triggers automatic synchronization
   */
  async setKingdom(kingdom: KingdomData): Promise<void> {
    await this.setFlag(KingdomActor.MODULE_ID, KingdomActor.KINGDOM_DATA_KEY, kingdom);
  }
  
  /**
   * Update kingdom data with a function - similar to Svelte store pattern
   */
  async updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void> {
    const kingdom = this.getKingdom();
    if (!kingdom) {
      console.warn('[KingdomActor] No kingdom data found, cannot update');
      return;
    }
    
    // Apply the update
    updater(kingdom);
    
    // Save back to flags - triggers automatic sync
    await this.setKingdom(kingdom);
  }
  
  /**
   * Initialize kingdom with default data
   */
  async initializeKingdom(name: string = 'New Kingdom'): Promise<void> {
    const defaultKingdom: KingdomData = {
      currentTurn: 1,
      currentPhase: TurnPhase.STATUS,
      resources: {
        gold: 0,
        food: 0,
        lumber: 0,
        stone: 0,
        ore: 0,
        luxuries: 0
      },
      hexes: [],
      settlements: [],
      size: 0,
      worksiteCount: {},
      cachedProduction: {},
      armies: [],
      buildQueue: [],
      unrest: 0,
      imprisonedUnrest: 0,
      fame: 0,
      isAtWar: false,
      currentEvent: null,
      continuousEvents: [],
      modifiers: [],
      phaseStepsCompleted: {},
      phasesCompleted: [],
      oncePerTurnActions: [],
      playerActions: {},
      eventDC: 4
    };
    
    await this.setKingdom(defaultKingdom);
  }
  
  /**
   * Advance to next phase - handles both phase progression and turn advancement
   * Uses semantic phase names for better maintainability
   */
  async advancePhase(): Promise<void> {
    await this.updateKingdom((kingdom) => {
      const nextPhase = this.getNextPhase(kingdom.currentPhase);
      
      if (nextPhase) {
        // Advance to next phase
        kingdom.currentPhase = nextPhase;
        console.log(`[KingdomActor] Advanced to ${kingdom.currentPhase}`);
      } else {
        // End of turn - advance to next turn
        kingdom.currentTurn += 1;
        kingdom.currentPhase = TurnPhase.STATUS;
        
        // Clear turn-specific data
        kingdom.phaseStepsCompleted = {};
        kingdom.phasesCompleted = [];
        kingdom.oncePerTurnActions = [];
        
        // Clear non-storable resources
        kingdom.resources.lumber = 0;
        kingdom.resources.stone = 0;
        kingdom.resources.ore = 0;
        
        // Reset player actions
        Object.values(kingdom.playerActions).forEach(action => {
          action.actionSpent = false;
          action.spentInPhase = undefined;
        });
        
        // Clear event/incident tracking
        kingdom.currentEventId = null;
        kingdom.currentIncidentId = null;
        kingdom.incidentRoll = null;
        kingdom.eventStabilityRoll = null;
        kingdom.eventRollDC = null;
        kingdom.eventTriggered = null;
        
        console.log(`[KingdomActor] Advanced to Turn ${kingdom.currentTurn}, Phase I`);
      }
    });
  }
  
  /**
   * Mark a phase step as completed
   */
  async markPhaseStepCompleted(stepId: string): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.phaseStepsCompleted[stepId] = true;
      console.log(`[KingdomActor] Marked step '${stepId}' as completed`);
      
      // Check if phase should be marked as complete
      const requiredSteps = this.getRequiredStepsForPhase(kingdom.currentPhase);
      console.log(`[KingdomActor] Required steps for ${kingdom.currentPhase}:`, requiredSteps);
      console.log(`[KingdomActor] Completed steps:`, kingdom.phaseStepsCompleted);
      
      const allCompleted = requiredSteps.every(step => kingdom.phaseStepsCompleted[step] === true);
      console.log(`[KingdomActor] All steps completed: ${allCompleted}`);
      
      if (allCompleted && !kingdom.phasesCompleted.includes(kingdom.currentPhase)) {
        kingdom.phasesCompleted.push(kingdom.currentPhase);
        console.log(`[KingdomActor] Phase ${kingdom.currentPhase} marked as complete`);
      }
    });
  }
  
  /**
   * Check if current phase is complete
   */
  isCurrentPhaseComplete(): boolean {
    const kingdom = this.getKingdom();
    if (!kingdom) return false;
    
    // Only check if phase is in completed list - no fallbacks
    const phaseCompleted = kingdom.phasesCompleted.includes(kingdom.currentPhase);
    
    console.log(`[KingdomActor] Phase ${kingdom.currentPhase} completion check:`, {
      phaseCompleted,
      completedPhases: kingdom.phasesCompleted,
      completedSteps: kingdom.phaseStepsCompleted
    });
    
    return phaseCompleted;
  }
  
  /**
   * Modify resource amounts
   */
  async modifyResource(resource: string, amount: number): Promise<void> {
    await this.updateKingdom((kingdom) => {
      const current = kingdom.resources[resource] || 0;
      kingdom.resources[resource] = Math.max(0, current + amount);
    });
  }
  
  /**
   * Set resource to specific amount
   */
  async setResource(resource: string, amount: number): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.resources[resource] = Math.max(0, amount);
    });
  }
  
  /**
   * Add settlement
   */
  async addSettlement(settlement: Settlement): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.settlements.push(settlement);
    });
  }
  
  /**
   * Remove settlement
   */
  async removeSettlement(settlementId: string): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.settlements = kingdom.settlements.filter(s => s.id !== settlementId);
    });
  }
  
  /**
   * Update settlement
   */
  async updateSettlement(settlementId: string, updates: Partial<Settlement>): Promise<void> {
    await this.updateKingdom((kingdom) => {
      const index = kingdom.settlements.findIndex(s => s.id === settlementId);
      if (index >= 0) {
        kingdom.settlements[index] = { ...kingdom.settlements[index], ...updates };
      }
    });
  }
  
  /**
   * Add army
   */
  async addArmy(army: Army): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.armies.push(army);
    });
  }
  
  /**
   * Remove army
   */
  async removeArmy(armyId: string): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.armies = kingdom.armies.filter(a => a.id !== armyId);
    });
  }
  
  /**
   * Add modifier
   */
  async addModifier(modifier: KingdomModifier): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.modifiers.push(modifier);
    });
  }
  
  /**
   * Remove modifier
   */
  async removeModifier(modifierId: string): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.modifiers = kingdom.modifiers.filter(m => m.id !== modifierId);
    });
  }
  
  /**
   * Get next phase in sequence - uses PHASE_ORDER for maintainability
   */
  private getNextPhase(currentPhase: TurnPhase): TurnPhase | null {
    const { PHASE_ORDER } = require('../models/KingdomState');
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    
    if (currentIndex >= 0 && currentIndex < PHASE_ORDER.length - 1) {
      return PHASE_ORDER[currentIndex + 1];
    }
    
    return null; // End of turn
  }

  /**
   * Get required steps for a phase - using semantic names
   */
  private getRequiredStepsForPhase(phase: TurnPhase): string[] {
    const { TurnPhaseConfig } = require('../models/KingdomState');
    const phaseConfig = TurnPhaseConfig[phase];
    
    // Map semantic phase names to required steps
    const stepsByPhaseName: Record<string, string[]> = {
      'Kingdom Status': ['gain-fame', 'apply-modifiers'],
      'Resources': ['resources-collect'],
      'Unrest & Incidents': ['calculate-unrest'],
      'Events': ['resolve-event'],
      'Actions': [], // No required steps for actions phase
      'Upkeep': ['upkeep-food', 'upkeep-military', 'upkeep-build']
    };
    
    return stepsByPhaseName[phaseConfig?.displayName] || [];
  }
}

/**
 * Create default kingdom data
 */
export function createDefaultKingdom(name: string = 'New Kingdom'): KingdomData {
  return {
    currentTurn: 1,
    currentPhase: TurnPhase.STATUS,
    resources: {
      gold: 0,
      food: 0,
      lumber: 0,
      stone: 0,
      ore: 0,
      luxuries: 0
    },
    hexes: [],
    settlements: [],
    size: 0,
    worksiteCount: {},
    cachedProduction: {},
    armies: [],
    buildQueue: [],
    unrest: 0,
    imprisonedUnrest: 0,
    fame: 0,
    isAtWar: false,
    currentEvent: null,
    continuousEvents: [],
    modifiers: [],
    phaseStepsCompleted: {},
    phasesCompleted: [],
    oncePerTurnActions: [],
    playerActions: {},
    eventDC: 4
  };
}
