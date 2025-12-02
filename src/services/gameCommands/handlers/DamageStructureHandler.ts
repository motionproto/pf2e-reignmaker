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
    const count = command.count || 1;
    
    logger.info(`[DamageStructureHandler] Preparing to damage ${count} structure(s)`);
    
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
    
    for (let i = 0; i < count; i++) {
      const targetResult = structureTargetingService.selectStructureForDamage({
        type: 'random',
        fallbackToRandom: true
      });
      
      if (!targetResult) {
        logger.warn(`[DamageStructureHandler] No more structures available to damage (selected ${i}/${count})`);
        break;
      }
      
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
    
    // Create badge text
    let badgeText: string;
    if (selectedStructures.length === 1) {
      badgeText = `${selectedStructures[0].structureName} in ${selectedStructures[0].settlementName} will be damaged`;
    } else {
      badgeText = `${selectedStructures.length} structures will be damaged: ${selectedStructures.map(s => s.structureName).join(', ')}`;
    }
    
    logger.info(`[DamageStructureHandler] Preview: ${badgeText}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-house-crack',
        template: badgeText,
        variant: 'negative'
      },
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

