/**
 * Upgrade Settlement Action Pipeline
 *
 * Increase settlement level by 1.
 * Converted from data/player-actions/upgrade-settlement.json
 *
 * NOTE: Uses custom implementation for settlement upgrade logic
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const upgradeSettlementPipeline: CheckPipeline = {
  id: 'upgrade-settlement',
  name: 'Upgrade Settlement',
  description: 'Invest in infrastructure and development to advance your settlement\'s capabilities and unlock access to more advanced structures',
  checkType: 'action',
  category: 'urban-planning',

  // Requirements: Must have at least one settlement
  requirements: (kingdom) => {
    if (kingdom.settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements to upgrade'
      };
    }
    return { met: true };
  },

  skills: [
    { skill: 'crafting', description: 'infrastructure expansion' },
    { skill: 'society', description: 'urban planning' },
    { skill: 'performance', description: 'inspire growth' },
    { skill: 'arcana', description: 'magical enhancement' },
    { skill: 'medicine', description: 'public health improvements' }
  ],

  // Pre-roll: Select settlement to upgrade
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlementId',
      label: 'Select settlement to upgrade',
      entityType: 'settlement'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The settlement grows rapidly.',
      modifiers: []  // Cost computed dynamically (half of new level)
    },
    success: {
      description: 'The settlement grows.',
      modifiers: []  // Cost computed dynamically (full new level)
    },
    failure: {
      description: 'Construction setbacks waste resources.',
      modifiers: []  // Cost computed dynamically (half of new level)
    },
    criticalFailure: {
      description: 'Accidents and incompetence waste the investment.',
      modifiers: []  // Cost computed dynamically (full new level)
    }
  },

  preview: {
    calculate: (ctx) => {
      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === ctx.metadata.settlementId);
      if (!settlement) {
        return { resources: [], specialEffects: [], warnings: ['Settlement not found'] };
      }

      const currentLevel = settlement.level;
      const newLevel = currentLevel + 1;
      const fullCost = newLevel;
      const halfCost = Math.ceil(newLevel / 2);

      const goldCost = ctx.outcome === 'criticalSuccess' ? -halfCost :
                      ctx.outcome === 'success' ? -fullCost :
                      ctx.outcome === 'failure' ? -halfCost :
                      -fullCost;

      const specialEffects = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Will upgrade ${ctx.metadata.settlementName || settlement.name} to level ${newLevel}`,
          variant: 'positive' as const
        });
      }

      return {
        resources: [{ resource: 'gold', value: goldCost }],
        specialEffects,
        warnings: []
      };
    }
  }

  // NOTE: Execution handled by custom implementation
};
