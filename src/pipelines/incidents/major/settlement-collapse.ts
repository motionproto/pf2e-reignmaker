/**
 * Settlement Collapse Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const settlementCollapsePipeline: CheckPipeline = {
  id: 'settlement-collapse',
  name: 'Settlement Collapse',
  description: 'A major settlement faces total collapse',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'address concerns' },
      { skill: 'society', description: 'emergency aid' },
      { skill: 'religion', description: 'provide hope' },
    ],

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',
      label: 'Select Settlement at Risk of Collapse',
      required: true
    }
  ],

  outcomes: {
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'A major crisis threatens the settlement.',
      modifiers: [],
      manualEffects: ["Choose or roll for one random settlement. If you chose 'structures damaged', damage 2 random structures in that settlement"]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random settlement. That settlement loses one level (minimum level 1)", "Reduce 1 random structure's tier in that settlement by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlement?.id;
    
    // Apply modifiers from outcome
    await applyPipelineModifiers(settlementCollapsePipeline, ctx.outcome, ctx);

    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 2 structures in selected settlement
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 2);
    }

    // Critical Failure: downgrade 1 structure in selected settlement (settlement level handled as manual effect)
    if (ctx.outcome === 'criticalFailure') {
      await resolver.destroyStructure(undefined, undefined, 1);
    }

    return { success: true };
  }
};
