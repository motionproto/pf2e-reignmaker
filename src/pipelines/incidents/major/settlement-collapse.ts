/**
 * Settlement Collapse Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const settlementCollapsePipeline: CheckPipeline = {
  id: 'settlement-collapse',
  name: 'Settlement Collapse',
  description: 'A major settlement faces total collapse',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'address concerns' },
      { skill: 'society', description: 'emergency aid' },
      { skill: 'religion', description: 'provide hope' },
    ],

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlement',
      entityType: 'settlement',
      label: 'Select Settlement at Risk of Collapse',
      required: true
    }
  ],

  outcomes: {
    success: {
      description: 'The settlement is stabilized.',
      modifiers: []
    },
    failure: {
      description: 'A major crisis threatens the settlement.',
      modifiers: [],
      gameCommands: [
        { type: 'damageStructure', count: 2 }
      ]
    },
    criticalFailure: {
      description: 'A settlement collapses.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'destroyStructure', count: 1 }
      ],
      manualEffects: ["The selected settlement loses one level (minimum level 1)"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
