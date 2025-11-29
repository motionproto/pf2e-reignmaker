/**
 * Secession Crisis Incident Pipeline
 *
 * Generated from data/incidents/major/secession-crisis.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const secessionCrisisPipeline: CheckPipeline = {
  id: 'secession-crisis',
  name: 'Secession Crisis',
  description: 'A settlement declares independence from your kingdom',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'negotiate autonomy' },
      { skill: 'intimidation', description: 'suppress movement' },
      { skill: 'society', description: 'address grievances' },
      { skill: 'performance', description: 'inspire loyalty' },
    ],

  outcomes: {
    success: {
      description: 'The independence movement is quelled.',
      modifiers: []
    },
    failure: {
      description: 'A settlement revolts.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one settlement. That settlement loses one level (minimum level 1)", "Reduce the highest tier structure's tier in that settlement by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
    criticalFailure: {
      description: 'A settlement declares independence.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one settlement. That settlement and all adjacent hexes secede from your kingdom (remove them from your map and mark as independent city-state)", "Any armies located in the seceded hexes defect to the new city-state (remove them from your control)"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 2d4 gold loss + settlement downgrade + structure damage
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-city',
          prefix: '',
          value: { type: 'text', text: 'Settlement loses 1 level' },
          suffix: '',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-home',
          prefix: '',
          value: { type: 'text', text: 'Structure downgraded' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 2 unrest + settlement secedes
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 2 });
        outcomeBadges.push({
          icon: 'fa-city',
          prefix: '',
          value: { type: 'text', text: 'Settlement secedes!' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure'
          ? ['One settlement loses a level and its highest structure is downgraded']
          : ctx.outcome === 'criticalFailure'
            ? ['One settlement and adjacent hexes secede from your kingdom!', 'Any armies in seceded hexes defect']
            : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(secessionCrisisPipeline, ctx.outcome);
    // Note: Settlement secession commands not implemented - handled as manual effects
    return { success: true };
  }
};
