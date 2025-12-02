/**
 * Prison Breaks Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const prisonBreaksPipeline: CheckPipeline = {
  id: 'prison-breaks',
  name: 'Prison Breaks',
  description: 'Mass prison breaks release dangerous criminals',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'intimidation', description: 'lockdown prisons' },
      { skill: 'athletics', description: 'pursuit' },
      { skill: 'society', description: 'negotiation' },
    ],

  outcomes: {
    success: {
      description: 'The break is prevented.',
      modifiers: []
    },
    failure: {
      description: 'A mass prison break releases many criminals.',
      modifiers: [],
      gameCommands: [
        { type: 'releaseImprisoned', percentage: 50 }
      ]
    },
    criticalFailure: {
      description: 'A complete prison break releases all criminals.',
      modifiers: [],
      gameCommands: [
        { type: 'releaseImprisoned', percentage: 'all' }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges (none for this incident, only game commands)
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
