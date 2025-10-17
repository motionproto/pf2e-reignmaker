/**
 * Repair Structure Controller
 * Handles the repair structure action workflow
 */

import { structuresService } from '../services/structures';
import { settlementStructureManagement } from '../services/structures/management';
import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import type { Settlement, StructureCondition } from '../models/Settlement';
import type { Structure, ResourceCost } from '../models/Structure';
import { logger } from '../utils/Logger';

export interface RepairableStructure {
  structureId: string;
  structureName: string;
  structureCategory: string;
  structureTier: number;
  settlementId: string;
  settlementName: string;
  halfCost: ResourceCost;
}

export interface RepairCostChoice {
  type: 'dice' | 'halfCost';
  cost: ResourceCost;
  description: string;
}

export interface RepairResult {
  success: boolean;
  requiresChoice?: boolean;
  choices?: RepairCostChoice[];
  error?: string;
}

export async function createRepairStructureController() {
  return {
    /**
     * Get custom component for repair action based on outcome
     * Returns component constructor (awaited import)
     */
    async getCustomComponent(outcome: string, structureId?: string, settlementId?: string): Promise<any> {
      // Only show cost choice on success
      if (outcome === 'success') {
        const module = await import('../view/kingdom/components/RepairCostChoice.svelte');
        return module.default;
      }
      return null;
    },

    /**
     * Get structure by ID
     */
    async getStructureById(structureId: string): Promise<Structure | null> {
      const structure = structuresService.getStructure(structureId);
      return structure || null;
    },

    /**
     * Get all damaged structures that can be repaired
     * Returns only the lowest tier damaged structure per category per settlement
     */
    getRepairableStructures(): RepairableStructure[] {
      const actor = getKingdomActor();
      if (!actor) return [];
      
      const kingdom = actor.getKingdom();
      if (!kingdom) return [];
      
      const repairableList: RepairableStructure[] = [];
      
      for (const settlement of kingdom.settlements) {
        // Get damaged structures grouped by category
        const damagedByCategory = new Map<string, Structure[]>();
        
        for (const structureId of settlement.structureIds) {
          if (structuresService.isStructureDamaged(settlement, structureId)) {
            const structure = structuresService.getStructure(structureId);
            if (structure) {
              if (!damagedByCategory.has(structure.category)) {
                damagedByCategory.set(structure.category, []);
              }
              damagedByCategory.get(structure.category)!.push(structure);
            }
          }
        }
        
        // For each category, only include the lowest tier
        damagedByCategory.forEach(structures => {
          const lowestTier = Math.min(...structures.map(s => s.tier));
          const lowestStructure = structures.find(s => s.tier === lowestTier);
          
          if (lowestStructure) {
            repairableList.push({
              structureId: lowestStructure.id,
              structureName: lowestStructure.name,
              structureCategory: lowestStructure.category,
              structureTier: lowestStructure.tier,
              settlementId: settlement.id,
              settlementName: settlement.name,
              halfCost: structuresService.calculateHalfBuildCost(lowestStructure)
            });
          }
        });
      }
      
      return repairableList;
    },
    
    /**
     * Process repair outcome based on skill check result
     */
    async processRepair(
      structureId: string,
      settlementId: string,
      outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): Promise<RepairResult> {
      const structure = structuresService.getStructure(structureId);
      if (!structure) {
        return { success: false, error: 'Structure not found' };
      }
      
      logger.info(`🔧 [RepairStructureController] Processing repair: ${structure.name} - ${outcome}`);
      
      switch (outcome) {
        case 'criticalSuccess':
          // Free repair
          await this.removeCondition(structureId, settlementId);
          logger.info(`✅ [RepairStructureController] Free repair successful`);
          return { success: true };
          
        case 'success':
          // Offer choice between 1d4 gold or half cost
          const halfCost = structuresService.calculateHalfBuildCost(structure);
          const diceRoll = Math.floor(Math.random() * 4) + 1;
          
          const choices: RepairCostChoice[] = [
            {
              type: 'dice',
              cost: { gold: diceRoll },
              description: `Pay ${diceRoll} gold (rolled 1d4)`
            },
            {
              type: 'halfCost',
              cost: halfCost,
              description: this.formatCostDescription(halfCost)
            }
          ];
          
          logger.info(`🔧 [RepairStructureController] Repair choice required`, choices);
          return {
            success: true,
            requiresChoice: true,
            choices
          };
          
        case 'failure':
          // No repair, no cost
          logger.info(`⚠️ [RepairStructureController] Repair failed - no changes`);
          return { success: true };
          
        case 'criticalFailure':
          // Lose 1 gold (handled by modifier in action definition)
          // No repair
          logger.info(`❌ [RepairStructureController] Critical failure - 1 gold lost`);
          return { success: true };
          
        default:
          return { success: false, error: 'Invalid outcome' };
      }
    },
    
    /**
     * Apply repair and deduct chosen cost
     */
    async applyRepairWithCost(
      structureId: string,
      settlementId: string,
      cost: ResourceCost
    ): Promise<{ success: boolean; error?: string }> {
      const actor = getKingdomActor();
      if (!actor) {
        return { success: false, error: 'No kingdom actor available' };
      }
      
      const kingdom = actor.getKingdom();
      if (!kingdom) {
        return { success: false, error: 'No kingdom data available' };
      }
      
      // Check if kingdom can afford the cost
      for (const [resource, amount] of Object.entries(cost)) {
        const available = kingdom.resources[resource] || 0;
        if (available < amount) {
          return { 
            success: false, 
            error: `Not enough ${resource} (need ${amount}, have ${available})` 
          };
        }
      }
      
      // Deduct resources and repair structure
      logger.info(`💰 [RepairStructureController] Deducting cost:`, cost);
      logger.info(`💰 [RepairStructureController] Kingdom resources before:`, kingdom.resources);
      
      await updateKingdom(k => {
        for (const [resource, amount] of Object.entries(cost)) {
          logger.info(`  💰 Deducting ${amount} ${resource} (current: ${(k.resources as any)[resource]})`);
          if ((k.resources as any)[resource] !== undefined) {
            (k.resources as any)[resource] -= amount;
            logger.info(`  ✅ New value: ${(k.resources as any)[resource]}`);
          } else {
            logger.error(`  ❌ Resource ${resource} not found in kingdom.resources!`);
          }
        }
      });
      
      await this.removeCondition(structureId, settlementId);
      
      logger.info(`✅ [RepairStructureController] Repair complete with cost:`, cost);
      return { success: true };
    },
    
    /**
     * Remove damaged condition from structure
     */
    async removeCondition(structureId: string, settlementId: string): Promise<void> {
      const { StructureCondition } = await import('../models/Settlement');
      await settlementStructureManagement.updateStructureCondition(
        structureId,
        settlementId,
        StructureCondition.GOOD
      );
      
      // Recalculate settlement derived properties
      const { settlementService } = await import('../services/settlements');
      await settlementService.updateSettlementDerivedProperties(settlementId);
      
      logger.info(`🔧 [RepairStructureController] Removed damaged condition from ${structureId}`);
    },
    
    /**
     * Format cost description for display
     */
    formatCostDescription(cost: ResourceCost): string {
      const parts: string[] = [];
      
      for (const [resource, amount] of Object.entries(cost)) {
        const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
        parts.push(`${amount} ${resourceName}`);
      }
      
      return `Pay ${parts.join(', ')} (half original cost)`;
    }
  };
}
