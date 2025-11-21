/**
 * establishSettlement Action Pipeline
 * Data from: data/player-actions/establish-settlement.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const establishSettlementPipeline = createActionPipeline('establish-settlement', {
  requirements: (kingdom) => {
    const requirements: string[] = [];
    
    const resources = kingdom.resources || {};
    const gold = resources.gold || 0;
    const food = resources.food || 0;
    const lumber = resources.lumber || 0;
    
    if (gold < 2) requirements.push(`Need 2 Gold (have ${gold})`);
    if (food < 2) requirements.push(`Need 2 Food (have ${food})`);
    if (lumber < 2) requirements.push(`Need 2 Lumber (have ${lumber})`);
    
    return {
      met: requirements.length === 0,
      reason: requirements.length > 0 ? requirements.join(', ') : undefined
    };
  },

  preRollInteractions: [
    {
      type: 'map-selection',
      id: 'location',
      mode: 'hex-selection',
      count: 1,
      colorType: 'settlement'
    },
    {
      type: 'text-input',
      id: 'settlementName',
      label: 'Settlement name'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const resourceCost = ctx.outcome === 'failure' ? -1 : -2;

      const resources = [
        { resource: 'gold', value: resourceCost },
        { resource: 'food', value: resourceCost },
        { resource: 'lumber', value: resourceCost }
      ];

      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      const outcomeBadges = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        outcomeBadges.push(textBadge(`Will found ${ctx.metadata.settlementName || 'new settlement'}`, 'fa-building', 'positive'));

        if (ctx.outcome === 'criticalSuccess') {
          outcomeBadges.push(textBadge('Grants free Tier 1 structure', 'fa-gift', 'positive'));
        }
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return; // No settlement founded
    }

    const grantFreeStructure = ctx.outcome === 'criticalSuccess';

    await foundSettlementExecution({
      name: ctx.metadata.settlementName || 'New Settlement',
      location: ctx.metadata.location || { x: 0, y: 0 },
      grantFreeStructure
    });
  }
});
