// Turn management system for PF2e Kingdom Lite
// Auto-converted and fixed from TurnManager.kt

import { KingdomState, TurnPhase } from './KingdomState';

/**
 * Manages the turn state and progression through phases
 * Based on Reignmaker Lite rules
 */
export class TurnManager {
  private kingdomState: KingdomState;
  
  // Callbacks for UI updates
  onTurnChanged?: (turn: number) => void;
  onPhaseChanged?: (phase: TurnPhase) => void;
  onTurnEnded?: (turn: number) => void;
  onFameGained?: (amount: number) => void;
  onUnrestChanged?: (unrest: number) => void;
  
  constructor(kingdomState: KingdomState) {
    this.kingdomState = kingdomState;
  }
  
  /**
   * Start a new game/reset turns
   */
  startNewGame(): void {
    this.kingdomState.currentTurn = 1;
    this.kingdomState.currentPhase = TurnPhase.PHASE_I;
    this.kingdomState.unrest = 0;
    this.kingdomState.fame = 0;
    this.kingdomState.oncePerTurnActions.clear();
    this.onTurnChanged?.(this.kingdomState.currentTurn);
    this.onPhaseChanged?.(this.kingdomState.currentPhase);
  }
  
  /**
   * Execute the current phase
   */
  executeCurrentPhase(): void {
    switch (this.kingdomState.currentPhase) {
      case TurnPhase.PHASE_I:
        this.executePhaseI();
        break;
      case TurnPhase.PHASE_II:
        this.executePhaseII();
        break;
      case TurnPhase.PHASE_III:
        this.executePhaseIII();
        break;
      case TurnPhase.PHASE_IV:
        this.executePhaseIV();
        break;
      case TurnPhase.PHASE_V:
        this.executePhaseV();
        break;
      case TurnPhase.PHASE_VI:
        this.executePhaseVI();
        break;
    }
  }
  
  /**
   * Progress to the next phase
   */
  nextPhase(): void {
    const next = this.kingdomState.getNextPhase();
    if (next !== null) {
      this.kingdomState.currentPhase = next;
      this.onPhaseChanged?.(this.kingdomState.currentPhase);
    } else {
      // End of turn reached
      this.endTurn();
    }
  }
  
  /**
   * Skip to a specific phase (for testing or special events)
   */
  skipToPhase(phase: TurnPhase): void {
    this.kingdomState.currentPhase = phase;
    this.onPhaseChanged?.(this.kingdomState.currentPhase);
  }
  
  /**
   * End the current turn and start a new one
   */
  endTurn(): void {
    this.onTurnEnded?.(this.kingdomState.currentTurn);
    this.kingdomState.currentTurn++;
    this.kingdomState.currentPhase = TurnPhase.PHASE_I;
    this.kingdomState.oncePerTurnActions.clear();
    
    // Decrement modifier durations
    this.kingdomState.ongoingModifiers = this.kingdomState.ongoingModifiers.filter((modifier) => {
      if (modifier.duration > 0) {
        modifier.remainingTurns--;
        return modifier.remainingTurns > 0;
      } else {
        return true; // Keep permanent modifiers
      }
    });
    
    this.onTurnChanged?.(this.kingdomState.currentTurn);
    this.onPhaseChanged?.(this.kingdomState.currentPhase);
  }
  
  /**
   * Phase I: Kingdom Status
   * - Gain 1 Fame automatically (max 3)
   * - Apply ongoing modifiers
   */
  private executePhaseI(): void {
    // Gain 1 Fame at start of turn (max fame is 3)
    if (this.kingdomState.fame < 3) {
      const fameGained = 1;
      this.kingdomState.fame = Math.min(this.kingdomState.fame + fameGained, 3);
      this.onFameGained?.(fameGained);
      console.log(`Phase I: Gained ${fameGained} Fame (Total: ${this.kingdomState.fame})`);
    } else {
      console.log('Phase I: Fame already at maximum (3)');
    }
    
    // Apply ongoing modifiers
    this.kingdomState.ongoingModifiers.forEach((modifier) => {
      modifier.effect(this.kingdomState);
      console.log(`Applied modifier: ${modifier.name}`);
    });
  }
  
