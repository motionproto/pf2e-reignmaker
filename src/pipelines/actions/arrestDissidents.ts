/**
 * Arrest Dissidents Action Pipeline
 *
 * Convert current unrest to imprisoned unrest.
 * Data from: data/player-actions/arrest-dissidents.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { hasUnrestToArrest, calculateImprisonmentCapacity } from '../shared/ActionHelpers';
import { textBadge } from '../../types/OutcomeBadge';
import ArrestDissidentsResolution from '../../view/kingdom/components/OutcomeDisplay/components/ArrestDissidentsResolution.svelte';

// Store reference for execute function
const pipeline = createActionPipeline('arrest-dissidents', {
  requirements: (kingdom) => {
    // Check if there's any unrest to arrest
    if (!hasUnrestToArrest(kingdom)) {
      return { met: false, reason: 'No unrest to arrest' };
    }
    
    // Check imprisonment capacity
    const capacity = calculateImprisonmentCapacity(kingdom);
    if (capacity.available <= 0) {
      return { met: false, reason: 'No justice structures with available capacity' };
    }
    
    return { met: true };
  },

  // Post-roll interaction - embedded in outcome display (Step 5)
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
      if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [{ resource: 'unrest', value: 1 }],
          outcomeBadges: [],
          warnings: []
        };
      }

      if (ctx.outcome === 'failure') {
        return {
          resources: [],
          outcomeBadges: [],
          warnings: []
        };
      }

      // Success/Critical Success - no badge needed (component shows info)
      return {
        resources: [],
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Modifiers (unrest changes) applied automatically by execute-first pattern
    
    // Failure outcomes - just return success (modifiers already applied)
    if (ctx.outcome === 'criticalFailure' || ctx.outcome === 'failure') {
      return { success: true };
    }

    // Success/Critical Success - allocations handled by custom component
    // Component data is stored in customComponentData (populated by OutcomeDisplay)
    const customData = ctx.resolutionData?.customComponentData;
    const allocations = customData?.allocations;
    
    if (!allocations || Object.keys(allocations).length === 0) {
      return { 
        success: false, 
        error: 'No imprisoned unrest allocations provided' 
      };
    }

    // Use GameCommandsService to handle the allocation
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommands = await createGameCommandsService();
    
    const result = await gameCommands.allocateImprisonedUnrest(allocations);
    
    if (!result.success) {
      return result;
    }
    
    return { success: true };
  }
});

export const arrestDissidentsPipeline = pipeline;
