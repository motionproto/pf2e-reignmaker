/**
 * DamageStructure Command Handler
 * 
 * Handles marking structures as damaged from incidents/events
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class DamageStructureHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'damageStructure';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    let count = command.count || 1;
    const settlementId = command.settlementId; // Optional: target specific settlement
    const preferredCategories = command.category ? [command.category] : command.preferredCategories;
    
    // Handle dice formula (e.g., '1d3')
    if (typeof count === 'string') {
      const roll = new Roll(count);
      await roll.evaluate({ async: true });
      count = roll.total || 1;
      logger.info(`[DamageStructureHandler] Rolled ${command.count} = ${count}`);
    }
    
    logger.info(`[DamageStructureHandler] Preparing to damage ${count} structure(s)${settlementId ? ` in settlement ${settlementId}` : ''}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[DamageStructureHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[DamageStructureHandler] No kingdom data available');
      return null;
    }
    
    // Get structure targeting service
    const { structureTargetingService } = await import('../../structures/targeting');
    
    // Select structure(s) to damage
    const selectedStructures: Array<{
      structureId: string;
      settlementId: string;
      structureName: string;
      settlementName: string;
    }> = [];
    
    // Track selected structure IDs to avoid duplicates
    const excludeStructureIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const targetResult = structureTargetingService.selectStructureForDamage({
        type: preferredCategories ? 'category-filtered' : 'random',
        preferredCategories,
        fallbackToRandom: true,
        settlementId,
        excludeStructureIds
      });
      
      if (!targetResult) {
        logger.warn(`[DamageStructureHandler] No more structures available to damage (selected ${i}/${count})`);
        break;
      }
      
      // Add to exclude list for next iteration
      excludeStructureIds.push(targetResult.structure.id);
      
      selectedStructures.push({
        structureId: targetResult.structure.id,
        settlementId: targetResult.settlement.id,
        structureName: targetResult.structure.name,
        settlementName: targetResult.settlement.name
      });
    }
    
    if (selectedStructures.length === 0) {
      logger.warn('[DamageStructureHandler] No structures available to damage');
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'No structures available to damage',
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[DamageStructureHandler] No structures to affect - skipping');
        }
      };
    }
    
    // Create one badge per structure
    const outcomeBadges = selectedStructures.map(s => ({
      icon: 'fa-house-crack',
      template: `The ${s.structureName} in ${s.settlementName} is damaged`,
      variant: 'negative' as const
    }));
    
    logger.info(`[DamageStructureHandler] Preview: ${outcomeBadges.length} structure(s) to damage`);
    
    return {
      outcomeBadges,
      commit: async () => {
        logger.info(`[DamageStructureHandler] Damaging ${selectedStructures.length} structure(s)`);
        
        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[DamageStructureHandler] No kingdom actor available during commit');
          return;
        }
        
        const { StructureCondition } = await import('../../../models/Settlement');
        
        await actor.updateKingdomData((kingdom: any) => {
          for (const selected of selectedStructures) {
            const settlement = kingdom.settlements.find((s: any) => s.id === selected.settlementId);
            if (settlement) {
              if (!settlement.structureConditions) {
                settlement.structureConditions = {};
              }
              settlement.structureConditions[selected.structureId] = StructureCondition.DAMAGED;
              logger.info(`  💥 Damaged: ${selected.structureName} in ${selected.settlementName}`);
            }
          }
        });
        
        logger.info(`[DamageStructureHandler] Successfully damaged ${selectedStructures.length} structure(s)`);
      }
    };
  }
}

