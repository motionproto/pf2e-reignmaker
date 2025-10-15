/**
 * BuildStructureController
 * 
 * Business logic for structure construction and build queue management.
 * Follows architecture: NO UI logic, returns results for components to handle.
 */

import { get } from 'svelte/store';
import { kingdomData, updateKingdom } from '../stores/KingdomStore';
import { structuresService } from '../services/structures';
import type { Structure } from '../models/Structure';
import type { BuildProject } from '../services/buildQueue';
import { BuildProjectManager } from '../services/buildQueue';
import { SettlementTier } from '../models/Settlement';
import { logger } from '../utils/Logger';

export interface AvailabilityCheck {
  canAfford: boolean;
  missing: Map<string, number>;
}

export interface BuildResult {
  success: boolean;
  error?: string;
  project?: BuildProject;
}

/**
 * Convert SettlementTier enum to numeric tier (1-4)
 */
function settlementTierToNumber(tier: SettlementTier): number {
  switch (tier) {
    case SettlementTier.VILLAGE: return 1;
    case SettlementTier.TOWN: return 2;
    case SettlementTier.CITY: return 3;
    case SettlementTier.METROPOLIS: return 4;
    default: return 1;
  }
}

/**
 * Get maximum structures allowed for settlement tier
 */
function getMaxStructuresForTier(tier: SettlementTier): number {
  switch (tier) {
    case SettlementTier.VILLAGE: return 2;
    case SettlementTier.TOWN: return 4;
    case SettlementTier.CITY: return 8;
    case SettlementTier.METROPOLIS: return Infinity;
    default: return 0;
  }
}

