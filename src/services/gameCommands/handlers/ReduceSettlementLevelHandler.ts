/**
 * ReduceSettlementLevel Command Handler
 * 
 * Reduces a settlement's level by a specified amount (minimum level 1)
 * Used by incidents like settlement-crisis
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class ReduceSettlementLevelHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'reduceSettlementLevel';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const reduction = command.reduction || 1;
    const settlementId = command.settlementId;
    
    logger.info(`[ReduceSettlementLevelHandler] Preparing to reduce settlement level by ${reduction}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[ReduceSettlementLevelHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[ReduceSettlementLevelHandler] No kingdom data available');
      return null;
    }
    
    // If no settlement specified, pick a random one
    let targetSettlement = null;
    if (settlementId) {
      targetSettlement = kingdom.settlements.find(s => s.id === settlementId);
    } else {
      // Pick random settlement (excluding level 1 settlements)
      const eligibleSettlements = kingdom.settlements.filter(s => s.level > 1);
      if (eligibleSettlements.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleSettlements.length);
        targetSettlement = eligibleSettlements[randomIndex];
      }
    }
    
    if (!targetSettlement) {
      logger.warn('[ReduceSettlementLevelHandler] No eligible settlements to reduce (all at level 1)');
      return {
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: 'No settlements available to reduce (all at minimum level)',
          variant: 'neutral'
        }],
        commit: async () => {
          logger.info('[ReduceSettlementLevelHandler] No settlements to reduce - skipping');
        }
      };
    }
    
    const oldLevel = targetSettlement.level;
    const newLevel = Math.max(1, oldLevel - reduction); // Minimum level is 1
    const actualReduction = oldLevel - newLevel;
    
    // Build preview message
    const message = actualReduction === 1
      ? `${targetSettlement.name} will be reduced from level ${oldLevel} to level ${newLevel}`
      : `${targetSettlement.name} will be reduced by ${actualReduction} levels (${oldLevel} → ${newLevel})`;
    
    logger.info(`[ReduceSettlementLevelHandler] Preview: ${message}`);
    
    return {
      outcomeBadges: [{
        icon: 'fa-city',
        template: message,
        variant: 'negative'
      }],
      commit: async () => {
        logger.info(`[ReduceSettlementLevelHandler] Reducing ${targetSettlement.name} from level ${oldLevel} to ${newLevel}`);
        
        // Use the settlements service to update level (handles tier transitions automatically)
        const { settlementService } = await import('../../settlements/index');
        await settlementService.updateSettlementLevel(targetSettlement.id, newLevel);
        
        // Show chat message
        const chatMessage = `<p><strong>Settlement Level Reduced:</strong></p>
          <p><strong>${targetSettlement.name}</strong> has been reduced from level <strong>${oldLevel}</strong> to level <strong>${newLevel}</strong>.</p>`;
        
        ChatMessage.create({
          content: chatMessage,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[ReduceSettlementLevelHandler] Successfully reduced ${targetSettlement.name} to level ${newLevel}`);
      }
    };
  }
}

