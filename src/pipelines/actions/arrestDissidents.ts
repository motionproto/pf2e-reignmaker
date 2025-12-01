/**
 * Arrest Dissidents Action Pipeline
 * Convert current unrest to imprisoned unrest
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { hasUnrestToArrest, calculateImprisonmentCapacity } from '../shared/ActionHelpers';
import ArrestDissidentsResolution from '../../view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte';

export const arrestDissidentsPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'arrest-dissidents',
  name: 'Arrest Dissidents',
  description: 'Round up troublemakers and malcontents, converting unrest into imprisoned unrest that can be dealt with through the justice system',
  brief: 'Convert current unrest to imprisoned unrest',
  category: 'uphold-stability',
  checkType: 'action',

  skills: [
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'society', description: 'legal procedures' },
    { skill: 'stealth', description: 'covert operations' },
    { skill: 'deception', description: 'infiltration tactics' },
    { skill: 'athletics', description: 'physical pursuit' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troublemakers are swiftly arrested.',
      modifiers: []
    },
    success: {
      description: 'The troublemakers are arrested.',
      modifiers: []
    },
    failure: {
      description: 'The arrests fail.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Botched arrests cause riots.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!hasUnrestToArrest(kingdom)) {
      return { met: false, reason: 'No unrest to arrest' };
    }
    
    const capacity = calculateImprisonmentCapacity(kingdom);
    if (capacity.available <= 0) {
      return { met: false, reason: 'No justice structures with available capacity' };
    }
    
    return { met: true };
  },

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'arrest-details',
      component: ArrestDissidentsResolution,
      condition: (ctx: any) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess'
    }
  ],

  preview: {
    calculate: (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [{ resource: 'unrest', value: 1 }],
          outcomeBadges: [],
          warnings: []
        };
      }

      return {
        resources: [],
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalFailure' || ctx.outcome === 'failure') {
      return { success: true };
    }

    const customData = ctx.resolutionData?.customComponentData;
    const allocations = customData?.allocations;
    
    if (!allocations || Object.keys(allocations).length === 0) {
      return { 
        success: false, 
        error: 'No imprisoned unrest allocations provided' 
      };
    }

    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommands = await createGameCommandsService();
    
    const result = await gameCommands.allocateImprisonedUnrest(allocations);
    
    if (!result.success) {
      return result;
    }
    
    return { success: true };
  }
};
