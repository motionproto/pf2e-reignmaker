/**
 * requestEconomicAid Action Pipeline
 * Data from: data/player-actions/request-economic-aid.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { factionService } from '../../services/factions';
import type { Faction } from '../../models/Faction';

import { textBadge } from '../../types/OutcomeBadge';
export const requestEconomicAidPipeline = createActionPipeline('request-economic-aid', {
  requirements: (kingdom) => {
    // Check if there are any Friendly/Helpful factions
    const hasAllies = kingdom.factions?.some(f => 
      f.attitude === 'Friendly' || f.attitude === 'Helpful'
    );
    
    if (!hasAllies) {
      return {
        met: false,
        reason: 'Requires friendly or helpful with at least one faction'
      };
    }
    
    // Check if any Friendly/Helpful faction hasn't already provided aid this turn
    const aidedThisTurn = kingdom.turnState?.actionsPhase?.factionsAidedThisTurn || [];
    const availableFactions = kingdom.factions?.filter(f => 
      (f.attitude === 'Friendly' || f.attitude === 'Helpful') && 
      !aidedThisTurn.includes(f.id)
    );
    
    if (!availableFactions || availableFactions.length === 0) {
      return {
        met: false,
        reason: 'All friendly factions have already provided support this turn'
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
      filter: (faction: Faction, kingdom: any) => {
        // Only Friendly or Helpful factions can provide aid
        if (faction.attitude !== 'Friendly' && faction.attitude !== 'Helpful') {
          return { 
            eligible: false, 
            reason: 'Relations must be at least Friendly'
          };
        }
        
        // Check if faction already provided aid this turn
        const aidedThisTurn = kingdom.turnState?.actionsPhase?.factionsAidedThisTurn || [];
        if (aidedThisTurn.includes(faction.id)) {
          return {
            eligible: false,
            reason: 'Already provided support this turn'
          };
        }
        
        return { eligible: true };
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

      const outcomeBadges: any[] = [];

      // Show gold gain message based on outcome
      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge(`${faction.name} provides generous support (2d6 gold)`, 'fa-coins', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge(`${faction.name} provides support (1d4+1 gold)`, 'fa-coins', 'positive')
        );
      }

      // Show attitude warning on crit failure (matches establish-diplomatic-relations pattern)
      if (ctx.outcome === 'criticalFailure') {
        const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');
        const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
        
        if (newAttitude) {
          outcomeBadges.push(
            textBadge(`Attitude with ${faction.name} worsens from ${faction.attitude} to ${newAttitude}`, 'fa-handshake', 'negative')
          );
        } else {
          outcomeBadges.push(
            textBadge(`Attitude with ${faction.name} cannot worsen further (already ${faction.attitude})`, 'fa-handshake', 'info')
          );
        }
      }

      return {
        resources: [],
        outcomeBadges,
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

    const { updateKingdom } = await import('../../stores/KingdomStore');
    const { applyPreRolledModifiers } = await import('../shared/applyPreRolledModifiers');

    // Handle outcomes
    if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
      // ✅ Apply pre-rolled gold modifiers using helper
      const result = await applyPreRolledModifiers(ctx);
      
      if (!result.success) {
        return { success: false, error: `Failed to apply gold: ${result.error}` };
      }
      
      // Mark faction as having provided aid this turn
      await updateKingdom(k => {
        if (!k.turnState?.actionsPhase?.factionsAidedThisTurn) {
          console.warn('[requestEconomicAid] turnState.actionsPhase.factionsAidedThisTurn not initialized, initializing now');
          if (!k.turnState) {
            console.error('[requestEconomicAid] ❌ turnState is null/undefined - cannot track faction aid');
            return;
          }
          if (!k.turnState.actionsPhase) {
            console.error('[requestEconomicAid] ❌ actionsPhase is null/undefined - cannot track faction aid');
            return;
          }
          k.turnState.actionsPhase.factionsAidedThisTurn = [];
        }
        
        if (!k.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
          k.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
        }
      });
      
      return { 
        success: true, 
        message: `${faction.name} provides economic support!` 
      };
    }
    
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
