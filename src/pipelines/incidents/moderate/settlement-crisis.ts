/**
 * Settlement Crisis Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const settlementCrisisPipeline: CheckPipeline = {
  id: 'settlement-crisis',
  name: 'Settlement Crisis',
  description: 'One of your settlements faces a major crisis',
  checkType: 'incident',
  tier: 'moderate',

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
      label: 'Select Settlement in Crisis',
      required: true
    }
  ],

  outcomes: {
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'The crisis threatens the settlement.',
      modifiers: [],
      manualEffects: ["Choose or roll for one random settlement. If you chose 'structure damaged', damage 1 random structure in that settlement"]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random settlement. That settlement loses one level (minimum level 1)"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlement?.id;
    
    // Apply modifiers from outcome
    await applyPipelineModifiers(settlementCrisisPipeline, ctx.outcome, ctx);

    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 1 structure in the selected settlement
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: settlement loses a level (handled as manual effect for now)
    // Note: downgradeSettlement command not yet implemented

    return { success: true };
  }
};
