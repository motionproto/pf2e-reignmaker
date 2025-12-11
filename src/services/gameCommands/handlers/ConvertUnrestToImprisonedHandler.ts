/**
 * ConvertUnrestToImprisonedHandler
 * 
 * Handles automatic conversion of unrest to imprisoned unrest.
 * Used by events like Notorious Heist where successful outcomes
 * convert unrest to imprisoned without player intervention.
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { updateKingdom, getKingdomData } from '../../../stores/KingdomStore';
import { structuresService } from '../../structures';
import { logger } from '../../../utils/Logger';
import { createTargetedDiceBadge, createTargetedStaticBadge } from '../../../utils/badge-helpers';
import type { ActionTarget } from '../../../utils/badge-helpers';

export class ConvertUnrestToImprisonedHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'convertUnrestToImprisoned';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const requestedAmount = command.amount || 0;
    const diceFormula = command.diceFormula || null;  // Optional: dice formula like "1d3"
    const bonusUnrestReduction = command.bonusUnrestReduction || 0;

    // If neither conversion nor bonus reduction, skip
    if (requestedAmount <= 0 && bonusUnrestReduction <= 0) {
      logger.info('[ConvertUnrestToImprisoned] No amount to convert and no bonus reduction');
      return null;
    }

    const kingdom = getKingdomData();
    if (!kingdom) {
      logger.error('[ConvertUnrestToImprisoned] Kingdom data not available');
      return null;
    }

    const currentUnrest = kingdom.unrest || 0;

    // Build targets array with available capacity
    const targets: ActionTarget[] = (kingdom.settlements || []).map(settlement => ({
      id: settlement.id,
      name: settlement.name,
      capacity: structuresService.calculateImprisonedUnrestCapacity(settlement) - (settlement.imprisonedUnrest || 0)
    }));

    // Check for no unrest case first
    if (currentUnrest === 0) {
      const badge = {
        icon: 'fas fa-handcuffs',
        template: 'No unrest to imprison',
        variant: 'info' as const
      };
      
      const metadata: {
        targetSettlement: { id: string; name: string; available: number } | null;
        bonusUnrestReduction: number;
      } = {
        targetSettlement: null,
        bonusUnrestReduction
      };

      if (bonusUnrestReduction > 0) {
        badge.template += `, -${bonusUnrestReduction} unrest`;
      }

      return {
        outcomeBadges: [badge],
        metadata,
        commit: async () => {
          // Only apply bonus unrest reduction
          if (metadata.bonusUnrestReduction > 0) {
            await updateKingdom(k => {
              k.unrest = Math.max(0, (k.unrest || 0) - metadata.bonusUnrestReduction);
            });
          }
        }
      };
    }

    // Create badge using helper utility
    let badge: any;
    let targetId: string | null;
    let targetName: string | null;
    let maxCapacity: number;

    if (diceFormula) {
      const result = createTargetedDiceBadge({
        formula: diceFormula,
        action: 'Imprison',
        targets,
        icon: 'fas fa-handcuffs',
        variant: 'info',
        noTargetMessage: 'No prisons available'
      });
      badge = result.badge;
      targetId = result.targetId;
      targetName = result.targetName;
      maxCapacity = result.maxCapacity;
    } else {
      const result = createTargetedStaticBadge({
        amount: Math.min(requestedAmount, currentUnrest),
        action: 'Imprison',
        targets,
        icon: 'fas fa-handcuffs',
        variant: 'info',
        noTargetMessage: 'No prisons available'
      });
      badge = result.badge;
      targetId = result.targetId;
      targetName = result.targetName;
      maxCapacity = result.maxCapacity;
    }
    
    // Add bonus unrest reduction to badge template if present
    if (bonusUnrestReduction > 0) {
      badge.template += `, -${bonusUnrestReduction} unrest`;
    }

    // Store target settlement for commit
    const metadata: {
      targetSettlement: { id: string; name: string; available: number } | null;
      bonusUnrestReduction: number;
    } = {
      targetSettlement: targetId ? { id: targetId, name: targetName!, available: maxCapacity } : null,
      bonusUnrestReduction
    };

    logger.info(`[ConvertUnrestToImprisoned] Preview: ${badge.template}`);

    return {
      outcomeBadges: [badge],
      metadata,
      commit: async () => {
        logger.info(`[ConvertUnrestToImprisoned] Executing command`);

        const chatMessageParts: string[] = [];

        await updateKingdom(k => {
          const currentUnrest = k.unrest || 0;
          
          // Convert unrest to imprisoned (if target settlement available)
          if (metadata.targetSettlement && currentUnrest > 0) {
            const targetId = metadata.targetSettlement.id;
            const settlement = k.settlements.find(s => s.id === targetId);
            if (!settlement) {
              logger.warn(`[ConvertUnrestToImprisoned] Target settlement ${targetId} not found`);
              return;
            }

            // Calculate how much to actually imprison (min of requested, unrest, and capacity)
            const currentCapacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
            const currentImprisoned = settlement.imprisonedUnrest || 0;
            const availableCapacity = currentCapacity - currentImprisoned;
            
            const amountToImprison = Math.min(requestedAmount, currentUnrest, availableCapacity);
            
            if (amountToImprison > 0) {
              // Reduce kingdom unrest
              k.unrest = Math.max(0, currentUnrest - amountToImprison);
              
              // Add to settlement imprisoned
              settlement.imprisonedUnrest = currentImprisoned + amountToImprison;
              
              logger.info(`[ConvertUnrestToImprisoned] Imprisoned ${amountToImprison} in ${settlement.name}`);
              chatMessageParts.push(`<p><strong>Imprisoned:</strong> ${amountToImprison} in ${settlement.name}</p>`);
            }
          } else if (!metadata.targetSettlement) {
            chatMessageParts.push(`<p><em>No prisons available - unrest not imprisoned</em></p>`);
          } else if (currentUnrest === 0) {
            chatMessageParts.push(`<p><em>No unrest to imprison</em></p>`);
          }

          // Bonus unrest reduction ALWAYS applies (even if no conversion)
          if (metadata.bonusUnrestReduction > 0) {
            k.unrest = Math.max(0, (k.unrest || 0) - metadata.bonusUnrestReduction);
            logger.info(`[ConvertUnrestToImprisoned] Applied bonus unrest reduction: -${metadata.bonusUnrestReduction}`);
            chatMessageParts.push(`<p><strong>Unrest Reduced:</strong> -${metadata.bonusUnrestReduction}</p>`);
          }
        });

        // Show chat message
        if (chatMessageParts.length > 0) {
          ChatMessage.create({
            content: chatMessageParts.join(''),
            speaker: ChatMessage.getSpeaker()
          });
        }

        logger.info(`[ConvertUnrestToImprisoned] Command completed`);
      }
    };
  }
}
