/**
 * DestroyStructure Command Handler
 * 
 * Handles destroying or downgrading structures from incidents.
 * - Tier 1 structures: removed entirely
 * - Tier 2+ structures: downgraded to previous tier (damaged)
 * - Supports category filtering (e.g., 'military', 'commerce', 'religion')
 * - Supports tier targeting ('highest', 'lowest', or specific number)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class DestroyStructureHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'destroyStructure';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const category = command.category;
    const targetTier = command.targetTier;
    const count = command.count || 1;
    
    logger.info(`[DestroyStructureHandler] Preparing to destroy ${count} structure(s)${category ? ` in category ${category}` : ''}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[DestroyStructureHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[DestroyStructureHandler] No kingdom data available');
      return null;
    }
    
    const { structuresService } = await import('../../structures/index');
    const { StructureCondition } = await import('../../../models/Settlement');
    
    // Select structure(s) to destroy
    const selectedStructures: Array<{
      structureId: string;
      structureName: string;
      structureTier: number;
      settlementId: string;
      settlementName: string;
      action: string;
      previousTierId?: string;
      previousTierName?: string;
    }> = [];
    
    // Select 'count' structures
    for (let i = 0; i < count; i++) {
      let targetStructure: any = null;
      let targetSettlement: any = null;

      // Search all settlements for matching structures
      for (const settlement of kingdom.settlements || []) {
        for (const structureId of settlement.structureIds || []) {
          const structure = structuresService.getStructure(structureId);
          if (!structure) continue;
          
          // Skip damaged structures
          if (settlement.structureConditions?.[structureId] === StructureCondition.DAMAGED) {
            continue;
          }
          
          // Skip already selected structures
          if (selectedStructures.some(s => s.structureId === structureId && s.settlementId === settlement.id)) {
            continue;
          }
          
          // Apply category filter
          if (category && structure.category !== category) {
            continue;
          }
          
          // Apply tier filter
          if (targetTier !== undefined) {
            if (targetTier === 'highest') {
              if (!targetStructure || structure.tier > targetStructure.tier) {
                targetStructure = structure;
                targetSettlement = settlement;
              }
            } else if (targetTier === 'lowest') {
              if (!targetStructure || structure.tier < targetStructure.tier) {
                targetStructure = structure;
                targetSettlement = settlement;
              }
            } else if (typeof targetTier === 'number') {
              if (structure.tier === targetTier) {
                targetStructure = structure;
                targetSettlement = settlement;
                break;
              }
            }
          } else {
            // No tier filter - take first match
            targetStructure = structure;
            targetSettlement = settlement;
            break;
          }
        }
        if (targetStructure && typeof targetTier === 'number') break;
      }

      if (!targetStructure || !targetSettlement) {
        logger.warn(`[DestroyStructureHandler] No more structures available to destroy (selected ${i}/${count})`);
        break;
      }

      // Determine action based on tier
      let action = '';
      let previousTierId: string | undefined;
      let previousTierName: string | undefined;
      
      if (targetStructure.tier === 1) {
        // Tier 1: Remove entirely
        action = 'removed entirely';
      } else {
        // Tier 2+: Downgrade to previous tier (damaged)
        previousTierId = targetStructure.upgradeFrom;
        if (!previousTierId) {
          logger.error(`[DestroyStructureHandler] Cannot downgrade - no upgradeFrom found: ${targetStructure.id}`);
          continue;
        }

        const previousStructure = structuresService.getStructure(previousTierId);
        if (!previousStructure) {
          logger.error(`[DestroyStructureHandler] Previous tier structure not found: ${previousTierId}`);
          continue;
        }

        previousTierName = previousStructure.name;
        action = `downgraded to ${previousTierName} (damaged)`;
      }

      selectedStructures.push({
        structureId: targetStructure.id,
        structureName: targetStructure.name,
        structureTier: targetStructure.tier,
        settlementId: targetSettlement.id,
        settlementName: targetSettlement.name,
        action,
        previousTierId,
        previousTierName
      });
    }
    
    if (selectedStructures.length === 0) {
      logger.warn(`[DestroyStructureHandler] No structures available to destroy${category ? ` in category '${category}'` : ''}`);
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: `No structures available to destroy${category ? ` in category '${category}'` : ''}`,
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[DestroyStructureHandler] No structures to affect - skipping');
        }
      };
    }
    
    // Create badge text
    let badgeText: string;
    if (selectedStructures.length === 1) {
      const s = selectedStructures[0];
      badgeText = `${s.structureName} in ${s.settlementName} will be ${s.action}`;
    } else {
      const structureList = selectedStructures.map(s => `${s.structureName} (${s.action})`).join(', ');
      badgeText = `${selectedStructures.length} structures will be destroyed: ${structureList}`;
    }
    
    logger.info(`[DestroyStructureHandler] Preview: ${badgeText}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-house-chimney-crack',
        template: badgeText,
        variant: 'negative'
      },
      commit: async () => {
        logger.info(`[DestroyStructureHandler] Destroying ${selectedStructures.length} structure(s)`);
        
        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[DestroyStructureHandler] No kingdom actor available during commit');
          return;
        }
        
        const { StructureCondition } = await import('../../../models/Settlement');
        
        await actor.updateKingdomData((kingdom: any) => {
          for (const selected of selectedStructures) {
            const settlement = kingdom.settlements.find((s: any) => s.id === selected.settlementId);
            if (!settlement) {
              logger.error(`[DestroyStructureHandler] Settlement not found: ${selected.settlementId}`);
              continue;
            }

            if (selected.structureTier === 1) {
              // Tier 1: Remove entirely
              settlement.structureIds = settlement.structureIds.filter((id: string) => id !== selected.structureId);
              if (settlement.structureConditions) {
                delete settlement.structureConditions[selected.structureId];
              }
              logger.info(`  💥 Removed tier 1: ${selected.structureName} from ${selected.settlementName}`);
              
            } else {
              // Tier 2+: Downgrade to previous tier (damaged)
              if (!selected.previousTierId) {
                logger.error(`[DestroyStructureHandler] No previousTierId for ${selected.structureName}`);
                continue;
              }

              // Remove current tier
              settlement.structureIds = settlement.structureIds.filter((id: string) => id !== selected.structureId);
              
              // Add previous tier (damaged)
              settlement.structureIds = [...settlement.structureIds, selected.previousTierId];
              
              if (!settlement.structureConditions) {
                settlement.structureConditions = {};
              }
              settlement.structureConditions = {
                ...settlement.structureConditions,
                [selected.previousTierId]: StructureCondition.DAMAGED
              };
              
              // Remove current tier from conditions
              if (settlement.structureConditions[selected.structureId]) {
                const { [selected.structureId]: _, ...rest } = settlement.structureConditions;
                settlement.structureConditions = rest;
              }

              logger.info(`  💥 Downgraded: ${selected.structureName} → ${selected.previousTierName} (damaged) in ${selected.settlementName}`);
            }
          }
        });
        
        // Log to chat
        const structureList = selectedStructures
          .map(s => `${s.structureName} in ${s.settlementName} (${s.action})`)
          .join(', ');
        
        const message = `<p><strong>Structure${selectedStructures.length > 1 ? 's' : ''} Destroyed:</strong> ${structureList}</p>`;
        
        ChatMessage.create({
          content: message,
          speaker: { alias: 'Kingdom Management' }
        });
        
        logger.info(`[DestroyStructureHandler] Successfully destroyed ${selectedStructures.length} structure(s)`);
      }
    };
  }
}

