/**
 * Trade War Incident Pipeline
 *
 * Generated from data/incidents/major/trade-war.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const tradeWarPipeline: CheckPipeline = {
  id: 'trade-war',
  name: 'Trade War',
  description: 'A trade war devastates your economy',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'negotiate' },
      { skill: 'society', description: 'find loopholes' },
      { skill: 'deception', description: 'smuggling routes' },
      { skill: 'arcana', description: 'teleportation network' },
    ],

  outcomes: {
    success: {
      description: 'Trade continues.',
      modifiers: []
    },
    failure: {
      description: 'A trade war damages your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'choice', resources: ["lumber", "ore", "food", "stone"], value: '2d4+1', negative: true, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'Economic isolation devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '3d4', negative: true, duration: 'immediate' },
        { type: 'choice', resources: ["lumber", "ore", "food", "stone"], value: '2d4+1', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(tradeWarPipeline, ctx.outcome);
    return { success: true };
  }
};
