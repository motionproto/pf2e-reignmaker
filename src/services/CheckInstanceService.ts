/**
 * CheckInstanceService - Lifecycle management for check instances
 * 
 * Provides unified state management for all check-based gameplay:
 * - Incidents (Unrest phase)
 * - Events (Events phase)
 * - Actions (Actions phase - future)
 * 
 * Replaces fragmented state management where incidents stored in
 * turnState.unrestPhase.incidentResolution and events stored in
 * activeEventInstances.
 */

import { updateKingdom } from '../stores/KingdomStore';
import type { ActiveCheckInstance } from '../models/CheckInstance';
import type { KingdomData } from '../actors/KingdomActor';
import type { ResolutionData } from '../types/modifiers';
/**
 * Service for managing check instances (incidents, events, actions)
 * Provides lifecycle management and state synchronization across clients
 */
export class CheckInstanceService {
  /**
   * Create a new check instance
   */
  async createInstance(
    checkType: 'incident' | 'event' | 'action',
    checkId: string,
    checkData: any,
    currentTurn: number,
    metadata?: any
  ): Promise<string> {
    const instanceId = `T${currentTurn}-${checkId}-${Date.now()}`;
    const instance: ActiveCheckInstance = {
      instanceId,
      checkType,
      checkId,
      checkData,
      metadata,
      createdTurn: currentTurn,
      status: 'pending'
    };
    
    await updateKingdom(kingdom => {
      if (!kingdom.activeCheckInstances) kingdom.activeCheckInstances = [];
      kingdom.activeCheckInstances.push(instance);

    });
    
    return instanceId;
  }
  
