/**
 * Infrastructure Damage Incident Pipeline
 *
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

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',
      label: 'Select Settlement with Infrastructure Damage',
      required: true,
      filter: (settlement: any) => settlement.structures?.length > 0
    }
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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlement?.id;
    
    // Apply modifiers from outcome
    await applyPipelineModifiers(infrastructureDamagePipeline, ctx.outcome, ctx);

    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 1 structure in selected settlement
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: damage 1d3 structures in selected settlement
    if (ctx.outcome === 'criticalFailure') {
      // Roll 1d3 for number of structures to damage
      const roll = Math.floor(Math.random() * 3) + 1;
      await resolver.damageStructure(undefined, undefined, roll);
    }

    return { success: true };
  }
};
