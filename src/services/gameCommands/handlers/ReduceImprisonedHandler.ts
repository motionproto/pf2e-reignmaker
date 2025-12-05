/**
 * ReduceImprisoned Command Handler
 * 
 * Handles reducing imprisoned unrest from a settlement (Execute/Pardon Prisoners action).
 * - Finds settlement by ID
 * - Handles amount: 'all', dice formula, or numeric
 * - Validates settlement has sufficient imprisoned unrest
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class ReduceImprisonedHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'reduceImprisoned';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const settlementId = command.settlementId;
    const amount = command.amount;
    
    logger.info(`[ReduceImprisonedHandler] Preparing to reduce imprisoned unrest in settlement ${settlementId} by ${amount}`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[ReduceImprisonedHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[ReduceImprisonedHandler] No kingdom data available');
      return null;
    }

    // Find the settlement
    const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
    if (!settlement) {
      logger.error(`[ReduceImprisonedHandler] Settlement ${settlementId} not found`);
      return null;
    }

    const currentImprisoned = settlement.imprisonedUnrest || 0;
    if (currentImprisoned === 0) {
      logger.warn(`[ReduceImprisonedHandler] ${settlement.name} has no imprisoned unrest`);
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: `${settlement.name} has no imprisoned unrest`,
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[ReduceImprisonedHandler] No imprisoned unrest - skipping');
        }
      };
    }

    let amountToReduce = 0;

    // Handle different amount types
    if (amount === 'all') {
      amountToReduce = currentImprisoned;
    } else if (typeof amount === 'number') {
      // Already rolled - use the value directly
      amountToReduce = Math.min(amount, currentImprisoned);
    } else if (typeof amount === 'string' && amount.includes('d')) {
      // Dice formula (e.g., '1d4')
      const roll = new Roll(amount);
      await roll.evaluate();
      amountToReduce = Math.min(roll.total || 0, currentImprisoned);
      
      // Show dice roll in chat
      await roll.toMessage({
        flavor: `Imprisoned Unrest Reduced in ${settlement.name}`,
        speaker: { alias: 'Kingdom' }
      });
    } else {
      // Numeric string
      amountToReduce = Math.min(parseInt(amount, 10), currentImprisoned);
    }
    
    // Create badge text
    const badgeText = `Reducing ${amountToReduce} imprisoned unrest in ${settlement.name}`;
    
    logger.info(`[ReduceImprisonedHandler] Preview: ${badgeText}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-user-check',
        template: badgeText,
        variant: 'positive'
      },
      commit: async () => {
        logger.info(`[ReduceImprisonedHandler] Reducing ${amountToReduce} imprisoned unrest in ${settlement.name}`);
        
        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[ReduceImprisonedHandler] No kingdom actor available during commit');
          return;
        }
        
        await actor.updateKingdomData((kingdom: any) => {
          const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
          if (settlement) {
            settlement.imprisonedUnrest = Math.max(0, (settlement.imprisonedUnrest || 0) - amountToReduce);
            logger.info(`  ⚖️ Reduced imprisoned unrest in ${settlement.name} to ${settlement.imprisonedUnrest}`);
          }
        });
        
        // Log to chat
        const message = `<p><strong>Imprisoned Unrest Reduced:</strong> Reduced ${amountToReduce} imprisoned unrest in ${settlement.name}.</p>`;
        
        ChatMessage.create({
          content: message,
          speaker: { alias: 'Kingdom Management' }
        });
        
        logger.info(`[ReduceImprisonedHandler] Successfully reduced ${amountToReduce} imprisoned unrest`);
      }
    };
  }
}







