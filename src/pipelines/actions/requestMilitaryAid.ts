/**
 * Request Military Aid Action Pipeline
 *
 * Call for allied troops in battle.
 * Converted from data/player-actions/request-military-aid.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { factionService } from '../../services/factions';
import type { Faction } from '../../models/Faction';

export const requestMilitaryAidPipeline: CheckPipeline = {
  id: 'request-military-aid',
  name: 'Request Military Aid',
  description: 'Call upon allies to provide troops or military support during conflicts',
  checkType: 'action',
  category: 'foreign-affairs',

  /**
   * Pre-roll interaction: Select friendly/helpful faction
   * Requirements: Diplomatic relations at least friendly
   */
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

  /**
   * Skills - various approaches to requesting military support
   */
  skills: [
    { skill: 'diplomacy', description: 'alliance obligations' },
    { skill: 'intimidation', description: 'pressure tactics' },
    { skill: 'society', description: 'mutual defense' },
    { skill: 'arcana', description: 'magical pacts' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your ally sends elite reinforcements to support your cause',
      modifiers: []
    },
    success: {
      description: 'Your ally provides military equipment and supplies',
      modifiers: []
    },
    failure: {
      description: 'Your ally cannot help at this time',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your ally is offended by the request',
      modifiers: []
    }
  },

  preview: {
    calculate: async (ctx) => {
      const factionId = ctx.metadata?.faction?.id || ctx.metadata?.factionId;
      if (!factionId) {
        return {
          resources: [],
          specialEffects: [],
          warnings: ['No faction selected']
        };
      }

      const faction = factionService.getFaction(factionId);
      if (!faction) {
        return {
          resources: [],
          specialEffects: [],
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
};
