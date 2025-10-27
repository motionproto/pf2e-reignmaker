// Auto-converted and fixed from BuildProject.kt
// Build project management for Kingdom construction

import type { Army } from '../../models/Army';

// Re-export Army for backward compatibility
export type { Army };

/**
 * Represents a construction project in the build queue
 * This interface extends the KingdomState BuildProject for compatibility
 */
export interface BuildProject {
  id: string;
  structureId: string; // ID of the structure being built
  structureName: string;
  settlementName: string;
  progress: number; // 0-100 percentage complete
  totalCost: Map<string, number>;
  remainingCost: Map<string, number>;
  invested: Map<string, number>; // Resources already applied
  pendingAllocation: Map<string, number>; // This turn's allocation
  tier: number; // Structure tier requirement
  category: string; // Structure category
  isCompleted?: boolean; // True when project is finished
  completedTurn?: number; // Turn number when completed
}

/**
 * Build project manager with helper functions
 */
export class BuildProjectManager {
  /**
   * Get the remaining cost for a project
   */
  static getRemainingCost(project: BuildProject): Map<string, number> {
    const remaining = new Map<string, number>();
    
    // Handle both Map and plain object formats
    const totalCost = project.totalCost instanceof Map 
      ? project.totalCost 
      : new Map(Object.entries(project.totalCost as any) as [string, number][]);
    const invested = project.invested instanceof Map 
      ? project.invested 
      : new Map(Object.entries((project.invested as any) || {}) as [string, number][]);
    
    totalCost.forEach((needed: number, resource: string) => {
      const alreadyInvested = invested.get(resource) || 0;
      const stillNeeded = needed - alreadyInvested;
      if (stillNeeded > 0) {
        remaining.set(resource, stillNeeded);
      }
    });
    
    return remaining;
  }
  
  /**
   * Check if a project is complete
   */
  static isComplete(project: BuildProject): boolean {
    // Handle both Map and plain object formats
    const totalCost = project.totalCost instanceof Map 
      ? project.totalCost 
      : new Map(Object.entries(project.totalCost as any) as [string, number][]);
    const invested = project.invested instanceof Map 
      ? project.invested 
      : new Map(Object.entries((project.invested as any) || {}) as [string, number][]);
    
    for (const [resource, needed] of totalCost) {
      const investedAmount = invested.get(resource) || 0;
      if (investedAmount < (needed as number)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Get completion percentage of a project
   */
  static getCompletionPercentage(project: BuildProject): number {
    // Handle both Map and plain object formats
    const totalCost = project.totalCost instanceof Map 
      ? project.totalCost 
      : new Map(Object.entries(project.totalCost as any) as [string, number][]);
    const invested = project.invested instanceof Map 
      ? project.invested 
      : new Map(Object.entries((project.invested as any) || {}) as [string, number][]);
    
    if (totalCost.size === 0) return 100;
    
    let totalNeeded = 0;
    let totalInvested = 0;
    
    totalCost.forEach((needed: number) => {
      totalNeeded += needed;
    });
    
    invested.forEach((amount: number) => {
      totalInvested += amount;
    });
    
    if (totalNeeded === 0) return 100;
    return Math.floor((totalInvested / totalNeeded) * 100);
  }
  
  /**
   * Apply pending allocation to invested resources
   */
  static applyPendingAllocation(project: BuildProject): void {
    project.pendingAllocation.forEach((amount, resource) => {
      const current = project.invested.get(resource) || 0;
      project.invested.set(resource, current + amount);
      
      // Update remaining cost
      const totalNeeded = project.totalCost.get(resource) || 0;
      const newInvested = current + amount;
      const remaining = Math.max(0, totalNeeded - newInvested);
      
      if (remaining > 0) {
        project.remainingCost.set(resource, remaining);
      } else {
        project.remainingCost.delete(resource);
      }
    });
    project.pendingAllocation.clear();
    
    // Update progress
    project.progress = BuildProjectManager.getCompletionPercentage(project);
  }
  
  /**
   * Create a new build project
   */
  static createProject(
    structureId: string,
    structureName: string,
    tier: number,
    category: string,
    cost: Map<string, number>,
    settlementName: string
  ): BuildProject {
    return {
      id: `${structureId}-${settlementName}-${Date.now()}`,
      structureId,
      structureName,
      settlementName,
      progress: 0,
      totalCost: new Map(cost),
      remainingCost: new Map(cost),
      invested: new Map(),
      pendingAllocation: new Map(),
      tier,
      category
    };
  }
  
  /**
   * Allocate resources to a project (pending until applied)
   */
  static allocateResources(
    project: BuildProject,
    resource: string,
    amount: number
  ): number {
    const remaining = this.getRemainingCost(project);
    const needed = remaining.get(resource) || 0;
    const toAllocate = Math.min(amount, needed);
    
    if (toAllocate > 0) {
      const current = project.pendingAllocation.get(resource) || 0;
      project.pendingAllocation.set(resource, current + toAllocate);
    }
    
    return toAllocate; // Return amount actually allocated
  }
}
