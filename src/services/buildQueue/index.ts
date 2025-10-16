// BuildQueueService - Complete build queue management
import { get } from 'svelte/store';
import { kingdomData, kingdomActor } from '../../stores/KingdomStore';
import type { BuildProject } from './BuildProject';
import { BuildProjectManager } from './BuildProject';
import { logger } from '../../utils/Logger';

/**
 * BuildQueueService - Single source of truth for all build queue operations
 * Responsibilities:
 * - Create projects (with proper serialization)
 * - CRUD operations
 * - Resource allocation
 * - Utility functions (completion, progress, etc.)
 * - Data normalization for UI
 */
export class BuildQueueService {
  /**
   * Get all projects in the build queue
   * Returns projects with normalized cost data (plain objects, not Maps)
   */
  getAllProjects(): BuildProject[] {
    const kingdom = get(kingdomData);
    const projects = kingdom?.buildQueue || [];
    
    // Normalize totalCost and related Maps to plain objects for UI consumption
    return projects.map(p => ({
      ...p,
      totalCost: p.totalCost instanceof Map 
        ? Object.fromEntries(p.totalCost) 
        : p.totalCost,
      remainingCost: p.remainingCost instanceof Map
        ? Object.fromEntries(p.remainingCost)
        : p.remainingCost,
      invested: p.invested instanceof Map
        ? Object.fromEntries(p.invested)
        : p.invested,
      pendingAllocation: p.pendingAllocation instanceof Map
        ? Object.fromEntries(p.pendingAllocation)
        : p.pendingAllocation
    } as any as BuildProject));
  }

  /**
   * Get all projects for a specific settlement
   */
  getSettlementProjects(settlementName: string): BuildProject[] {
    return this.getAllProjects().filter(
      project => project.settlementName === settlementName
    );
  }

  /**
   * Get a specific project by ID
   */
  getProject(projectId: string): BuildProject | undefined {
    return this.getAllProjects().find(p => p.id === projectId);
  }

  /**
   * Check if a structure is already queued for a settlement
   */
  isStructureQueued(structureId: string, settlementName: string): boolean {
    return this.getAllProjects().some(
      p => p.structureId === structureId && p.settlementName === settlementName
    );
  }

  /**
   * Create a new project with proper Map→object conversion for storage
   */
  createProject(
    structureId: string,
    structureName: string,
    tier: number,
    category: string,
    cost: Map<string, number>,
    settlementName: string
  ): BuildProject {
    logger.debug(`🏗️ [BuildQueueService] Creating project for ${structureName}...`);
    logger.debug(`📊 Input cost Map:`, Array.from(cost.entries()));
    
    // Use BuildProjectManager to create with Maps
    const project = BuildProjectManager.createProject(
      structureId,
      structureName,
      tier,
      category,
      cost,
      settlementName
    );
    
    // Convert Maps to plain objects for JSON serialization
    const converted = {
      ...project,
      totalCost: Object.fromEntries(project.totalCost) as any,
      remainingCost: Object.fromEntries(project.remainingCost) as any,
      invested: Object.fromEntries(project.invested) as any,
      pendingAllocation: Object.fromEntries(project.pendingAllocation) as any
    };
    
    logger.debug(`✅ [BuildQueueService] Converted totalCost:`, converted.totalCost);
    return converted;
  }

  /**
   * Add a new project to the queue
   */
  async addProject(project: BuildProject): Promise<void> {
    logger.debug(`🏗️ [BuildQueueService] Adding project: ${project.structureName} in ${project.settlementName}`);
    
    const actor = get(kingdomActor);
    if (!actor) throw new Error('Kingdom actor not available');

    await actor.updateKingdom(k => {
      if (!k.buildQueue) k.buildQueue = [];
      k.buildQueue.push(project);
    });

    logger.debug(`✅ [BuildQueueService] Project added to queue`);
  }

  /**
   * Update a project in the queue
   */
  async updateProject(projectId: string, updates: Partial<BuildProject>): Promise<void> {
    logger.debug(`🏗️ [BuildQueueService] Updating project: ${projectId}`);
    
    const actor = get(kingdomActor);
    if (!actor) throw new Error('Kingdom actor not available');

    await actor.updateKingdom(k => {
      if (!k.buildQueue) return;
      
      const project = k.buildQueue.find(p => p.id === projectId);
      if (project) {
        Object.assign(project, updates);
        logger.debug(`✅ [BuildQueueService] Project updated`);
      } else {
        logger.warn(`⚠️ [BuildQueueService] Project not found: ${projectId}`);
      }
    });
  }

  /**
   * Remove a project from the queue
   */
  async removeProject(projectId: string): Promise<void> {
    logger.debug(`🏗️ [BuildQueueService] Removing project: ${projectId}`);
    
    const actor = get(kingdomActor);
    if (!actor) throw new Error('Kingdom actor not available');

    await actor.updateKingdom(k => {
      if (!k.buildQueue) return;
      
      const initialLength = k.buildQueue.length;
      k.buildQueue = k.buildQueue.filter(p => p.id !== projectId);
      
      if (k.buildQueue.length < initialLength) {
        logger.debug(`✅ [BuildQueueService] Project removed from queue`);
      } else {
        logger.warn(`⚠️ [BuildQueueService] Project not found: ${projectId}`);
      }
    });
  }

