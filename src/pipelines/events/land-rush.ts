/**
 * Land Rush Event Pipeline
 *
 * Uses the proper game commands pattern with postApplyInteractions
 * for hex selection (same as claim-hexes action).
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { validateClaimHex } from '../shared/claimHexValidator';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
import { textBadge } from '../../types/OutcomeBadge';

export const landRushPipeline: CheckPipeline = {
  id: 'land-rush',
  name: 'Land Rush',
  description: 'Settlers attempt to claim wilderness at the kingdom\'s border.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'negotiate with settlers' },
      { skill: 'survival', description: 'guide their efforts' },
      { skill: 'intimidation', description: 'assert control' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Settlers expand the kingdom.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: [
        textBadge('Claim 2 hexes', 'fa-map-marked-alt', 'positive')
      ]
    },
    success: {
      description: 'Settlers claim new land.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: [
        textBadge('Claim 1 hex', 'fa-map-marked-alt', 'positive')
      ]
    },
    failure: {
      description: 'The settlers disperse.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts at the border.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous"],

  // Use postApplyInteractions for hex selection (same pattern as claim-hexes action)
  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      colorType: 'claim',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: validateClaimHex,
      outcomeAdjustment: {
        criticalSuccess: { count: 2, title: 'Select 2 hexes to claim (Critical Success)' },
        success: { count: 1, title: 'Select 1 hex to claim' },
        failure: { count: 0 },
        criticalFailure: { count: 0 }
      }
    }
  ],

  // Execute hex claiming after selection
  execute: async (ctx) => {
    // Only claim hexes on success outcomes
    if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
      const hexIds = ctx.resolutionData?.compoundData?.selectedHexes;
      
      if (!hexIds || hexIds.length === 0) {
        return { 
          success: true, 
          message: 'Event resolved - no hexes selected',
          cancelled: true 
        };
      }
      
      await claimHexesExecution(hexIds);
      return { success: true, message: `Claimed ${hexIds.length} hex(es)` };
    }
    
    // Failure/critical failure just apply modifiers (handled by default)
    return { success: true };
  }
};
