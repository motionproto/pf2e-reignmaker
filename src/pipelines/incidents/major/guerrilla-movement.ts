/**
 * Guerrilla Movement Incident Pipeline
 *
 * Generated from data/incidents/major/guerrilla-movement.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const guerrillaMovementPipeline: CheckPipeline = {
  id: 'guerrilla-movement',
  name: 'Guerrilla Movement',
  description: 'Armed rebels seize control of kingdom territory',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with rebels' },
      { skill: 'intimidation', description: 'crush rebellion' },
      { skill: 'society', description: 'address grievances' },
      { skill: 'religion', description: 'appeal to faith' },
    ],

  outcomes: {
    success: {
      description: 'The rebellion is dispersed.',
      modifiers: []
    },
    failure: {
      description: 'Rebels seize territory.',
      modifiers: [],
      manualEffects: ["Roll 1d3 and mark that many hexes as rebel-controlled (cannot use these hexes until rebellion is resolved)"]
    },
    criticalFailure: {
      description: 'Rebels establish a stronghold.',
      modifiers: [],
      manualEffects: ["Roll 2d3 and mark that many hexes as rebel-controlled (cannot use these hexes until rebellion is resolved)", "Rebels raise an army with level = (your kingdom level - 1). Track this army as an enemy force"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1d3 hexes rebel-controlled
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-flag',
          prefix: '',
          value: { type: 'dice', formula: '1d3' },
          suffix: 'hexes seized by rebels',
          variant: 'negative'
        });
      }

      // Critical Failure: 2d3 hexes rebel-controlled + rebel army
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-flag',
          prefix: '',
          value: { type: 'dice', formula: '2d3' },
          suffix: 'hexes seized by rebels',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-shield-alt',
          prefix: '',
          value: { type: 'text', text: 'Rebel army raised' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure'
          ? ['Mark 1d3 hexes as rebel-controlled (cannot use until resolved)']
          : ctx.outcome === 'criticalFailure'
            ? ['Mark 2d3 hexes as rebel-controlled', 'Rebels raise an army (level = kingdom level - 1)']
            : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(guerrillaMovementPipeline, ctx.outcome);
    // Note: Hex seizure and rebel army commands not implemented - handled as manual effects
    return { success: true };
  }
};
