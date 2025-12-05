/**
 * Notorious Heist Event Pipeline
 *
 * Success outcomes convert unrest to imprisoned unrest (if prison capacity exists)
 * and grant bonus unrest reduction.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';

export const notoriousHeistPipeline: CheckPipeline = {
  id: 'notorious-heist',
  name: 'Notorious Heist',
  description: 'A daring theft threatens your kingdom\'s security and reputation.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'thievery', description: 'understand criminal methods' },
      { skill: 'stealth', description: 'track the thieves' },
      { skill: 'society', description: 'investigate connections' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The thieves are captured with the stolen goods.',
      endsEvent: true,
      modifiers: [],
      gameCommands: [
        { type: 'convertUnrestToImprisoned', amount: 2, bonusUnrestReduction: 1 }
      ],
      // Static badges used only for Possible Outcomes preview (before rolling)
      outcomeBadges: [
        textBadge('Imprison 2 unrest', '', 'positive'),
        textBadge('-1 Unrest', '', 'positive')
      ]
    },
    success: {
      description: 'The thieves are arrested.',
      endsEvent: true,
      modifiers: [],
      gameCommands: [
        { type: 'convertUnrestToImprisoned', amount: 1, bonusUnrestReduction: 1 }
      ],
      // Static badges used only for Possible Outcomes preview (before rolling)
      outcomeBadges: [
        textBadge('Imprison 1 unrest', '', 'positive'),
        textBadge('-1 Unrest', '', 'positive')
      ]
    },
    failure: {
      description: 'The thieves escape.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A crime syndicate thrives.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
      ]
    },
  },

  preview: {
    // Dynamic badges for outcome display (after rolling) - shows settlement names
    calculate: async (ctx) => {
      // Only generate dynamic badges for success/criticalSuccess
      if (ctx.outcome !== 'success' && ctx.outcome !== 'criticalSuccess') {
        return { resources: [], outcomeBadges: [] };
      }

      const { structuresService } = await import('../../services/structures');
      
      const requestedAmount = ctx.outcome === 'criticalSuccess' ? 2 : 1;
      const bonusUnrestReduction = 1;
      const currentUnrest = ctx.kingdom.unrest || 0;

      // Calculate available prison capacity per settlement
      let totalCapacity = 0;
      const settlementCapacities: { name: string; available: number }[] = [];

      for (const settlement of ctx.kingdom.settlements || []) {
        const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
        const currentImprisoned = settlement.imprisonedUnrest || 0;
        const available = capacity - currentImprisoned;

        if (available > 0) {
          totalCapacity += available;
          settlementCapacities.push({ name: settlement.name, available });
        }
      }

      // Calculate how much we can actually convert
      const amountToConvert = Math.min(requestedAmount, currentUnrest, totalCapacity);

      // Pre-calculate allocations for badge
      const plannedAllocations: { name: string; amount: number }[] = [];
      let remaining = amountToConvert;
      for (const { name, available } of settlementCapacities) {
        if (remaining <= 0) break;
        const toAllocate = Math.min(remaining, available);
        plannedAllocations.push({ name, amount: toAllocate });
        remaining -= toAllocate;
      }

      // Build dynamic badges
      const outcomeBadges = [];
      
      if (totalCapacity === 0) {
        outcomeBadges.push(textBadge('No prisons available', 'fa-ban', 'neutral'));
      } else if (currentUnrest === 0) {
        outcomeBadges.push(textBadge('No unrest to imprison', 'fa-check', 'neutral'));
      } else if (amountToConvert > 0) {
        // Format: "Imprison 2 in Anvilgate" or split if multiple settlements
        const allocationStrings = plannedAllocations.map(a => `${a.amount} in ${a.name}`);
        outcomeBadges.push(textBadge(`Imprison ${allocationStrings.join(', ')}`, '', 'positive'));
      }
      
      // Always show bonus unrest reduction
      outcomeBadges.push(textBadge('-1 Unrest', '', 'positive'));

      return { resources: [], outcomeBadges };
    }
  },

  traits: ["dangerous"],
};
