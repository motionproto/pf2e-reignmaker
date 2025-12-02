/**
 * Work Stoppage Incident Pipeline
 *
 * Failure: Lose 1d4 of a random commodity resource
 * Critical Failure: Lose 1d4 of two different random commodity resources
 */

import type { CheckPipeline} from '../../../types/CheckPipeline';
import { diceBadge, textBadge } from '../../../types/OutcomeBadge';

// Random commodity resources (not gold - that's not a commodity)
const COMMODITY_RESOURCES = ['food', 'lumber', 'stone', 'ore'] as const;

function pickRandomCommodity(): string {
  return COMMODITY_RESOURCES[Math.floor(Math.random() * COMMODITY_RESOURCES.length)];
}

function pickTwoRandomCommodities(): [string, string] {
  const first = pickRandomCommodity();
  let second = pickRandomCommodity();
  
  // Ensure second is different from first
  while (second === first) {
    second = pickRandomCommodity();
  }
  
  return [first, second];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const workStoppagePipeline: CheckPipeline = {
  id: 'work-stoppage',
  name: 'Work Stoppage',
  description: 'Workers in your kingdom refuse to continue their labor',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with workers' },
      { skill: 'intimidation', description: 'force work' },
      { skill: 'performance', description: 'inspire workers' },
      { skill: 'medicine', description: 'address health concerns' },
    ],

  outcomes: {
    success: {
      description: 'The workers return.',
      modifiers: []
    },
    failure: {
      description: 'Work stoppage halts production.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Lose 1d4 of a random resource', 'fa-box', 'negative')
      ]
    },
    criticalFailure: {
      description: 'Widespread work stoppage causes chaos.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Lose 1d4 of two random resources', 'fa-box', 'negative')
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

      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }

      if (ctx.outcome === 'failure') {
        // Pick a random commodity resource
        const randomResource = pickRandomCommodity();
        ctx.metadata._randomResource = randomResource;

        // Create dice badge for the random resource loss
        // The dice will be rolled in the UI and auto-applied via ResolutionDataBuilder
        outcomeBadges.push(
          diceBadge(`Lose {{value}} ${capitalizeFirst(randomResource)}`, 'fa-box', '1d4', 'negative')
        );
      } else if (ctx.outcome === 'criticalFailure') {
        // Pick two different random commodity resources
        const [resource1, resource2] = pickTwoRandomCommodities();
        ctx.metadata._randomResource1 = resource1;
        ctx.metadata._randomResource2 = resource2;

        // Create dice badges for both random resource losses
        // The dice will be rolled in the UI and auto-applied via ResolutionDataBuilder
        outcomeBadges.push(
          diceBadge(`Lose {{value}} ${capitalizeFirst(resource1)}`, 'fa-box', '1d4', 'negative')
        );
        outcomeBadges.push(
          diceBadge(`Lose {{value}} ${capitalizeFirst(resource2)}`, 'fa-box', '1d4', 'negative')
        );
      }

      return { resources: [], outcomeBadges, warnings: [] };
    }
  },

  // No execute needed - dice badges are automatically converted to resource modifiers
  // and applied via ResolutionDataBuilder before execute runs
  execute: undefined,

  traits: ["dangerous"],
};
