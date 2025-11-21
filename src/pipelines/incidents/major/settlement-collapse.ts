/**
 * Settlement Collapse Incident Pipeline
 *
 * Generated from data/incidents/major/settlement-collapse.json
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

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(settlementCollapsePipeline, ctx.outcome);
    return { success: true };
  }
};
