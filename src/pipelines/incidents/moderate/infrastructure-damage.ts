/**
 * Infrastructure Damage Incident Pipeline
 *
 * Generated from data/incidents/moderate/infrastructure-damage.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const infrastructureDamagePipeline: CheckPipeline = {
  id: 'infrastructure-damage',
  name: 'Infrastructure Damage',
  description: 'Critical infrastructure is damaged or sabotaged',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'crafting', description: 'emergency repairs' },
      { skill: 'athletics', description: 'labor mobilization' },
      { skill: 'society', description: 'organize response' },
      { skill: 'arcana', description: 'magical restoration' },
    ],

  outcomes: {
    success: {
      description: 'Damage is prevented.',
      modifiers: []
    },
    failure: {
      description: 'Infrastructure damage impacts your kingdom.',
      modifiers: [],
      manualEffects: ["Choose or roll for one random structure in a random settlement. Mark that structure as damaged"]
    },
    criticalFailure: {
      description: 'Widespread infrastructure damage causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Roll 1d3. Mark that many random structures as damaged (choose or roll for random settlements)"]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(infrastructureDamagePipeline, ctx.outcome);
    return { success: true };
  }
};