  /**
   * Clear all projects from the queue
   */
  async clearQueue(): Promise<void> {
    logger.debug(`🏗️ [BuildQueueService] Clearing build queue`);
    
    const actor = get(kingdomActor);
    if (!actor) throw new Error('Kingdom actor not available');

    await actor.updateKingdom(k => {
      k.buildQueue = [];
    });

    logger.debug(`✅ [BuildQueueService] Build queue cleared`);
  }

  /**
   * Allocate resources to a project
   * Returns true if allocation was successful
   */
  async allocateResources(
    projectId: string, 
    resource: string, 
    amount: number
  ): Promise<boolean> {
    logger.debug(`🏗️ [BuildQueueService] Allocating ${amount} ${resource} to project ${projectId}`);
    
    const project = this.getProject(projectId);
    if (!project) {
      logger.warn(`⚠️ [BuildQueueService] Project not found: ${projectId}`);
      return false;
    }

    // Use BuildProjectManager to calculate allocation
    const allocated = BuildProjectManager.allocateResources(project, resource, amount);
    
    if (allocated > 0) {
      // Update the project in the kingdom
      await this.updateProject(projectId, {
        pendingAllocation: project.pendingAllocation
      });
      
      logger.debug(`✅ [BuildQueueService] Allocated ${allocated} ${resource}`);
      return true;
    }

    logger.warn(`⚠️ [BuildQueueService] Could not allocate ${resource}`);
    return false;
  }

  /**
   * Apply pending allocations to a project
   */
  async applyPendingAllocations(projectId: string): Promise<void> {
    logger.debug(`🏗️ [BuildQueueService] Applying pending allocations to project ${projectId}`);
    
    const project = this.getProject(projectId);
    if (!project) {
      logger.warn(`⚠️ [BuildQueueService] Project not found: ${projectId}`);
      return;
    }

    // Apply allocations using BuildProjectManager
    BuildProjectManager.applyPendingAllocation(project);

    // Update the project
    await this.updateProject(projectId, {
      invested: project.invested,
      remainingCost: project.remainingCost,
      pendingAllocation: project.pendingAllocation,
      progress: project.progress
    });

    logger.debug(`✅ [BuildQueueService] Pending allocations applied`);
  }

  /**
   * Process partial payment for a project
   * Pays what's affordable, updates remainingCost, persists to KingdomActor
   */
  async processPartialPayment(
    projectId: string,
    availableResources: Record<string, number>
  ): Promise<{
    paid: Record<string, number>;
    isComplete: boolean;
  }> {
    logger.debug(`💰 [BuildQueueService] Processing partial payment for ${projectId}`);
    
    const actor = get(kingdomActor);
    if (!actor) {
      logger.error('❌ [BuildQueueService] No KingdomActor available');
      return { paid: {}, isComplete: false };
    }

    const paid: Record<string, number> = {};
    let isComplete = false;

    await actor.updateKingdom(k => {
      const project = k.buildQueue.find(p => p.id === projectId);
      if (!project) {
        logger.warn(`⚠️ [BuildQueueService] Project not found: ${projectId}`);
        return;
      }

      // Process each resource in remainingCost
      const remainingEntries = Object.entries(project.remainingCost || {});
      
      for (const [resource, needed] of remainingEntries) {
        const available = availableResources[resource] || 0;
        const toPay = Math.min(available, needed as number);
        
        if (toPay > 0) {
          paid[resource] = toPay;
          
          // Update remainingCost
          const currentRemaining = (project.remainingCost as any)[resource] || 0;
          const newRemaining = currentRemaining - toPay;
          
          if (newRemaining <= 0) {
            delete (project.remainingCost as any)[resource];
          } else {
            (project.remainingCost as any)[resource] = newRemaining;
          }
        }
      }

      // Check if complete
      isComplete = Object.keys(project.remainingCost || {}).length === 0;
      
      logger.debug(`💰 Paid:`, paid);
      logger.debug(`✅ Complete: ${isComplete}`);
    });

    return { paid, isComplete };
  }

  /**
   * Complete a project - add to settlement, mark as completed
   */
  async completeProject(projectId: string): Promise<void> {
    logger.debug(`🏗️ [BuildQueueService] Completing project ${projectId}`);
    
    const actor = get(kingdomActor);
    if (!actor) {
      logger.error('❌ [BuildQueueService] No KingdomActor available');
      return;
    }

    let settlementId: string | undefined;
    let structureId: string | undefined;

    await actor.updateKingdom(k => {
      const project = k.buildQueue.find(p => p.id === projectId);
      if (!project) {
        logger.warn(`⚠️ [BuildQueueService] Project not found: ${projectId}`);
        return;
      }

      // Find settlement and cache IDs
      const settlement = k.settlements.find(s => s.name === project.settlementName);
      if (settlement) {
        settlementId = settlement.id;
        structureId = project.structureId;
      }

      // Mark as completed (don't remove from queue yet)
      project.isCompleted = true;
      project.completedTurn = k.currentTurn;
      logger.debug(`✅ Marked project as completed (Turn ${k.currentTurn})`);
    });

    // Add structure using centralized service (handles recalculation)
    if (settlementId && structureId) {
      const { settlementService } = await import('../settlements');
      await settlementService.addStructure(settlementId, structureId);
      logger.debug(`✅ [BuildQueueService] Structure added and capacities recalculated`);
    }
  }
}

// Export singleton instance
export const buildQueueService = new BuildQueueService();

// Re-export types and utilities
export type { BuildProject } from './BuildProject';
export { BuildProjectManager } from './BuildProject';
