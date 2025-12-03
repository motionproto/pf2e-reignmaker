/**
 * Trade War Incident Pipeline
 *
 * Economic warfare damages your kingdom's trade and resources.
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { diceBadge, textBadge } from '../../../types/OutcomeBadge';

const COMMODITY_RESOURCES = ['food', 'lumber', 'stone', 'ore'] as const;

function pickRandomCommodity(): string {
  return COMMODITY_RESOURCES[Math.floor(Math.random() * COMMODITY_RESOURCES.length)];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const tradeWarPipeline: CheckPipeline = {
  id: 'trade-war',
  name: 'Trade War',
  description: 'A trade war devastates your economy',
  checkType: 'incident',
  severity: 'major',

  skills: [
    { skill: 'diplomacy', description: 'negotiate' },
    { skill: 'society', description: 'find loopholes' },
    { skill: 'deception', description: 'smuggling routes' },
    { skill: 'arcana', description: 'teleportation network' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Trade continues unimpeded.',
      modifiers: []
    },
    success: {
      description: 'Trade continues.',
      modifiers: []
    },
    failure: {
      description: 'A trade war damages your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
      ],
      outcomeBadges: [
        textBadge('Lose 2d4+1 random commodity', 'fa-box', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Economic isolation devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '3d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      outcomeBadges: [
        textBadge('Lose 2d4+1 random commodity', 'fa-box', 'negative')
      ]
    },
  },

  traits: ["dangerous"],

  preview: {
    async calculate(ctx) {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      
      if (ctx.outcome === 'failure') {
        // Pick a random commodity resource
        const randomResource = pickRandomCommodity();
        ctx.metadata._randomResource = randomResource;

        // Gold loss (already in modifiers, will auto-generate badge)
        
        // Create dice badge for the random resource loss
        outcomeBadges.push(
          diceBadge(`Lose {{value}} ${capitalizeFirst(randomResource)}`, 'fa-box', '2d4+1', 'negative')
        );
      }
      
      if (ctx.outcome === 'criticalFailure') {
        // Pick a random commodity resource
        const randomResource = pickRandomCommodity();
        ctx.metadata._randomResource = randomResource;

        // Gold loss (already in modifiers, will auto-generate badge)
        
        // Create dice badge for the random resource loss
        outcomeBadges.push(
          diceBadge(`Lose {{value}} ${capitalizeFirst(randomResource)}`, 'fa-box', '2d4+1', 'negative')
        );
        
        // Unrest is in modifiers, will auto-generate badge
      }
      
      return { resources: [], outcomeBadges, warnings };
    }
  }
};
