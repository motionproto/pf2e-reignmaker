/**
 * Mass Desertion Threat Incident Pipeline
 *
 * Generated from data/incidents/major/mass-desertion-threat.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const massDesertionThreatPipeline: CheckPipeline = {
  id: 'mass-desertion-threat',
  name: 'Mass Desertion Threat',
  description: 'Your armies threaten mass desertion',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'rally troops' },
      { skill: 'intimidation', description: 'threaten deserters' },
      { skill: 'performance', description: 'inspire loyalty' },
    ],

  outcomes: {
    success: {
      description: 'The troops remain loyal.',
      modifiers: []
    },
    failure: {
      description: 'A military morale crisis damages your forces.',
      modifiers: [],
      manualEffects: ["Choose 1 army. That army must make a morale check (DC = kingdom level + 5). On failure, the army disbands", "Mark your highest tier military structure as damaged"]
    },
    criticalFailure: {
      description: 'Widespread desertion devastates your military.',
      modifiers: [],
      manualEffects: ["Choose 2 armies. Each army must make a morale check (DC = kingdom level + 5). On failure, the army disbands", "Reduce your highest tier military structure's tier by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1 army morale check + structure damage
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-shield-alt',
          prefix: '',
          value: { type: 'text', text: '1 army morale check' },
          suffix: '',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: 'Military structure damaged' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 2 armies morale check + structure downgrade
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-shield-alt',
          prefix: '',
          value: { type: 'text', text: '2 armies morale check' },
          suffix: '',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: 'Military structure downgraded' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure'
          ? ['1 army must make a morale check (DC = kingdom level + 5) or disband', 'Highest military structure is damaged']
          : ctx.outcome === 'criticalFailure'
            ? ['2 armies must make morale checks (DC = kingdom level + 5) or disband', 'Highest military structure is downgraded']
            : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(massDesertionThreatPipeline, ctx.outcome);

    // Damage/destroy military structure
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();

      if (ctx.outcome === 'failure') {
        // Damage highest military structure
        await resolver.damageStructure(undefined, undefined, 1);
      } else {
        // Destroy/downgrade highest military structure
        await resolver.destroyStructure('military', 'highest', 1);
      }
    }

    // Note: Army morale checks handled as manual effect
    return { success: true };
  }
};
