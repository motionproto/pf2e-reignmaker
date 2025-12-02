/**
 * Riot Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const riotPipeline: CheckPipeline = {
  id: 'riot',
  name: 'Riot',
  description: 'Violent riots break out in your settlements',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'intimidation', description: 'suppress riot' },
      { skill: 'diplomacy', description: 'negotiate with rioters' },
      { skill: 'athletics', description: 'contain riot' },
      { skill: 'medicine', description: 'treat injured' },
    ],

  outcomes: {
    success: {
      description: 'The riot is quelled.',
      modifiers: []
    },
    failure: {
      description: 'The riot damages property.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'A violent riot destroys property.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'destroyStructure', count: 1 }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
