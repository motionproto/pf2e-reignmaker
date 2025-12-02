/**
 * ReleaseImprisoned Command Handler
 * 
 * Handles releasing imprisoned unrest back to regular unrest (prison breaks, riots).
 * - Calculates total imprisoned unrest across all settlements
 * - Handles percentage (integer like 50 for 50%) or 'all'
 * - Releases proportionally from settlements
 * - Converts to regular kingdom unrest
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class ReleaseImprisonedHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'releaseImprisoned';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const percentage = command.percentage;
    
    logger.info(`[ReleaseImprisonedHandler] Preparing to release ${percentage === 'all' ? 'all' : percentage + '%'} imprisoned unrest`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[ReleaseImprisonedHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[ReleaseImprisonedHandler] No kingdom data available');
      return null;
    }
    
    // Calculate total imprisoned unrest across all settlements
    let totalImprisoned = 0;
    for (const settlement of kingdom.settlements || []) {
      totalImprisoned += settlement.imprisonedUnrest || 0;
    }

    if (totalImprisoned === 0) {
      logger.warn('[ReleaseImprisonedHandler] No imprisoned unrest to release');
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'No imprisoned unrest to release',
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[ReleaseImprisonedHandler] No imprisoned unrest - skipping');
        }
      };
    }

    // Calculate amount to release
    const releasePercentage = percentage === 'all' ? 1 : (percentage / 100);
    const amountToRelease = Math.floor(totalImprisoned * releasePercentage);

    if (amountToRelease === 0) {
      logger.warn('[ReleaseImprisonedHandler] Amount to release rounded down to 0');
      return {
        outcomeBadge: {
          icon: 'fa-exclamation-triangle',
          template: 'No imprisoned unrest to release (rounded down to 0)',
          variant: 'neutral'
        },
        commit: async () => {
          logger.info('[ReleaseImprisonedHandler] Amount rounded to 0 - skipping');
        }
      };
    }
    
    // Create badge text
    const percentageText = percentage === 'all' ? '100%' : `${percentage}%`;
    const badgeText = `Releasing ${amountToRelease} imprisoned unrest (${percentageText} of ${totalImprisoned}) - converting to regular unrest`;
    
    logger.info(`[ReleaseImprisonedHandler] Preview: ${badgeText}`);
    
    return {
      outcomeBadge: {
        icon: 'fa-door-open',
        template: badgeText,
        variant: 'negative'
      },
      commit: async () => {
        logger.info(`[ReleaseImprisonedHandler] Releasing ${amountToRelease} imprisoned unrest`);
        
        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[ReleaseImprisonedHandler] No kingdom actor available during commit');
          return;
        }
        
        await actor.updateKingdomData((kingdom: any) => {
          let remaining = amountToRelease;
          
          // Release from each settlement proportionally
          for (const settlement of kingdom.settlements || []) {
            if (remaining <= 0) break;
            
            const currentImprisoned = settlement.imprisonedUnrest || 0;
            if (currentImprisoned === 0) continue;
            
            const toRelease = Math.min(remaining, Math.ceil(currentImprisoned * releasePercentage));
            settlement.imprisonedUnrest = Math.max(0, currentImprisoned - toRelease);
            remaining -= toRelease;
            
            logger.info(`  🔓 Released ${toRelease} imprisoned unrest from ${settlement.name}`);
          }
          
          // Add released unrest to kingdom unrest
          kingdom.unrest = (kingdom.unrest || 0) + amountToRelease;
          logger.info(`  ⚠️ Added ${amountToRelease} to kingdom unrest (now ${kingdom.unrest})`);
        });
        
        // Log to chat
        const percentageText = percentage === 'all' ? '100%' : `${percentage}%`;
        const message = `<p><strong>Prison Break:</strong> Released ${amountToRelease} imprisoned unrest (${percentageText} of ${totalImprisoned}) back into the kingdom.</p>`;
        
        ChatMessage.create({
          content: message,
          speaker: { alias: 'Kingdom Management' }
        });
        
        logger.info(`[ReleaseImprisonedHandler] Successfully released ${amountToRelease} imprisoned unrest`);
      }
    };
  }
}

