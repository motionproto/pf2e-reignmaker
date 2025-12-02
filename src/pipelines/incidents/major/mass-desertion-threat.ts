/**
 * Mass Desertion Threat Incident Pipeline
 *
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
      gameCommands: [
        { type: 'damageStructure', count: 1 }
      ],
      manualEffects: ["Choose 1 army. That army must make a morale check (DC = kingdom level + 5). On failure, the army disbands"]
    },
    criticalFailure: {
      description: 'Widespread desertion devastates your military.',
      modifiers: [],
      gameCommands: [
        { type: 'destroyStructure', category: 'military', targetTier: 'highest', count: 1 }
      ],
      manualEffects: ["Choose 2 armies. Each army must make a morale check (DC = kingdom level + 5). On failure, the army disbands"]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined
};
