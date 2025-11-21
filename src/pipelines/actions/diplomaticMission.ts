/**
 * diplomaticMission Action Pipeline
 * Data from: data/player-actions/diplomatic-mission.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { factionService } from '../../services/factions';
import type { Faction } from '../../types/factions';

import { textBadge } from '../../types/OutcomeBadge';
export const establishDiplomaticRelationsPipeline = createActionPipeline('diplomatic-mission', {
  requirements: (kingdom) => {
    if (!kingdom.factions || kingdom.factions.length === 0) {
      return {
        met: false,
        reason: 'No factions available for diplomatic relations'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      id: 'faction',
      type: 'entity-selection',
      entityType: 'faction',
      label: 'Select Faction for Diplomatic Mission',
      // Pass filter function that marks factions as eligible/ineligible
      // Note: This doesn't actually filter them out - dialog will show all but gray out ineligible ones
      filter: (faction: Faction, kingdom: any) => {
        console.log('🔍 [establishDiplomaticRelations] Filter called for faction:', faction?.name);
        
        // Can always target Hostile or worse (trying to improve relations)
        if (faction.attitude === 'Hostile' || faction.attitude === 'Unfriendly' || faction.attitude === 'Indifferent') {
          return { eligible: true };
        }
        
        // For Friendly factions, check if we have diplomatic capacity to promote to Helpful
        if (faction.attitude === 'Friendly') {
          const diplomaticCapacity = kingdom?.resources?.diplomaticCapacity || 1;
          const helpfulCount = (kingdom?.factions || []).filter((f: Faction) => f.attitude === 'Helpful').length;
          
          if (helpfulCount >= diplomaticCapacity) {
            return { 
              eligible: false, 
              reason: 'Further diplomatic support required'
            };
          }
        }
        
        // Helpful factions can't be improved further (already at max)
        if (faction.attitude === 'Helpful') {
          return { 
            eligible: false, 
            reason: 'Already at maximum attitude'
          };
        }
        
        return { eligible: true };
      }
    }
  ],

  preview: {
    // Custom format to avoid duplicate gold display
    // (Resources are already shown in Outcome section, only show attitude changes here)
    format: (preview) => {
      return preview.outcomeBadges; // Only return special effects, skip resources
    },
    
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

      // Calculate new attitude using the adjustment utility
      const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');

      // Show attitude changes based on outcome
      if (ctx.outcome === 'criticalSuccess') {
        const newAttitude = adjustAttitudeBySteps(faction.attitude, 1);
        if (newAttitude) {
          effects.push({
            type: 'status' as const,
            message: `Attitude with ${faction.name} improves from ${faction.attitude} to ${newAttitude}`,
            variant: 'positive' as const
          });
        } else {
          effects.push({
            type: 'status' as const,
            message: `Attitude with ${faction.name} cannot improve further (already ${faction.attitude})`,
            variant: 'neutral' as const
          });
        }
      } else if (ctx.outcome === 'success') {
        const newAttitude = adjustAttitudeBySteps(faction.attitude, 1, { maxLevel: 'Friendly' });
        if (newAttitude) {
          effects.push({
            type: 'status' as const,
            message: `Attitude with ${faction.name} improves from ${faction.attitude} to ${newAttitude}`,
            variant: 'positive' as const
          });
        } else {
          effects.push({
            type: 'status' as const,
            message: `Attitude with ${faction.name} cannot improve further (already ${faction.attitude})`,
            variant: 'neutral' as const
          });
        }
      } else if (ctx.outcome === 'criticalFailure') {
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

      // Get gold cost from outcome modifiers
      const outcomeKey = ctx.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const goldModifier = (establishDiplomaticRelationsPipeline.outcomes[outcomeKey]?.modifiers || []).find(
        (m: any) => m.resource === 'gold' && m.type === 'static'
      );
      
      const resources = goldModifier && 'value' in goldModifier ? [{
        resource: 'gold',
        value: goldModifier.value
      }] : [];

      return {
        resources,
        specialEffects: effects,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    console.log('🎯 [establishDiplomaticRelations] Execute function called');
    console.log('🎯 [establishDiplomaticRelations] Context:', ctx);
    console.log('🎯 [establishDiplomaticRelations] Metadata:', ctx.metadata);
    console.log('🎯 [establishDiplomaticRelations] Outcome:', ctx.outcome);
    
    const factionId = ctx.metadata?.faction?.id || ctx.metadata?.factionId;
    console.log('🎯 [establishDiplomaticRelations] Faction ID:', factionId);
    
    if (!factionId) {
      console.error('❌ [establishDiplomaticRelations] No faction selected');
      return { success: false, error: 'No faction selected' };
    }

    const faction = factionService.getFaction(factionId);
    if (!faction) {
      return { success: false, error: 'Faction not found' };
    }

    const { updateKingdom } = await import('../../stores/KingdomStore');

    // Apply gold cost from outcome modifiers
    const outcomeKey = ctx.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    const goldModifier = (establishDiplomaticRelationsPipeline.outcomes[outcomeKey]?.modifiers || []).find(
      (m: any) => m.resource === 'gold' && m.type === 'static'
    );
    
    if (goldModifier && 'value' in goldModifier && typeof goldModifier.value === 'number') {
      await updateKingdom(k => {
        if (k.resources && typeof k.resources.gold === 'number') {
          k.resources.gold += goldModifier.value as number;
          console.log(`💰 [establishDiplomaticRelations] Applied ${goldModifier.value} gold (new value: ${k.resources.gold})`);
        }
      });
    }

    // Handle outcomes (gold costs are handled by modifiers)
    if (ctx.outcome === 'criticalSuccess') {
      // Improve attitude by 1 step (no max)
      const result = await factionService.adjustAttitude(factionId, 1);
      
      if (result.success) {
        return { 
          success: true, 
          message: `Diplomatic mission succeeded! Attitude with ${faction.name} improved from ${result.oldAttitude} to ${result.newAttitude}` 
        };
      } else {
        return { 
          success: true, 
          message: `Diplomatic mission succeeded, but attitude cannot improve further (already ${result.oldAttitude})` 
        };
      }
    } else if (ctx.outcome === 'success') {
      // Improve attitude by 1 step (max Friendly)
      const result = await factionService.adjustAttitude(factionId, 1, { maxLevel: 'Friendly' });
      
      if (result.success) {
        return { 
          success: true, 
          message: `Relations improved! Attitude with ${faction.name} improved from ${result.oldAttitude} to ${result.newAttitude}` 
        };
      } else {
        return { 
          success: true, 
          message: `Relations cannot improve further (already ${result.oldAttitude})` 
        };
      }
    } else if (ctx.outcome === 'failure') {
      // No attitude change, just gold cost
      return { success: true, message: `The diplomatic mission fails (no change to relations with ${faction.name})` };
    } else if (ctx.outcome === 'criticalFailure') {
      // Worsen attitude by 1 step
      const result = await factionService.adjustAttitude(factionId, -1);
      
      if (result.success) {
        return { 
          success: true, 
          message: `Your diplomats offend ${faction.name}! Attitude worsened from ${result.oldAttitude} to ${result.newAttitude}` 
        };
      } else {
        return { 
          success: true, 
          message: `Your diplomats offend ${faction.name}, but attitude cannot worsen further (already ${result.oldAttitude})` 
        };
      }
    }

    return { success: true };
  }
});