  /**
   * Phase II: Resources
   * - Collect resources from worksites
   * - Food consumption for settlements and armies
   * - Military support checks
   * - Build queue processing
   */
  private executePhaseII(): void {
    // Phase II is now handled step-by-step through UI interactions
    console.log('Phase II: Resources - Awaiting step-by-step execution');
  }
  
  /**
   * Execute Step 1: Collect Resources
   */
  executeResourcesStep1(): void {
    if (this.kingdomState.isPhaseStepCompleted('resources_collect')) {
      console.log('Step 1 already completed');
      return;
    }
    
    // Use centralized resource collection from KingdomState
    const production = this.kingdomState.calculateProduction();
    this.kingdomState.collectResources();
    
    // Log production details
    production.forEach((amount, resource) => {
      console.log(`Collected ${amount} ${resource}`);
    });
    
    // Add gold from revenue structures
    // TODO: Calculate gold from structures when implemented
    
    this.kingdomState.markPhaseStepCompleted('resources_collect');
    console.log('Phase II Step 1: Resources collected');
  }
  
  /**
   * Execute Step 2: Food Consumption
   */
  executeResourcesStep2(): void {
    if (this.kingdomState.isPhaseStepCompleted('resources_consumption')) {
      console.log('Step 2 already completed');
      return;
    }
    
    const totalFoodNeeded = this.kingdomState.getTotalFoodConsumption();
    const currentFood = this.kingdomState.resources.get('food') || 0;
    
    // Use centralized food consumption processing
    const shortage = this.kingdomState.processFoodConsumption();
    
    if (shortage > 0) {
      console.log(`Food shortage! Need ${totalFoodNeeded}, have ${currentFood}. Unrest increased by ${shortage} (Total: ${this.kingdomState.unrest})`);
      this.onUnrestChanged?.(this.kingdomState.unrest);
    } else {
      console.log(`Consumed ${totalFoodNeeded} food (Remaining: ${this.kingdomState.resources.get('food')})`);
    }
    
    this.kingdomState.markPhaseStepCompleted('resources_consumption');
  }
  
  /**
   * Execute Step 3: Military Support
   */
  executeResourcesStep3(): void {
    if (this.kingdomState.isPhaseStepCompleted('resources_military')) {
      console.log('Step 3 already completed');
      return;
    }
    
    const totalSupport = this.kingdomState.getTotalArmySupport();
    const armyCount = this.kingdomState.armies.length;
    const unsupportedCount = this.kingdomState.getUnsupportedArmies();
    
    if (unsupportedCount > 0) {
      // Mark unsupported armies and add unrest
      this.kingdomState.armies.forEach((army, index) => {
        if (index >= totalSupport) {
          // For now, just add unrest. Full morale checks can be implemented later
          this.kingdomState.unrest += 1;
          console.log(`Army '${army.name}' is unsupported. +1 Unrest (Total: ${this.kingdomState.unrest})`);
        }
      });
      this.onUnrestChanged?.(this.kingdomState.unrest);
    } else if (armyCount > 0) {
      console.log(`All ${armyCount} armies are supported`);
    }
    
    this.kingdomState.markPhaseStepCompleted('resources_military');
    console.log('Phase II Step 3: Military support processed');
  }
  
