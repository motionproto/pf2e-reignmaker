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
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: damage 1 random structure
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: '1 structure damaged' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 1 unrest + 1d3 structures damaged
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'dice', formula: '1d3' },
          suffix: 'structures damaged',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(infrastructureDamagePipeline, ctx.outcome);

    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 1 structure
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: damage 1d3 structures
    if (ctx.outcome === 'criticalFailure') {
      // Roll 1d3 for number of structures to damage
      const roll = Math.floor(Math.random() * 3) + 1;
      await resolver.damageStructure(undefined, undefined, roll);
    }

    return { success: true };
  }
};
