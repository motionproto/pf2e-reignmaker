/**
 * Build Queue Service for PF2e Kingdom
 * Manages construction projects and resource allocation
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { structuresService } from '../structures';
import { settlementService } from '../settlements';
import type { BuildProject } from '../../models/BuildProject';
import { BuildProjectManager } from '../../models/BuildProject';
import type { Settlement } from '../../models/Settlement';
import type { Structure, ResourceCost } from '../../models/Structure';

export interface BuildQueueItem extends BuildProject {
  structure: Structure | undefined;
  settlement: Settlement | undefined;
  priority: number;
  estimatedCompletion?: number; // Estimated turns to complete
}

export interface ResourceAllocation {
  projectId: string;
  resource: string;
  amount: number;
}

export class BuildQueueService {
  private static instance: BuildQueueService;
  
  private constructor() {}
  
  static getInstance(): BuildQueueService {
    if (!BuildQueueService.instance) {
      BuildQueueService.instance = new BuildQueueService();
    }
    return BuildQueueService.instance;
  }
  
  /**
   * Get the current build queue with enhanced information
   */
  getBuildQueue(): BuildQueueItem[] {
    const state = get(kingdomState);
    const queue: BuildQueueItem[] = [];
    
    state.buildQueue.forEach((project, index) => {
      const structure = structuresService.getStructure(project.structureId);
      const settlement = state.settlements.find(s => s.name === project.settlementName);
      
      queue.push({
        ...project,
        structure,
        settlement,
        priority: index,
        estimatedCompletion: this.estimateCompletion(project)
      });
    });
    
    return queue;
  }
  
  /**
   * Add a new project to the build queue
   */
  addToBuildQueue(structureId: string, settlementId: string): { 
    success: boolean; 
    error?: string;
    project?: BuildProject;
  } {
    const state = get(kingdomState);
    const structure = structuresService.getStructure(structureId);
    const settlement = state.settlements.find(s => s.id === settlementId);
    
    if (!structure) {
      return { success: false, error: 'Structure not found' };
    }
    
    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }
    
    // Check if structure can be built in this settlement
    const availableStructures = structuresService.getAvailableStructures(settlement);
    if (!availableStructures.find(s => s.id === structureId)) {
      return { success: false, error: 'Structure cannot be built in this settlement' };
    }
    
    // Check for duplicates in queue
    const existingInQueue = state.buildQueue.find(
      p => p.structureId === structureId && p.settlementName === settlement.name
    );
    if (existingInQueue) {
      return { success: false, error: 'Structure is already in build queue for this settlement' };
    }
    
    // Create the build project
    const costMap = new Map<string, number>();
    Object.entries(structure.constructionCost).forEach(([resource, amount]) => {
      costMap.set(resource, amount);
    });
    
    const project = BuildProjectManager.createProject(
      structureId,
      structure.name,
      structure.minimumSettlementTier || 1,
      structure.category,
      costMap,
      settlement.name
    );
    
    // Add to kingdom state
    kingdomState.update(s => {
      s.buildQueue.push(project);
      return s;
    });
    
    return { success: true, project };
  }
  
  /**
   * Remove a project from the build queue
   * Returns any invested resources to the kingdom
   */
  removeFromBuildQueue(projectId: string): {
    success: boolean;
    refundedResources?: Map<string, number>;
    error?: string;
  } {
    const state = get(kingdomState);
    const projectIndex = state.buildQueue.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return { success: false, error: 'Project not found in build queue' };
    }
    
    const project = state.buildQueue[projectIndex];
    const refundedResources = new Map(project.invested);
    
    // Return invested resources to kingdom
    kingdomState.update(s => {
      refundedResources.forEach((amount, resource) => {
        const current = s.resources.get(resource) || 0;
        s.resources.set(resource, current + amount);
      });
      
      // Remove from queue
      s.buildQueue.splice(projectIndex, 1);
      
      return s;
    });
    
    return { success: true, refundedResources };
  }
  
  /**
   * Reorder projects in the build queue
   */
  reorderBuildQueue(projectId: string, newIndex: number): boolean {
    const state = get(kingdomState);
    const currentIndex = state.buildQueue.findIndex(p => p.id === projectId);
    
    if (currentIndex === -1 || newIndex < 0 || newIndex >= state.buildQueue.length) {
      return false;
    }
    
    kingdomState.update(s => {
      const project = s.buildQueue.splice(currentIndex, 1)[0];
      s.buildQueue.splice(newIndex, 0, project);
      return s;
    });
    
    return true;
  }
  
  /**
   * Allocate resources to a project from kingdom resources
   */
  allocateResources(allocations: ResourceAllocation[]): {
    success: boolean;
    allocated: Map<string, number>;
    errors: string[];
  } {
    const state = get(kingdomState);
    const allocated = new Map<string, number>();
    const errors: string[] = [];
    
    // Validate all allocations first
    for (const allocation of allocations) {
      const project = state.buildQueue.find(p => p.id === allocation.projectId);
      if (!project) {
        errors.push(`Project ${allocation.projectId} not found`);
        continue;
      }
      
      const available = state.resources.get(allocation.resource) || 0;
      const currentTotal = allocated.get(allocation.resource) || 0;
      
      if (available < currentTotal + allocation.amount) {
        errors.push(`Not enough ${allocation.resource}: need ${currentTotal + allocation.amount}, have ${available}`);
        continue;
      }
      
      // Check if project needs this resource
      const remaining = BuildProjectManager.getRemainingCost(project);
      const needed = remaining.get(allocation.resource) || 0;
      
      if (needed === 0) {
        errors.push(`Project ${project.structureName} doesn't need ${allocation.resource}`);
        continue;
      }
      
      const toAllocate = Math.min(allocation.amount, needed);
      allocated.set(allocation.resource, (allocated.get(allocation.resource) || 0) + toAllocate);
    }
    
    if (errors.length > 0) {
      return { success: false, allocated: new Map(), errors };
    }
    
    // Apply allocations
    kingdomState.update(s => {
      for (const allocation of allocations) {
        const project = s.buildQueue.find(p => p.id === allocation.projectId);
        if (!project) continue;
        
        // Deduct from kingdom resources
        const current = s.resources.get(allocation.resource) || 0;
        s.resources.set(allocation.resource, current - allocation.amount);
        
        // Add to project
        const actuallyAllocated = BuildProjectManager.allocateResources(
          project,
          allocation.resource,
          allocation.amount
        );
        
        // Apply pending allocation immediately
        BuildProjectManager.applyPendingAllocation(project);
      }
      
      // Check for completed projects
      const completed = s.buildQueue.filter(p => BuildProjectManager.isComplete(p));
      for (const project of completed) {
        this.completeProject(project.id);
      }
      
      return s;
    });
    
    return { success: true, allocated, errors: [] };
  }
  
  /**
   * Complete a project and add the structure to the settlement
   */
  private completeProject(projectId: string): {
    success: boolean;
    structureId?: string;
    settlementName?: string;
    error?: string;
  } {
    const state = get(kingdomState);
    const projectIndex = state.buildQueue.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return { success: false, error: 'Project not found' };
    }
    
    const project = state.buildQueue[projectIndex];
    const settlement = state.settlements.find(s => s.name === project.settlementName);
    
    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }
    
    // Get the structure ID from the project
    const structureId = (project as any).structureId || project.structureName.toLowerCase().replace(/\s+/g, '-');
    
    kingdomState.update(s => {
      // Add structure to settlement
      const targetSettlement = s.settlements.find(set => set.id === settlement.id);
      if (targetSettlement) {
        targetSettlement.structureIds.push(structureId);
      }
      
      // Remove from build queue
      s.buildQueue.splice(projectIndex, 1);
      
      return s;
    });
    
    // Log completion
    const game = (window as any).game;
    if (game?.socket) {
      game.socket.emit('module.pf2e-reignmaker', {
        type: 'structure-completed',
        structureId,
        settlementName: settlement.name,
        userId: game.user?.id
      });
    }
    
    return { 
      success: true, 
      structureId,
      settlementName: settlement.name
    };
  }
  
  /**
   * Estimate turns to complete a project based on current resources and production
   */
  private estimateCompletion(project: BuildProject): number | undefined {
    const remaining = BuildProjectManager.getRemainingCost(project);
    if (remaining.size === 0) return 0;
    
    const state = get(kingdomState);
    const production = state.calculateProduction();
    
    let maxTurns = 0;
    
    remaining.forEach((needed, resource) => {
      const available = state.resources.get(resource) || 0;
      const perTurn = production.get(resource) || 0;
      
      if (available >= needed) {
        // Can complete this turn
        return;
      }
      
      if (perTurn === 0) {
        // No production, can't estimate
        maxTurns = undefined;
        return;
      }
      
      const turnsNeeded = Math.ceil((needed - available) / perTurn);
      maxTurns = Math.max(maxTurns, turnsNeeded);
    });
    
    return maxTurns;
  }
  
  /**
   * Auto-allocate resources to projects based on priority
   */
  autoAllocateResources(): {
    success: boolean;
    allocations: Map<string, Map<string, number>>; // projectId -> resource -> amount
  } {
    const state = get(kingdomState);
    const allocations = new Map<string, Map<string, number>>();
    
    // Process projects in priority order
    for (const project of state.buildQueue) {
      const projectAllocations = new Map<string, number>();
      const remaining = BuildProjectManager.getRemainingCost(project);
      
      remaining.forEach((needed, resource) => {
        const available = state.resources.get(resource) || 0;
        const toAllocate = Math.min(available, needed);
        
        if (toAllocate > 0) {
          projectAllocations.set(resource, toAllocate);
          
          // Update available for next project
          const newAmount = available - toAllocate;
          state.resources.set(resource, newAmount);
        }
      });
      
      if (projectAllocations.size > 0) {
        allocations.set(project.id, projectAllocations);
      }
    }
    
    // Apply the allocations
    const allocationArray: ResourceAllocation[] = [];
    allocations.forEach((resources, projectId) => {
      resources.forEach((amount, resource) => {
        allocationArray.push({ projectId, resource, amount });
      });
    });
    
    if (allocationArray.length > 0) {
      this.allocateResources(allocationArray);
    }
    
    return { success: true, allocations };
  }
  
  /**
   * Get available structures for a settlement
   */
  getAvailableStructuresForSettlement(settlementId: string): Structure[] {
    const state = get(kingdomState);
    const settlement = state.settlements.find(s => s.id === settlementId);
    
    if (!settlement) {
      return [];
    }
    
    return structuresService.getAvailableStructures(settlement);
  }
  
  /**
   * Check if resources are sufficient for a structure
   */
  canAffordStructure(structureId: string): {
    canAfford: boolean;
    missing: Map<string, number>;
  } {
    const structure = structuresService.getStructure(structureId);
    if (!structure) {
      return { canAfford: false, missing: new Map() };
    }
    
    const state = get(kingdomState);
    const missing = new Map<string, number>();
    
    Object.entries(structure.constructionCost).forEach(([resource, needed]) => {
      const available = state.resources.get(resource) || 0;
      if (available < needed) {
        missing.set(resource, needed - available);
      }
    });
    
    return { canAfford: missing.size === 0, missing };
  }
}

// Export singleton instance
export const buildQueueService = BuildQueueService.getInstance();
