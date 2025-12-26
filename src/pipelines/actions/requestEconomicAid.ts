/**
 * Request Economic Aid Action Pipeline
 * Ask allies for financial support
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { factionService } from '../../services/factions';
import type { Faction } from '../../models/Faction';
import { textBadge } from '../../types/OutcomeBadge';

export const requestEconomicAidPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'request-economic-aid',
  name: 'Request Economic Aid',
  description: 'Appeal to allied nations for material support in times of need',
  brief: 'Ask allies for financial support',
  category: 'foreign-affairs',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'formal request', doctrine: 'idealist' },
    { skill: 'performance', description: 'emotional appeal', doctrine: 'idealist' },
    { skill: 'medicine', description: 'humanitarian aid', doctrine: 'practical' },
    { skill: 'society', description: 'leverage connections', doctrine: 'practical' },
    { skill: 'deception', description: 'exaggerate need', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your ally provides generous support.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('Receive economic aid', 'fa-coins', 'positive')
      ]
    },
    success: {
      description: 'Your ally provides support.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4+1', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Your ally cannot help.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your ally is offended.',
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
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
        if (faction.attitude !== 'Friendly' && faction.attitude !== 'Helpful') {
          return { 
            eligible: false, 
            reason: 'Relations must be at least Friendly'
          };
        }
        
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

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge(`${faction.name} provides generous support (2d6 gold)`, 'fa-coins', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge(`${faction.name} provides support (1d4+1 gold)`, 'fa-coins', 'positive')
        );
      }

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

    if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
      const result = await applyPreRolledModifiers(ctx);
      
      if (!result.success) {
        return { success: false, error: `Failed to apply gold: ${result.error}` };
      }
      
      await updateKingdom(k => {
        if (!k.turnState?.actionsPhase?.factionsAidedThisTurn) {
          if (!k.turnState) return;
          if (!k.turnState.actionsPhase) return;
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
};
