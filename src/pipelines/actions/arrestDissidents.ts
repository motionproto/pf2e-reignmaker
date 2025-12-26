/**
 * Arrest Dissidents Action Pipeline
 * Convert current unrest to imprisoned unrest
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { hasUnrestToArrest } from '../shared/ActionHelpers';
import { structuresService } from '../../services/structures';
import { get } from 'svelte/store';
import { currentFaction } from '../../stores/KingdomStore';
import ArrestDissidentsResolution from '../../view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte';
import { textBadge } from '../../types/OutcomeBadge';

export const arrestDissidentsPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'arrest-dissidents',
  name: 'Arrest Dissidents',
  description: 'Round up troublemakers and malcontents, converting unrest into imprisoned unrest that can be dealt with through the justice system',
  brief: 'Convert current unrest to imprisoned unrest',
  category: 'uphold-stability',
  checkType: 'action',

  skills: [
    { skill: 'society', description: 'legal procedures', doctrine: 'idealist' },
    { skill: 'athletics', description: 'physical pursuit', doctrine: 'practical' },
    { skill: 'stealth', description: 'discreet investigations', doctrine: 'practical' },
    { skill: 'intimidation', description: 'forced confession', doctrine: 'ruthless' },
    { skill: 'deception', description: 'false charges', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troublemakers are swiftly arrested.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Imprison dissidents and reduce unrest', 'fa-user-lock', 'positive')
      ]
    },
    success: {
      description: 'The troublemakers are arrested.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Imprison dissidents', 'fa-user-lock', 'positive')
      ]
    },
    failure: {
      description: 'The arrests fail.',
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Botched arrests cause riots.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!hasUnrestToArrest(kingdom)) {
      return { met: false, reason: 'No unrest to arrest' };
    }
    
    // Calculate imprisonment capacity only from owned settlements
    const faction = get(currentFaction);
    let availableCapacity = 0;
    
    for (const settlement of kingdom.settlements || []) {
      // Check if settlement is owned by current faction
      const hex = kingdom.hexes?.find((h: any) => 
        h.row === settlement.location.x && h.col === settlement.location.y
      );
      if (hex?.claimedBy !== faction) {
        continue;
      }
      
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      const used = settlement.imprisonedUnrest || 0;
      availableCapacity += Math.max(0, capacity - used);
    }
    
    if (availableCapacity <= 0) {
      return { met: false, reason: 'No justice structures with available capacity' };
    }
    
    return { met: true };
  },

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'arrest-details',
      component: ArrestDissidentsResolution,
      condition: (ctx: any) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const outcomeBadges = [];
      const resources = [];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('Imprison dissidents and reduce unrest', 'fa-user-lock', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Imprison dissidents', 'fa-user-lock', 'positive')
        );
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      return {
        resources,
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalFailure' || ctx.outcome === 'failure') {
      return { success: true };
    }

    const customData = ctx.resolutionData?.customComponentData;
    const allocations = customData?.allocations;
    
    if (!allocations || Object.keys(allocations).length === 0) {
      return { 
        success: false, 
        error: 'No imprisoned unrest allocations provided' 
      };
    }

    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommands = await createGameCommandsService();
    
    const result = await gameCommands.allocateImprisonedUnrest(allocations);
    
    if (!result.success) {
      return result;
    }
    
    return { success: true };
  }
};