export async function createBuildStructureController() {
  return {
    /**
     * Get structures available to build in a settlement
     * Now returns all buildable structures regardless of capacity (GM can override)
     */
    getAvailableStructuresForSettlement(settlementId: string): Structure[] {
      const kingdom = get(kingdomData);
      if (!kingdom) return [];

      const settlement = kingdom.settlements.find(s => s.id === settlementId);
      if (!settlement) return [];

      const allStructures = structuresService.getAllStructures();
      const settlementTierNum = settlementTierToNumber(settlement.tier);
      
      return allStructures.filter(structure => {
        // Check minimum settlement tier requirement (support structures only)
        if (structure.minimumSettlementTier && structure.minimumSettlementTier > settlementTierNum) {
          return false;
        }
        
        // Can't build if already have it
        if (settlement.structureIds.includes(structure.id)) return false;
        
        // Note: No longer filtering by capacity - GM can override
        
        return true;
      });
    },

    /**
     * Check if settlement is at capacity for structures
     */
    isSettlementAtCapacity(settlementId: string): { atCapacity: boolean; current: number; max: number } {
      const kingdom = get(kingdomData);
      if (!kingdom) return { atCapacity: false, current: 0, max: 0 };

      const settlement = kingdom.settlements.find(s => s.id === settlementId);
      if (!settlement) return { atCapacity: false, current: 0, max: 0 };

      const maxStructures = getMaxStructuresForTier(settlement.tier);
      const current = settlement.structureIds.length;
      
      return {
        atCapacity: maxStructures !== Infinity && current >= maxStructures,
        current,
        max: maxStructures
      };
    },

    /**
     * Check if kingdom can afford a structure
     */
    canAffordStructure(structureId: string): AvailabilityCheck {
      const kingdom = get(kingdomData);
      if (!kingdom) return { canAfford: false, missing: new Map() };

      const structure = structuresService.getStructure(structureId);
      if (!structure) return { canAfford: false, missing: new Map() };

      const missing = new Map<string, number>();
      let canAfford = true;

      Object.entries(structure.constructionCost).forEach(([resource, needed]) => {
        if (!needed) return;
        
        const available = kingdom.resources[resource] || 0;
        if (available < needed) {
          missing.set(resource, needed - available);
          canAfford = false;
        }
      });

      return { canAfford, missing };
    },

    /**
     * Add structure to build queue
     */
    async addToBuildQueue(structureId: string, settlementId: string): Promise<BuildResult> {
      const kingdom = get(kingdomData);
      if (!kingdom) {
        return { success: false, error: 'Kingdom not found' };
      }

      const structure = structuresService.getStructure(structureId);
      if (!structure) {
        return { success: false, error: 'Structure not found' };
      }

      const settlement = kingdom.settlements.find(s => s.id === settlementId);
      if (!settlement) {
        return { success: false, error: 'Settlement not found' };
      }

      // Check if already in queue
      const existingProject = kingdom.buildQueue?.find(
        p => p.structureId === structureId && p.settlementName === settlement.name
      );
      if (existingProject) {
        return { success: false, error: 'Structure already in build queue' };
      }

      // Check if already built
      if (settlement.structureIds.includes(structureId)) {
        return { success: false, error: 'Structure already built in this settlement' };
      }

      // Create build project - use service to handle Map→object conversion
      const costMap = new Map<string, number>();
      Object.entries(structure.constructionCost).forEach(([resource, amount]) => {
        if (amount && amount > 0) {
          costMap.set(resource, amount);
        }
      });

      const { buildQueueService } = await import('../services/buildQueue');
      const project = buildQueueService.createProject(
        structureId,
        structure.name,
        structure.tier || 1,
        structure.category || 'unknown',
        costMap,
        settlement.name
      );

      // Add to build queue via service
      await buildQueueService.addProject(project);

      logger.debug(`✅ [BuildStructureController] Added ${structure.name} to build queue for ${settlement.name}`);
      return { success: true, project };
    },

    /**
     * Allocate resources to a build project
     * Returns true if resources were allocated
     */
    async allocateResources(projectId: string, resource: string, amount: number): Promise<boolean> {
      const kingdom = get(kingdomData);
      if (!kingdom) return false;

      const project = kingdom.buildQueue?.find(p => p.id === projectId);
      if (!project) return false;

      // Check if we have the resources
      const available = kingdom.resources[resource] || 0;
      if (available < amount) {
        logger.warn(`⚠️  [BuildStructureController] Insufficient ${resource}: need ${amount}, have ${available}`);
        return false;
      }

      // Allocate to project
      const allocated = BuildProjectManager.allocateResources(project, resource, amount);
      if (allocated === 0) return false;

      // Deduct from kingdom resources and update project
      await updateKingdom(k => {
        k.resources[resource] = (k.resources[resource] || 0) - allocated;
        
        // Update the project in the queue
        const projectInQueue = k.buildQueue?.find(p => p.id === projectId);
        if (projectInQueue) {
          BuildProjectManager.applyPendingAllocation(projectInQueue);
        }
      });

      logger.debug(`✅ [BuildStructureController] Allocated ${allocated} ${resource} to project ${projectId}`);
      return true;
    },

    /**
     * Complete a build project and add structure to settlement
     */
    async completeProject(projectId: string): Promise<BuildResult> {
      const kingdom = get(kingdomData);
      if (!kingdom) {
        return { success: false, error: 'Kingdom not found' };
      }

      const project = kingdom.buildQueue?.find(p => p.id === projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      if (!BuildProjectManager.isComplete(project)) {
        return { success: false, error: 'Project not complete' };
      }

      const settlement = kingdom.settlements.find(s => s.name === project.settlementName);
      if (!settlement) {
        return { success: false, error: 'Settlement not found' };
      }

      // Add structure to settlement and remove from queue
      await updateKingdom(k => {
        const s = k.settlements.find(s => s.name === project.settlementName);
        if (s) {
          if (!s.structureIds.includes(project.structureId)) {
            s.structureIds.push(project.structureId);
          }
        }

        // Remove from build queue
        if (k.buildQueue) {
          k.buildQueue = k.buildQueue.filter(p => p.id !== projectId);
        }
      });

      logger.debug(`✅ [BuildStructureController] Completed ${project.structureName} in ${project.settlementName}`);
      return { success: true, project };
    },

    /**
     * Get all active build projects
     */
    getActiveBuildProjects(): BuildProject[] {
      const kingdom = get(kingdomData);
      return kingdom?.buildQueue || [];
    },

    /**
     * Cancel a build project (returns invested resources)
     */
    async cancelProject(projectId: string): Promise<BuildResult> {
      const kingdom = get(kingdomData);
      if (!kingdom) {
        return { success: false, error: 'Kingdom not found' };
      }

      const project = kingdom.buildQueue?.find(p => p.id === projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Return invested resources
      await updateKingdom(k => {
        project.invested.forEach((amount, resource) => {
          k.resources[resource] = (k.resources[resource] || 0) + amount;
        });

        // Remove from queue
        if (k.buildQueue) {
          k.buildQueue = k.buildQueue.filter(p => p.id !== projectId);
        }
      });

      logger.debug(`🔄 [BuildStructureController] Cancelled project ${project.structureName}`);
      return { success: true, project };
    }
  };
}
