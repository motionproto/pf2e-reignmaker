/**
 * ReduceImprisoned Command Handler
 *
 * Handles reducing imprisoned unrest (Execute/Pardon Prisoners action, event outcomes).
 * - If settlementId provided: reduces from that specific settlement
 * - If no settlementId: auto-distributes across settlements with imprisoned unrest
 * - Handles amount: 'all', dice formula, or numeric
 * - Validates settlement(s) have sufficient imprisoned unrest
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

    logger.info(`[ReduceImprisonedHandler] Preparing to reduce imprisoned unrest${settlementId ? ` in settlement ${settlementId}` : ' (auto-select)'} by ${amount}`);

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

    // If settlementId provided, use single-settlement mode
    if (settlementId) {
      return this.prepareSingleSettlement(command, kingdom, settlementId, amount);
    }

    // Otherwise, auto-distribute across settlements with imprisoned unrest
    return this.prepareAutoDistribute(command, kingdom, amount);
  }

  private async prepareSingleSettlement(
    command: any,
    kingdom: any,
    settlementId: string,
    amount: any
  ): Promise<PreparedCommand | null> {
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
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: `${settlement.name} has no imprisoned unrest`,
          variant: 'neutral'
        }],
        commit: async () => {
          logger.info('[ReduceImprisonedHandler] No imprisoned unrest - skipping');
        }
      };
    }

    let amountToReduce = await this.resolveAmount(amount, currentImprisoned, settlement.name);

    // Create badge text
    const badgeText = `Reduce ${amountToReduce} imprisoned in ${settlement.name}`;

    logger.info(`[ReduceImprisonedHandler] Preview: ${badgeText}`);

    return {
      outcomeBadges: [{
        icon: 'fa-user-check',
        template: badgeText,
        variant: 'positive'
      }],
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
        const message = `<p><strong>Prisoners Pardoned:</strong> Released ${amountToReduce} imprisoned in ${settlement.name}.</p>`;

        ChatMessage.create({
          content: message,
          speaker: { alias: 'Kingdom Management' }
        });

        logger.info(`[ReduceImprisonedHandler] Successfully reduced ${amountToReduce} imprisoned unrest`);
      }
    };
  }

  private async prepareAutoDistribute(
    command: any,
    kingdom: any,
    amount: any
  ): Promise<PreparedCommand | null> {
    // Find all settlements with imprisoned unrest
    const settlementsWithImprisoned: { id: string; name: string; imprisoned: number }[] = [];
    let totalImprisoned = 0;

    for (const settlement of kingdom.settlements || []) {
      const imprisoned = settlement.imprisonedUnrest || 0;
      if (imprisoned > 0) {
        totalImprisoned += imprisoned;
        settlementsWithImprisoned.push({
          id: settlement.id,
          name: settlement.name,
          imprisoned
        });
      }
    }

    if (totalImprisoned === 0) {
      logger.warn('[ReduceImprisonedHandler] No imprisoned unrest in any settlement');
      return {
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: 'No prisoners to release',
          variant: 'neutral'
        }],
        commit: async () => {
          logger.info('[ReduceImprisonedHandler] No imprisoned unrest - skipping');
        }
      };
    }

    // Resolve the amount to reduce
    let amountToReduce = await this.resolveAmount(amount, totalImprisoned, 'kingdom');

    // Pre-calculate allocations for preview
    const plannedReductions: { id: string; name: string; amount: number }[] = [];
    let remainingForPreview = amountToReduce;
    for (const { id, name, imprisoned } of settlementsWithImprisoned) {
      if (remainingForPreview <= 0) break;
      const toReduce = Math.min(remainingForPreview, imprisoned);
      plannedReductions.push({ id, name, amount: toReduce });
      remainingForPreview -= toReduce;
    }

    // Build preview message
    let badgeText: string;
    if (amountToReduce > 0) {
      const reductionStrings = plannedReductions.map(r => `${r.amount} from ${r.name}`);
      badgeText = `Release ${reductionStrings.join(', ')}`;
    } else {
      badgeText = 'No effect';
    }

    logger.info(`[ReduceImprisonedHandler] Preview: ${badgeText}`);

    return {
      outcomeBadges: [{
        icon: 'fa-unlock',
        template: badgeText,
        variant: amountToReduce > 0 ? 'positive' : 'neutral'
      }],
      commit: async () => {
        logger.info(`[ReduceImprisonedHandler] Releasing ${amountToReduce} imprisoned unrest across settlements`);

        const actor = getKingdomActor();
        if (!actor) {
          logger.error('[ReduceImprisonedHandler] No kingdom actor available during commit');
          return;
        }

        const actualReductions: { name: string; amount: number }[] = [];

        await actor.updateKingdomData((kingdom: any) => {
          let remaining = amountToReduce;

          for (const { id, name, imprisoned } of settlementsWithImprisoned) {
            if (remaining <= 0) break;

            const settlement = kingdom.settlements?.find((s: any) => s.id === id);
            if (!settlement) continue;

            const toReduce = Math.min(remaining, imprisoned);
            settlement.imprisonedUnrest = Math.max(0, (settlement.imprisonedUnrest || 0) - toReduce);

            logger.info(`  ⚖️ Released ${toReduce} from ${name}`);
            actualReductions.push({ name, amount: toReduce });
            remaining -= toReduce;
          }
        });

        // Log to chat
        if (actualReductions.length > 0) {
          const reductionDetails = actualReductions.map(r => `<li>${r.amount} from ${r.name}</li>`).join('');
          ChatMessage.create({
            content: `<p><strong>Prisoners Pardoned:</strong></p><ul>${reductionDetails}</ul>`,
            speaker: { alias: 'Kingdom Management' }
          });
        }

        logger.info(`[ReduceImprisonedHandler] Successfully released ${amountToReduce} imprisoned unrest`);
      }
    };
  }

  private async resolveAmount(amount: any, maxAmount: number, context: string): Promise<number> {
    if (amount === 'all') {
      return maxAmount;
    } else if (typeof amount === 'number') {
      // Already rolled - use the value directly
      return Math.min(amount, maxAmount);
    } else if (typeof amount === 'string' && amount.includes('d')) {
      // Dice formula (e.g., '1d4')
      const roll = new Roll(amount);
      await roll.evaluate();
      const result = Math.min(roll.total || 0, maxAmount);

      // Show dice roll in chat
      await roll.toMessage({
        flavor: `Prisoners Released (${context})`,
        speaker: { alias: 'Kingdom' }
      });

      return result;
    } else {
      // Numeric string
      return Math.min(parseInt(amount, 10), maxAmount);
    }
  }
}









