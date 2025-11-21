/**
 * requestEconomicAid Action Pipeline
 * Data from: data/player-actions/request-economic-aid.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const requestEconomicAidPipeline = createActionPipeline('request-economic-aid', {
  requirements: (kingdom) => {
    const hasAllies = kingdom.factions?.some(f => 
      f.attitude === 'Friendly' || f.attitude === 'Helpful'
    );
    
    if (!hasAllies) {
      return {
        met: false,
        reason: 'Requires friendly or helpful with at least one faction'
      };
    }
    
    return { met: true };
  },

  preRollInteractions: [
    {
      id: 'faction',
      type: 'entity-selection',
      entityType: 'faction',
      label: 'Select Faction for Economic Aid Request',
      filter: (faction: Faction) => {
        // Only Friendly or Helpful factions can provide aid
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

      // Show gold gain message based on outcome
      if (ctx.outcome === 'criticalSuccess') {
        effects.push({
          type: 'status' as const,
          message: `${faction.name} provides generous support (2d6 gold)`,
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        effects.push({
          type: 'status' as const,
          message: `${faction.name} provides support (1d4+1 gold)`,
          variant: 'positive' as const
        });
      }

      // Show attitude warning on crit failure (matches establish-diplomatic-relations pattern)
      if (ctx.outcome === 'criticalFailure') {
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

    // ✅ Read pre-rolled gold values from numericModifiers (rolled during Apply phase)
    const goldModifier = ctx.resolutionData.numericModifiers.find((m: any) => m.resource === 'gold');
    const goldAmount = goldModifier?.value || 0;

    // Apply gold if present (crit success or success)
    if (goldAmount > 0) {
      const { updateKingdom } = await import('../../stores/KingdomStore');
      
      await updateKingdom(k => {
        if (k.resources && typeof k.resources.gold === 'number') {
          k.resources.gold += goldAmount;
        }
      });
      
      return { 
        success: true, 
        message: `${faction.name} provides ${goldAmount} gold in support!` 
      };
    }
    
    // Handle failures
    if (ctx.outcome === 'failure') {
      return { 
        success: true, 
        message: `${faction.name} cannot help at this time` 
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

    return { success: true };
  }
});
