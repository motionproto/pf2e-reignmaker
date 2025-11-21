/**
 * requestMilitaryAid Action Pipeline
 * Data from: data/player-actions/request-military-aid.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const requestMilitaryAidPipeline = createActionPipeline('request-military-aid', {
  requirements: (kingdom) => {
    const hasAllies = kingdom.factions?.some(f => 
      f.attitude === 'Friendly' || f.attitude === 'Helpful'
    );
    
    if (!hasAllies) {
      return {
        met: false,
        reason: 'Requires diplomatic relations (Friendly or Helpful) with at least one faction'
      };
    }
    
    return { met: true };
  },

  preRollInteractions: [
    {
      id: 'faction',
      type: 'entity-selection',
      entityType: 'faction',
      label: 'Select Faction for Military Aid Request',
      filter: (faction: Faction) => {
        // Only Friendly or Helpful factions can provide military aid
        if (faction.attitude === 'Friendly' || faction.attitude === 'Helpful') {
          return { eligible: true };
        }
        
        return { 
          eligible: false, 
          reason: 'Relations must be at least Friendly'
        };
      }
    }
  ],

  preview: {
    calculate: async (ctx) => {
      const factionId = ctx.metadata?.faction?.id || ctx.metadata?.factionId;
      if (!factionId) {
        return {
          resources: [],
          outcomeBadges: [],
          warnings: ['No faction selected']
        };
      }

      const faction = factionService.getFaction(factionId);
      if (!faction) {
        return {
          resources: [],
          outcomeBadges: [],
          warnings: ['Faction not found']
        };
      }

      const effects: any[] = [];

      // Show appropriate message based on outcome
      if (ctx.outcome === 'criticalSuccess') {
        effects.push({
          type: 'entity' as const,
          message: `${faction.name} will send elite reinforcements (allied army, exempt from upkeep)`,
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        effects.push({
          type: 'status' as const,
          message: `${faction.name} will provide military equipment and supplies`,
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'criticalFailure') {
        // Show attitude warning on crit failure (matches establish-diplomatic-relations pattern)
        const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
        const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
        
        if (newAttitude) {
          effects.push({
            type: 'status' as const,
            message: `Attitude with ${faction.name} worsens from ${faction.attitude} to ${newAttitude}`,
            variant: 'negative' as const
          });
        } else {
          effects.push({
            type: 'status' as const,
            message: `Attitude with ${faction.name} cannot worsen further (already ${faction.attitude})`,
            variant: 'neutral' as const
          });
        }
      }

      return {
        resources: [],
        specialEffects: effects,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const factionId = ctx.metadata?.faction?.id || ctx.metadata?.factionId;
    
    if (!factionId) {
      return { success: false, error: 'No faction selected' };
    }

    const faction = factionService.getFaction(factionId);
    if (!faction) {
      return { success: false, error: 'Faction not found' };
    }

    // Note: Critical success and success outcomes are handled by custom resolution
    // (RequestMilitaryAidAction.ts) which shows recruitment/equipment dialogs
    // This execute() only handles failure and critical failure
    
    if (ctx.outcome === 'failure') {
      return { 
        success: true, 
        message: `${faction.name} cannot provide military support at this time` 
      };
    } 
    
    if (ctx.outcome === 'criticalFailure') {
      // Worsen attitude by 1 step
      const result = await factionService.adjustAttitude(factionId, -1);
      
      if (result.success) {
        return { 
          success: true, 
          message: `Your request offends ${faction.name}! Attitude worsened from ${result.oldAttitude} to ${result.newAttitude}` 
        };
      } else {
        return { 
          success: true, 
          message: `Your request offends ${faction.name}, but attitude cannot worsen further (already ${result.oldAttitude})` 
        };
      }
    }

    // Critical success and success are handled by custom resolution
    return { success: true };
  }
});
