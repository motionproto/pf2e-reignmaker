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
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(guerrillaMovementPipeline, ctx.outcome);
    return { success: true };
  }
};
