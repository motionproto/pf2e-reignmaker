/**
 * Secession Crisis Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
