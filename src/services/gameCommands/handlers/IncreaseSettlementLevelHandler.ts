/**
 * IncreaseSettlementLevel Command Handler
 * 
 * Increases a settlement's level by a specified amount
 * Used by events like immigration
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class IncreaseSettlementLevelHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'increaseSettlementLevel';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const increase = command.increase || 1;
    const settlementId = command.settlementId;
    
    logger.info(`[IncreaseSettlementLevelHandler] Preparing to increase settlement level by ${increase}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[IncreaseSettlementLevelHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[IncreaseSettlementLevelHandler] No kingdom data available');
      return null;
    }
    
    // If no settlement specified, pick a random one
    let targetSettlement = null;
    if (settlementId) {
      targetSettlement = kingdom.settlements.find(s => s.id === settlementId);
    } else {
      // Pick random settlement
      const eligibleSettlements = kingdom.settlements || [];
      if (eligibleSettlements.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleSettlements.length);
        targetSettlement = eligibleSettlements[randomIndex];
      }
    }
    
    if (!targetSettlement) {
      logger.warn('[IncreaseSettlementLevelHandler] No settlements available');
      return {
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: 'No settlements available to increase',
          variant: 'neutral'
        }],
        commit: async () => {
          logger.info('[IncreaseSettlementLevelHandler] No settlements to increase - skipping');
        }
      };
    }
    
    const oldLevel = targetSettlement.level;
    const newLevel = oldLevel + increase;
    
    // Build preview message
    const message = `${targetSettlement.name}: Level ${oldLevel} → ${newLevel}`;
    
    logger.info(`[IncreaseSettlementLevelHandler] Preview: ${message}`);
    
    return {
      outcomeBadges: [{
        icon: 'fa-city',
        template: message,
        variant: 'positive'
      }],
      commit: async () => {
        logger.info(`[IncreaseSettlementLevelHandler] Increasing ${targetSettlement.name} from level ${oldLevel} to ${newLevel}`);
        
        // Use the settlements service to update level (handles tier transitions automatically)
        const { settlementService } = await import('../../settlements/index');
        await settlementService.updateSettlementLevel(targetSettlement.id, newLevel);
        
        // Show chat message
        const chatMessage = `<p><strong>Settlement Level Increased:</strong></p>
          <p><strong>${targetSettlement.name}</strong> has grown from level <strong>${oldLevel}</strong> to level <strong>${newLevel}</strong>!</p>`;
        
        ChatMessage.create({
          content: chatMessage,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[IncreaseSettlementLevelHandler] Successfully increased ${targetSettlement.name} to level ${newLevel}`);
      }
    };
  }
}

