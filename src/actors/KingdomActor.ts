/**
 * KingdomActor - Foundry Actor class for kingdom management
 * Following the _pf2e-kingmaker-tools pattern for direct Foundry integration
 */

import { TurnPhase } from '../models/KingdomState';
import type { Settlement, Army, BuildProject } from '../models/KingdomState';
import type { KingdomEvent } from '../models/Events';
import type { KingdomModifier } from '../models/Modifiers';

// Phase step definition
export interface PhaseStep {
  id: string;
  name: string;
  completed: boolean;
}

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
  
  // Simplified phase management with step arrays - single source of truth
  currentPhaseSteps: PhaseStep[];
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
      currentPhaseSteps: [],
      oncePerTurnActions: [],
      playerActions: {},
      eventDC: 4
    };
    
    await this.setKingdom(defaultKingdom);
  }
  
  /**
   * Initialize phase steps for current phase - sets up currentPhaseSteps array
   */
  async initializePhaseSteps(steps: Array<{ id: string; name: string }>): Promise<void> {
    await this.updateKingdom((kingdom) => {
      // Set up current phase steps array
      kingdom.currentPhaseSteps = steps.map(step => ({
        id: step.id,
        name: step.name,
        completed: false
      }));
      
      console.log(`✅ [KingdomActor] Initialized ${steps.length} steps for ${kingdom.currentPhase}:`, 
        steps.map(s => s.name));
    });
  }

  /**
   * NEW: Complete a specific step and check if phase is done
   */
  async completePhaseStep(stepId: string): Promise<{ phaseComplete: boolean }> {
    let phaseComplete = false;
    
    await this.updateKingdom((kingdom) => {
      const step = kingdom.currentPhaseSteps.find(s => s.id === stepId);
      if (step) {
        step.completed = true;
        console.log(`[KingdomActor] Completed step '${step.name}' (${stepId})`);
        
        // Check if all steps are completed
        phaseComplete = kingdom.currentPhaseSteps.every(s => s.completed);
        if (phaseComplete) {
          console.log(`✅ [KingdomActor] All steps completed for ${kingdom.currentPhase}`);
        }
      } else {
        console.warn(`[KingdomActor] Step '${stepId}' not found in current phase steps`);
      }
    });
    
    return { phaseComplete };
  }

  /**
   * NEW: Check if current phase is complete (simplified)
   */
  isCurrentPhaseComplete(): boolean {
    const kingdom = this.getKingdom();
    if (!kingdom) return false;
    
    // NEW: Phase complete when all currentPhaseSteps are completed
    const allStepsCompleted = kingdom.currentPhaseSteps.length > 0 && 
                              kingdom.currentPhaseSteps.every(step => step.completed);
    
    console.log(`[KingdomActor] Phase ${kingdom.currentPhase} completion check:`, {
      allStepsCompleted,
      totalSteps: kingdom.currentPhaseSteps.length,
      completedSteps: kingdom.currentPhaseSteps.filter(s => s.completed).length
    });
    
    return allStepsCompleted;
  }

  /**
   * Get remaining steps for current phase
   */
  getRemainingSteps(): Array<{ id: string; name: string; completed: boolean }> {
    const kingdom = this.getKingdom();
    if (!kingdom) {
      return [];
    }
    
    return kingdom.currentPhaseSteps.filter(step => !step.completed);
  }

  /**
   * Get all steps for current phase (completed and incomplete)
   */
  getAllSteps(): Array<{ id: string; name: string; completed: boolean }> {
    const kingdom = this.getKingdom();
    if (!kingdom) {
      return [];
    }
    
    return [...kingdom.currentPhaseSteps];
  }

  /**
   * NEW: Check if a specific step is completed
   */
  isStepCompleted(stepId: string): boolean {
    const kingdom = this.getKingdom();
    if (!kingdom) return false;
    
    const step = kingdom.currentPhaseSteps.find(s => s.id === stepId);
    return step?.completed || false;
  }

  /**
   * LEGACY: Mark a phase step as completed (kept for compatibility)
   */
  async markPhaseStepCompleted(stepId: string): Promise<void> {
    await this.updateKingdom((kingdom) => {
      kingdom.phaseStepsCompleted[stepId] = true;
      console.log(`[KingdomActor] LEGACY: Marked step '${stepId}' as completed`);
    });
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
    currentPhaseSteps: [],
    oncePerTurnActions: [],
    phaseStepsCompleted: {},
    phasesCompleted: [],
    playerActions: {},
    eventDC: 4
  };
}