  /**
   * Get instance by ID
   */
  getInstance(instanceId: string, kingdom: KingdomData): ActiveCheckInstance | null {
    return kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId) || null;
  }
  
  /**
   * Get active instance by check type and check ID
   */
  getActiveInstance(checkType: string, checkId: string, kingdom: KingdomData): ActiveCheckInstance | null {
    return kingdom.activeCheckInstances?.find(i => 
      i.checkType === checkType && 
      i.checkId === checkId && 
      i.status === 'pending'
    ) || null;
  }
  
  /**
   * Get all pending instances by type
   */
  getPendingInstances(checkType: string, kingdom: KingdomData): ActiveCheckInstance[] {
    return kingdom.activeCheckInstances?.filter(i => 
      i.checkType === checkType && 
      i.status === 'pending'
    ) || [];
  }
  
  /**
   * Store outcome (after skill check, before effects applied)
   */
  async storeOutcome(
    instanceId: string,
    outcome: string,
    resolutionData: ResolutionData,
    actorName: string,
    skillName: string,
    effect: string,
    rollBreakdown?: any
  ): Promise<void> {
    await updateKingdom(kingdom => {
      const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
      if (instance) {
        instance.appliedOutcome = {
          outcome: outcome as any,
          actorName,
          skillName,
          effect,
          modifiers: resolutionData.numericModifiers as any,
          manualEffects: resolutionData.manualEffects,
          specialEffects: [],
          shortfallResources: [],
          rollBreakdown,
          effectsApplied: false
        };
        instance.status = 'resolved';

      } else {
        console.error(`❌ [CheckInstanceService] Instance ${instanceId} not found when storing outcome`);
      }
    });
  }
  
  /**
   * Mark effects as applied (after "Apply Result" clicked)
   */
  async markApplied(instanceId: string): Promise<void> {
    await updateKingdom(kingdom => {
      if (!kingdom.activeCheckInstances) return;
      
      // CRITICAL: Create new array atomically (no mutation before reassignment)
      kingdom.activeCheckInstances = kingdom.activeCheckInstances.map(instance => {
        if (instance.instanceId === instanceId && instance.appliedOutcome) {
          // Create new instance with updated nested properties
          return {
            ...instance,
            status: 'applied' as const,
            appliedOutcome: {
              ...instance.appliedOutcome,
              effectsApplied: true
            }
          };
        }
        return instance;
      });

    });
  }
  
  /**
   * Update shortfall resources after effects application
   */
  async updateShortfallResources(instanceId: string, resources: string[]): Promise<void> {
    await updateKingdom(kingdom => {
      const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
      if (instance?.appliedOutcome) {
        instance.appliedOutcome.shortfallResources = resources;
      }
    });
  }
  
  /**
   * Clear completed instances (for specific check type)
   * IMPORTANT: For events, this only clears 'resolved' or 'applied' status, NOT 'pending' (ongoing events)
   */
  async clearCompleted(checkType: 'incident' | 'event', currentTurn?: number): Promise<void> {
    await updateKingdom(kingdom => {
      const before = kingdom.activeCheckInstances?.length || 0;
      
      if (checkType === 'event') {
        // Events: Keep pending (ongoing), clear resolved/applied
        kingdom.activeCheckInstances = kingdom.activeCheckInstances?.filter(i => 
          i.checkType !== 'event' || i.status === 'pending'
        ) || [];

      } else {
        // Incidents: Clear all non-pending (incidents don't have ongoing state)
        kingdom.activeCheckInstances = kingdom.activeCheckInstances?.filter(i => 
          i.checkType !== checkType || i.status === 'pending'
        ) || [];

      }
    });
  }
  
  /**
   * Clear ongoing event appliedOutcome (reset for re-resolution each turn)
   * Called at the start of Events phase to clear last turn's resolution
   */
  async clearOngoingResolutions(checkType: 'event'): Promise<void> {
    await updateKingdom(kingdom => {
      if (!kingdom.activeCheckInstances) return;
      
      // CRITICAL: Create new array atomically (no mutation before reassignment)
      // This ensures Foundry VTT detects changes and syncs across clients
      kingdom.activeCheckInstances = kingdom.activeCheckInstances.map(instance => {
        if (instance.checkType === checkType && instance.status === 'pending') {
          // Create new instance with cleared resolution data
          return {
            ...instance,
            appliedOutcome: undefined,
            resolutionProgress: undefined
          };
        }
        return instance;
      });
    });
  }
  
  /**
   * Clear specific instance
   */
  async clearInstance(instanceId: string): Promise<void> {
    await updateKingdom(kingdom => {
      const before = kingdom.activeCheckInstances?.length || 0;
      kingdom.activeCheckInstances = kingdom.activeCheckInstances?.filter(i => 
        i.instanceId !== instanceId
      ) || [];
      const after = kingdom.activeCheckInstances.length;
      if (before > after) {

      }
    });
  }
  
  /**
   * Update resolution progress (for multi-player coordination)
   */
  async updateResolutionProgress(
    instanceId: string,
    playerId: string,
    playerName: string,
    outcome: string,
    updates: {
      selectedChoices?: number[];
      rolledDice?: Record<string, number>;
    }
  ): Promise<void> {
    await updateKingdom(kingdom => {
      const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
      if (instance) {
        if (!instance.resolutionProgress) {
          instance.resolutionProgress = {
            playerId,
            playerName,
            timestamp: Date.now(),
            outcome,
            selectedChoices: [],
            rolledDice: {}
          };
        }
        
        if (updates.selectedChoices !== undefined) {
          instance.resolutionProgress.selectedChoices = updates.selectedChoices;
        }
        if (updates.rolledDice !== undefined) {
          instance.resolutionProgress.rolledDice = {
            ...instance.resolutionProgress.rolledDice,
            ...updates.rolledDice
          };
        }

      }
    });
  }
  
  /**
   * Clear resolution progress
   */
  async clearResolutionProgress(instanceId: string): Promise<void> {
    await updateKingdom(kingdom => {
      const instance = kingdom.activeCheckInstances?.find(i => i.instanceId === instanceId);
      if (instance) {
        instance.resolutionProgress = undefined;

      }
    });
  }
}

// Export singleton instance
export const checkInstanceService = new CheckInstanceService();

/**
 * Factory function for creating service instance
 */
export async function createCheckInstanceService(): Promise<CheckInstanceService> {
  return checkInstanceService;
}
