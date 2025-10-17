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
import { logger } from '../utils/Logger';

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
      logger.debug(`✅ [CheckInstanceService] Created ${checkType} instance: ${instanceId}`);
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
          shortfallResources: [],
          rollBreakdown,
          effectsApplied: false
        };
        instance.status = 'resolved';
        logger.debug(`✅ [CheckInstanceService] Stored outcome for: ${instanceId}`);
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
      
      logger.debug(`✅ [CheckInstanceService] Marked applied: ${instanceId}`);
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
        logger.debug(`🧹 [CheckInstanceService] Cleared ${before - kingdom.activeCheckInstances.length} resolved/applied event(s), kept pending (ongoing)`);
      } else {
        // Incidents: Clear all non-pending (incidents don't have ongoing state)
        kingdom.activeCheckInstances = kingdom.activeCheckInstances?.filter(i => 
          i.checkType !== checkType || i.status === 'pending'
        ) || [];
        logger.debug(`🧹 [CheckInstanceService] Cleared ${before - kingdom.activeCheckInstances.length} ${checkType} instance(s)`);
      }
    });
  }
  
  /**
   * Clear ongoing event appliedOutcome (reset for re-resolution each turn)
   * Called at the start of Events phase to clear last turn's resolution
   */
  async clearOngoingResolutions(checkType: 'event'): Promise<void> {
    await updateKingdom(kingdom => {
      const pendingEvents = kingdom.activeCheckInstances?.filter(i => 
        i.checkType === checkType && i.status === 'pending'
      ) || [];
      
      if (pendingEvents.length > 0) {
        logger.debug(`🔄 [CheckInstanceService] Clearing appliedOutcome from ${pendingEvents.length} ongoing event(s)`);
        pendingEvents.forEach(instance => {
          instance.appliedOutcome = undefined;
          instance.resolutionProgress = undefined;
          logger.debug(`   ✓ Reset: ${instance.checkData?.name || instance.checkId} (${instance.instanceId})`);
        });
      }
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
        logger.debug(`🧹 [CheckInstanceService] Cleared instance: ${instanceId}`);
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
        
        logger.debug(`🔄 [CheckInstanceService] Updated resolution progress: ${instanceId}`);
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
        logger.debug(`🧹 [CheckInstanceService] Cleared resolution progress: ${instanceId}`);
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
