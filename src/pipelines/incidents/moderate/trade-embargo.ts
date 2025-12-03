/**
 * Trade Embargo Incident Pipeline
 *
 * Failure: Lose 1d4 gold + 1d4+1 of a random commodity
 * Critical Failure: Lose 2d4 gold + 1d4+1 of a random commodity + 1 Unrest
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { diceBadge, textBadge } from '../../../types/OutcomeBadge';

// Random commodity resources (not gold - that's not a commodity)
const COMMODITY_RESOURCES = ['food', 'lumber', 'stone', 'ore'] as const;

function pickRandomCommodity(): string {
  return COMMODITY_RESOURCES[Math.floor(Math.random() * COMMODITY_RESOURCES.length)];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const tradeEmbargoPipeline: CheckPipeline = {
  id: 'trade-embargo',
  name: 'Trade Embargo',
  description: 'Neighboring kingdoms impose trade restrictions',
  checkType: 'incident',
  severity: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'negotiate' },
      { skill: 'society', description: 'find loopholes' },
      { skill: 'deception', description: 'smuggling routes' },
      { skill: 'occultism', description: 'divine trade routes' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your kingdom negotiates favorable trade deals during the embargo.',
      modifiers: []  // No modifiers needed (+1 Fame auto-applied by UnifiedCheckHandler)
    },
    success: {
      description: 'Trade continues normally despite the embargo.',
      modifiers: []
    },
    failure: {
      description: 'A trade embargo disrupts your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ],
      // Show what will happen (specific resource chosen at roll time)
      outcomeBadges: [
        textBadge('Lose 1d4+1 of a random resource', 'fa-box', 'negative')
      ]
    },
    criticalFailure: {
      description: 'A complete trade embargo cripples your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      // Show what will happen (specific resource chosen at roll time)
      outcomeBadges: [
        textBadge('Lose 1d4+1 of a random resource', 'fa-box', 'negative')
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

      // Pick a random commodity resource
      const randomResource = pickRandomCommodity();
      
      // Store in metadata for execute step
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata._randomResource = randomResource;

      // Create dice badge for the random resource loss
      // Template must match pattern: "Lose {{value}} [Resource]" for auto-conversion
      outcomeBadges.push(
        diceBadge(`Lose {{value}} ${capitalizeFirst(randomResource)}`, 'fa-box', '1d4+1', 'negative')
      );

      return {
        resources: [],
        outcomeBadges,
        warnings: []
      };
    }
  },

  traits: ["dangerous"],
};
