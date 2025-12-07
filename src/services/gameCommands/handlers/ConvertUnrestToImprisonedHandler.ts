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

export class ConvertUnrestToImprisonedHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'convertUnrestToImprisoned';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const requestedAmount = command.amount || 0;
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

    // Calculate available prison capacity
    let totalCapacity = 0;
    const settlementCapacities: { id: string; name: string; available: number }[] = [];

    for (const settlement of kingdom.settlements || []) {
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      const currentImprisoned = settlement.imprisonedUnrest || 0;
      const available = capacity - currentImprisoned;

      if (available > 0) {
        totalCapacity += available;
        settlementCapacities.push({
          id: settlement.id,
          name: settlement.name,
          available
        });
      }
    }

    // Calculate how much we can actually convert
    const amountToConvert = Math.min(requestedAmount, currentUnrest, totalCapacity);

    // Pre-calculate allocations for preview message
    const plannedAllocations: { name: string; amount: number }[] = [];
    let remainingForPreview = amountToConvert;
    for (const { name, available } of settlementCapacities) {
      if (remainingForPreview <= 0) break;
      const toAllocate = Math.min(remainingForPreview, available);
      plannedAllocations.push({ name, amount: toAllocate });
      remainingForPreview -= toAllocate;
    }

    // Build preview message
    const messageParts: string[] = [];
    
    if (totalCapacity === 0) {
      messageParts.push('No prisons available');
    } else if (currentUnrest === 0) {
      messageParts.push('No unrest to imprison');
    } else if (amountToConvert > 0) {
      // Format: "Imprison 2 unrest in Anvilgate" or "Imprison 2 unrest in Anvilgate, 1 in Oakhold"
      const allocationStrings = plannedAllocations.map(a => `${a.amount} in ${a.name}`);
      messageParts.push(`Imprison ${allocationStrings.join(', ')}`);
    }
    
    // Bonus unrest reduction always applies (regardless of conversion)
    if (bonusUnrestReduction > 0) {
      messageParts.push(`-${bonusUnrestReduction} unrest`);
    }
    
    const message = messageParts.join(', ') || 'No effect';
    const hasPositiveEffect = amountToConvert > 0 || bonusUnrestReduction > 0;

    logger.info(`[ConvertUnrestToImprisoned] Preview: ${message}`);

    return {
      outcomeBadges: [{
        icon: '',
        template: message,
        variant: hasPositiveEffect ? 'positive' : 'neutral'
      }],
      commit: async () => {
        logger.info(`[ConvertUnrestToImprisoned] Executing command`);

        let remaining = amountToConvert;
        const chatMessageParts: string[] = [];
        const actualAllocations: { name: string; amount: number }[] = [];

        await updateKingdom(k => {
          // Convert unrest to imprisoned (if capacity available)
          if (amountToConvert > 0) {
            // Reduce kingdom unrest by amount being converted
            k.unrest = Math.max(0, (k.unrest || 0) - amountToConvert);

            // Allocate to settlements with capacity
            for (const { id, name, available } of settlementCapacities) {
              if (remaining <= 0) break;

              const settlement = k.settlements.find(s => s.id === id);
              if (!settlement) continue;

              const toAllocate = Math.min(remaining, available);
              const currentImprisoned = settlement.imprisonedUnrest || 0;
              settlement.imprisonedUnrest = currentImprisoned + toAllocate;

              logger.info(`[ConvertUnrestToImprisoned] Imprisoned ${toAllocate} in ${name}`);
              actualAllocations.push({ name, amount: toAllocate });
              remaining -= toAllocate;
            }
            
            // Build chat message with settlement details
            const allocationDetails = actualAllocations.map(a => `<li>${a.amount} in ${a.name}</li>`).join('');
            chatMessageParts.push(`<p><strong>Unrest Imprisoned:</strong></p><ul>${allocationDetails}</ul>`);
          } else if (totalCapacity === 0) {
            chatMessageParts.push(`<p><em>No prisons available - unrest not imprisoned</em></p>`);
          }

          // Bonus unrest reduction ALWAYS applies (even if no conversion)
          if (bonusUnrestReduction > 0) {
            k.unrest = Math.max(0, (k.unrest || 0) - bonusUnrestReduction);
            logger.info(`[ConvertUnrestToImprisoned] Applied bonus unrest reduction: -${bonusUnrestReduction}`);
            chatMessageParts.push(`<p><strong>Unrest Reduced:</strong> -${bonusUnrestReduction}</p>`);
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
