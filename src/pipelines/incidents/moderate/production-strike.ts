/**
 * Production Strike Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { diceBadge } from '../../../types/OutcomeBadge';

// Production resources that can be affected by strikes
const PRODUCTION_RESOURCES = ['lumber', 'ore', 'stone'] as const;

function pickRandomProductionResource(): string {
  return PRODUCTION_RESOURCES[Math.floor(Math.random() * PRODUCTION_RESOURCES.length)];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const productionStrikePipeline: CheckPipeline = {
  id: 'production-strike',
  name: 'Production Strike',
  description: 'Workers strike, halting resource production',
  checkType: 'incident',
  severity: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with workers' },
      { skill: 'society', description: 'arbitrate' },
      { skill: 'crafting', description: 'work alongside' },
      { skill: 'arcana', description: 'automate production' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The strike ends peacefully.',
      modifiers: []
    },
    success: {
      description: 'The strike ends.',
      modifiers: []
    },
    failure: {
      description: 'The strike causes resource losses.',
      modifiers: [],
      outcomeBadges: [
        diceBadge('-1d4 of a random resource', 'fa-box', '1d4', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A prolonged strike devastates production.',
      modifiers: [],
      outcomeBadges: [
        diceBadge('-2d4 of a random resource', 'fa-box', '2d4', 'negative')
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];

      // Only show preview for failure outcomes
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        return { resources: [], outcomeBadges: [], warnings: [] };
      }

      // Pick a random production resource
      const randomResource = pickRandomProductionResource();
      
      // Store in metadata for reference
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata._randomResource = randomResource;

      // Create dice badge for the random resource loss
      // Template must match pattern: "Lose {{value}} [Resource]" for auto-conversion
      const formula = ctx.outcome === 'failure' ? '1d4' : '2d4';
      outcomeBadges.push(
        diceBadge(`Lose {{value}} ${capitalizeFirst(randomResource)}`, 'fa-box', formula, 'negative')
      );

      return {
        resources: [],
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: undefined, // No execute needed - dice badges are automatically converted to resource modifiers
                     // and applied via ResolutionDataBuilder before execute runs

  traits: ["dangerous"],
};
