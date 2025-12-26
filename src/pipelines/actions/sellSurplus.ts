/**
 * Sell Surplus Action Pipeline
 * Trade resources for gold based on commerce structure tier
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { applyResourceChanges } from '../shared/InlineActionHelpers';
import { getBestTradeRates } from '../../services/commerce/tradeRates';
import { getResourceIcon } from '../../view/kingdom/utils/presentation';

export const sellSurplusPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'sell-surplus',
  name: 'Sell Surplus',
  description: 'Convert excess resources into gold. Better commerce structures provide better trade rates.',
  brief: 'Trade resources for gold based on commerce structure tier',
  category: 'economic-resources',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'trade negotiations', doctrine: 'idealist' },
    { skill: 'society', description: 'market knowledge', doctrine: 'practical' },
    { skill: 'performance', description: 'showcase goods', doctrine: 'practical' },
    { skill: 'deception', description: 'inflate value', doctrine: 'ruthless' },
    { skill: 'thievery', description: 'black market', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You secure exceptional trade rates.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Sell resources', 'fa-cash-register', 'positive')
      ]
    },
    success: {
      description: 'Resources are sold.',
      modifiers: []
    },
    failure: {
      description: 'No buyers are found.',
      modifiers: []
    },
    criticalFailure: {
      description: 'You lose resources to fraud and corruption.',
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const baseRates = getBestTradeRates();
    const minAmount = baseRates.sell.resourceCost;

    const resources = kingdom.resources;
    const hasEnough = resources && (
      (resources.food || 0) >= minAmount ||
      (resources.lumber || 0) >= minAmount ||
      (resources.stone || 0) >= minAmount ||
      (resources.ore || 0) >= minAmount
    );

    if (!hasEnough) {
      return { met: false, reason: `Need at least ${minAmount} of any resource to sell` };
    }

    return { met: true };
  },

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'SellResourceSelector',
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      },
      onComplete: async (data: any, ctx: any) => {
        const { selectedResource, selectedAmount, goldGained } = data || {};
        
        if (!selectedResource || !selectedAmount || goldGained === undefined) {
          throw new Error('No resource selection was made');
        }
        
        const result = await applyResourceChanges([
          { resource: selectedResource, amount: -selectedAmount },
          { resource: 'gold', amount: goldGained }
        ], 'sell-surplus');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to sell resources');
        }
      }
    }
  ],

  preview: {
    calculate: async (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        const resources = ctx.kingdom.resources;
        const plentifulResource = getMostPlentifulResource(resources);
        
        return {
          resources: [],
          outcomeBadges: [{
            icon: getResourceIcon(plentifulResource),
            template: `Lose {{value}} ${capitalize(plentifulResource)}`,
            value: { type: 'dice', formula: '1d4' },
            variant: 'negative'
          }]
        };
      }
      
      return { resources: [] };
    }
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Resource changes are applied by onComplete handler in postRollInteractions
        return { success: true };
        
      case 'criticalFailure':
        const penaltyModifier = ctx.resolutionData?.numericModifiers?.[0];
        
        if (!penaltyModifier) {
          return { success: true };
        }
        
        const resource = penaltyModifier.resource;
        const amount = Math.abs(penaltyModifier.value);
        
        const result = await applyResourceChanges([
          { resource, amount: -amount }
        ], 'sell-surplus');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to apply fraud penalty');
        }
        
        return { success: true };
        
      case 'failure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};

/**
 * Helper: Find most plentiful resource (random selection if tied)
 */
function getMostPlentifulResource(resources: any): 'food' | 'lumber' | 'stone' | 'ore' {
  const standard = ['food', 'lumber', 'stone', 'ore'] as const;
  const counts = standard.map(r => ({ 
    resource: r, 
    amount: resources[r] || 0 
  }));
  
  const max = Math.max(...counts.map(c => c.amount));
  const tied = counts.filter(c => c.amount === max);
  
  return tied[Math.floor(Math.random() * tied.length)].resource;
}

/**
 * Helper: Capitalize resource name
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
