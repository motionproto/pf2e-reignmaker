/**
 * AddImprisonedHandler
 *
 * Handles adding imprisoned unrest WITHOUT reducing kingdom unrest.
 * Used for events where innocents are imprisoned (wrongful arrests).
 * Unlike ConvertUnrestToImprisonedHandler, this doesn't reduce unrest.
 *
 * Auto-distributes across settlements with prison capacity.
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { updateKingdom, getKingdomData } from '../../../stores/KingdomStore';
import { structuresService } from '../../structures';
import { logger } from '../../../utils/Logger';
import { createTargetedDiceBadge, createTargetedStaticBadge } from '../../../utils/badge-helpers';
import type { ActionTarget } from '../../../utils/badge-helpers';

export class AddImprisonedHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'addImprisoned';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const requestedAmount = command.amount || 0;
    const diceFormula = command.diceFormula || null;  // Optional: dice formula like "1d3"

    if (requestedAmount <= 0) {
      logger.info('[AddImprisoned] No amount to add');
      return null;
    }

    const kingdom = getKingdomData();
    if (!kingdom) {
      logger.error('[AddImprisoned] Kingdom data not available');
      return null;
    }

    // Build targets array with available capacity
    const targets: ActionTarget[] = (kingdom.settlements || []).map(settlement => ({
      id: settlement.id,
      name: settlement.name,
      capacity: structuresService.calculateImprisonedUnrestCapacity(settlement) - (settlement.imprisonedUnrest || 0)
    }));

    // Create badge using helper utility
    let badge: any;
    let targetId: string | null;
    let targetName: string | null;
    let maxCapacity: number;

    if (diceFormula) {
      const result = createTargetedDiceBadge({
        formula: diceFormula,
        action: 'Imprison innocents',
        targets,
        icon: 'fas fa-user-slash',
        variant: 'negative',
        noTargetMessage: 'No prison capacity available'
      });
      badge = result.badge;
      targetId = result.targetId;
      targetName = result.targetName;
      maxCapacity = result.maxCapacity;
    } else {
      const result = createTargetedStaticBadge({
        amount: requestedAmount,
        action: 'Imprison innocents',
        targets,
        icon: 'fas fa-user-slash',
        variant: 'negative',
        noTargetMessage: 'No prison capacity available'
      });
      badge = result.badge;
      targetId = result.targetId;
      targetName = result.targetName;
      maxCapacity = result.maxCapacity;
    }

    // Store target settlement for commit
    const metadata: {
      targetSettlement: { id: string; name: string; available: number } | null;
    } = {
      targetSettlement: targetId ? { id: targetId, name: targetName!, available: maxCapacity } : null
    };

    logger.info(`[AddImprisoned] Preview: ${badge.template}`);

    return {
      outcomeBadges: [badge],
      metadata,
      commit: async () => {
        logger.info(`[AddImprisoned] Executing command`);

        const chatMessageParts: string[] = [];

        await updateKingdom(k => {
          // Add imprisoned WITHOUT reducing unrest (if target settlement available)
          if (metadata.targetSettlement) {
            const targetId = metadata.targetSettlement.id;
            const settlement = k.settlements.find(s => s.id === targetId);
            if (!settlement) {
              logger.warn(`[AddImprisoned] Target settlement ${targetId} not found`);
              return;
            }

            // Calculate how much to actually imprison (min of requested and capacity)
            const currentCapacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
            const currentImprisoned = settlement.imprisonedUnrest || 0;
            const availableCapacity = currentCapacity - currentImprisoned;
            
            const amountToImprison = Math.min(requestedAmount, availableCapacity);
            
            if (amountToImprison > 0) {
              // Add to settlement imprisoned (NO unrest reduction)
              settlement.imprisonedUnrest = currentImprisoned + amountToImprison;
              
              logger.info(`[AddImprisoned] Imprisoned ${amountToImprison} innocents in ${settlement.name}`);
              chatMessageParts.push(`<p><strong>Innocents Imprisoned:</strong> ${amountToImprison} in ${settlement.name}</p><p><em>These wrongful arrests do not reduce unrest.</em></p>`);
            }
          } else {
            chatMessageParts.push(`<p><em>No prison capacity - innocents could not be imprisoned</em></p>`);
          }
        });

        // Show chat message
        if (chatMessageParts.length > 0) {
          ChatMessage.create({
            content: chatMessageParts.join(''),
            speaker: ChatMessage.getSpeaker()
          });
        }

        logger.info(`[AddImprisoned] Command completed`);
      }
    };
  }
}
