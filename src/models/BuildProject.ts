// Auto-converted and fixed from BuildProject.kt
// Build project management for Kingdom construction

/**
 * Represents a construction project in the build queue
 */
export interface BuildProject {
  id: string;
  structureName: string;
  tier: number;
  category: string;
  totalCost: Map<string, number>;
  invested: Map<string, number>; // Resources already applied
  pendingAllocation: Map<string, number>; // This turn's allocation
  settlementName: string;
}

/**
 * Army unit in the kingdom
 */
export interface Army {
  id: string;
  name: string;
  level: number;
  isSupported: boolean;
  turnsUnsupported: number;
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
    
    project.totalCost.forEach((needed, resource) => {
      const alreadyInvested = project.invested.get(resource) || 0;
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
    for (const [resource, needed] of project.totalCost) {
      const invested = project.invested.get(resource) || 0;
      if (invested < needed) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Get completion percentage of a project
   */
  static getCompletionPercentage(project: BuildProject): number {
    if (project.totalCost.size === 0) return 100;
    
    let totalNeeded = 0;
    let totalInvested = 0;
    
    project.totalCost.forEach((needed) => {
      totalNeeded += needed;
    });
    
    project.invested.forEach((amount) => {
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
    });
    project.pendingAllocation.clear();
  }
  
  /**
   * Create a new build project
   */
  static createProject(
    structureName: string,
    tier: number,
    category: string,
    cost: Map<string, number>,
    settlementName: string
  ): BuildProject {
    return {
      id: `${settlementName}-${structureName}-${Date.now()}`,
      structureName,
      tier,
      category,
      totalCost: new Map(cost),
      invested: new Map(),
      pendingAllocation: new Map(),
      settlementName
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