  /**
   * Execute Step 4: Build Queue
   */
  executeResourcesStep4(): void {
    if (this.kingdomState.isPhaseStepCompleted('resources_build')) {
      console.log('Step 4 already completed');
      return;
    }
    
    // Process build queue
    const completedProjects: number[] = [];
    
    this.kingdomState.buildQueue.forEach((project, index) => {
      // Check if project has remaining costs
      let isComplete = true;
      project.remainingCost.forEach((amount, resource) => {
        if (amount > 0) {
          const available = this.kingdomState.resources.get(resource) || 0;
          const toApply = Math.min(amount, available);
          if (toApply > 0) {
            project.remainingCost.set(resource, amount - toApply);
            this.kingdomState.resources.set(resource, available - toApply);
            console.log(`Applied ${toApply} ${resource} to ${project.settlementName}`);
          }
          if (project.remainingCost.get(resource)! > 0) {
            isComplete = false;
          }
        }
      });
      
      if (isComplete) {
        console.log(`${project.settlementName} construction complete!`);
        completedProjects.push(index);
      }
    });
    
    // Remove completed projects (in reverse order to maintain indices)
    completedProjects.reverse().forEach(index => {
      this.kingdomState.buildQueue.splice(index, 1);
    });
    
    // Clear non-storable resources
    this.kingdomState.clearNonStorableResources();
    console.log('Non-storable resources cleared');
    
    this.kingdomState.markPhaseStepCompleted('resources_build');
    console.log('Phase II Step 4: Build queue processed');
  }
  
  /**
   * Phase III: Unrest & Incidents
   * - Check unrest tier
   * - Roll for incidents if needed
   */
  private executePhaseIII(): void {
    let unrestTier: number;
    const unrest = this.kingdomState.unrest;
    
    if (unrest >= 0 && unrest <= 2) {
      unrestTier = 0; // Stable
    } else if (unrest >= 3 && unrest <= 5) {
      unrestTier = 1; // Discontent
    } else if (unrest >= 6 && unrest <= 8) {
      unrestTier = 2; // Turmoil
    } else {
      unrestTier = 3; // Rebellion
    }
    
    console.log(`Phase III: Unrest level ${this.kingdomState.unrest} (Tier ${unrestTier})`);
    
    // Incidents would be rolled here based on tier
    // This will be expanded when we implement the incident system
  }
  
  /**
   * Phase IV: Events
   * - Check for kingdom events
   */
  private executePhaseIV(): void {
    // This will be expanded when we implement the event system
    console.log('Phase IV: Checking for events...');
  }
  
  /**
   * Phase V: Actions
   * - Players perform kingdom actions
   */
  private executePhaseV(): void {
    // This phase is handled by player interaction
    console.log('Phase V: Awaiting player actions...');
  }
  
  /**
   * Phase VI: Resolution
   * - End of turn cleanup
   */
  private executePhaseVI(): void {
    // Use centralized method to clear non-storable resources
    this.kingdomState.clearNonStorableResources();
    
    console.log('Phase VI: End of turn cleanup complete');
  }
  
  /**
   * Check if a once-per-turn action can be performed
   */
  canPerformAction(actionId: string): boolean {
    return !this.kingdomState.oncePerTurnActions.has(actionId);
  }
  
  /**
   * Mark an action as used this turn
   */
  markActionUsed(actionId: string): void {
    this.kingdomState.oncePerTurnActions.add(actionId);
  }
  
  /**
   * Get unrest penalty for kingdom checks
   */
  getUnrestPenalty(): number {
    const unrest = this.kingdomState.unrest;
    
    if (unrest >= 0 && unrest <= 2) {
      return 0;
    } else if (unrest >= 3 && unrest <= 5) {
      return -1;
    } else if (unrest >= 6 && unrest <= 8) {
      return -2;
    } else {
      return -3;
    }
  }
  
  /**
   * Spend fame to reroll
   */
  spendFameForReroll(): boolean {
    if (this.kingdomState.fame > 0) {
      this.kingdomState.fame--;
      this.onFameGained?.(0); // Trigger update without gaining
      return true;
    } else {
      return false;
    }
  }
  
  /**
   * Get a summary of the current turn state
   */
  getTurnSummary(): string {
    const phaseConfig = this.kingdomState.currentPhase;
    return `Turn ${this.kingdomState.currentTurn} - ${phaseConfig}`;
  }
}
