/**
 * Diplomatic Mission Action Pipeline
 * Improve relations with a faction
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { factionService } from '../../services/factions';
import type { Faction } from '../../models/Faction';
import { createGameCommandsService } from '../../services/GameCommandsService';
import type { ResourceType } from '../../types/modifiers';
import { textBadge } from '../../types/OutcomeBadge';

export const establishDiplomaticRelationsPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'diplomatic-mission',
  name: 'Diplomatic Mission',
  description: 'Send envoys to improve your kingdom\'s standing with neighboring powers and influential organizations',
  brief: 'Improve relations with a faction',
  category: 'foreign-affairs',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'formal negotiations', doctrine: 'idealist' },
    { skill: 'society', description: 'cultural exchange', doctrine: 'idealist' },
    { skill: 'religion', description: 'sacred alliances', doctrine: 'idealist' },
    { skill: 'performance', description: 'gala events', doctrine: 'practical' },
    { skill: 'occultism', description: 'mystical bonds', doctrine: 'practical' },
    { skill: 'deception', description: 'manipulation and subterfuge', doctrine: 'ruthless' },
    { skill: 'intimidation', description: 'demand compliance', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The diplomatic mission is a resounding success.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('Diplomatic success', 'fa-handshake', 'positive')
      ]
    },
    success: {
      description: 'Relations improve.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -4, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The diplomatic mission fails.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Your diplomats offend the faction.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -4, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!kingdom.factions || kingdom.factions.length === 0) {
      return {
        met: false,
        reason: 'No factions available for diplomatic relations'
      };
    }
    
    const improvableFactions = kingdom.factions.filter(
      (f: Faction) => f.attitude !== 'Helpful' && f.attitude !== 'Hostile'
    );
    
    if (improvableFactions.length === 0) {
      return {
        met: false,
        reason: 'No factions can be improved (all are Helpful or Hostile)'
      };
    }
    
    const availableGold = kingdom.resources?.gold || 0;
    if (availableGold < 4) {
      return {
        met: false,
        reason: 'Insufficient gold (need at least 4 gold)'
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
      filter: (faction: Faction, kingdom: any) => {
        if (faction.attitude === 'Hostile' || faction.attitude === 'Unfriendly' || faction.attitude === 'Indifferent') {
          return { eligible: true };
        }
        
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
    format: (preview) => {
      return preview.outcomeBadges;
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

      const badges: any[] = [];
      const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');

      if (ctx.outcome === 'criticalSuccess') {
        const newAttitude = adjustAttitudeBySteps(faction.attitude, 1);
        if (newAttitude) {
          badges.push(textBadge(
            `Attitude with ${faction.name} improves from ${faction.attitude} to ${newAttitude}`,
            'positive'
          ));
        } else {
          badges.push(textBadge(
            `Attitude with ${faction.name} cannot improve further (already ${faction.attitude})`,
            'neutral'
          ));
        }
      } else if (ctx.outcome === 'success') {
        const newAttitude = adjustAttitudeBySteps(faction.attitude, 1, { maxLevel: 'Friendly' });
        if (newAttitude) {
          badges.push(textBadge(
            `Attitude with ${faction.name} improves from ${faction.attitude} to ${newAttitude}`,
            'positive'
          ));
        } else {
          badges.push(textBadge(
            `Attitude with ${faction.name} cannot improve further (already ${faction.attitude})`,
            'neutral'
          ));
        }
      } else if (ctx.outcome === 'failure') {
        badges.push(textBadge(
          `The diplomatic mission fails (no change to relations with ${faction.name})`,
          'neutral'
        ));
      } else if (ctx.outcome === 'criticalFailure') {
        const newAttitude = adjustAttitudeBySteps(faction.attitude, -1);
        if (newAttitude) {
          badges.push(textBadge(
            `Attitude with ${faction.name} worsens from ${faction.attitude} to ${newAttitude}`,
            'negative'
          ));
        } else {
          badges.push(textBadge(
            `Attitude with ${faction.name} cannot worsen further (already ${faction.attitude})`,
            'neutral'
          ));
        }
      }

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
        outcomeBadges: badges,
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

    const outcomeKey = ctx.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    const goldModifier = (establishDiplomaticRelationsPipeline.outcomes[outcomeKey]?.modifiers || []).find(
      (m: any) => m.resource === 'gold' && m.type === 'static'
    );
    
    if (goldModifier && 'value' in goldModifier && typeof goldModifier.value === 'number') {
      const gameCommandsService = await createGameCommandsService();
      await gameCommandsService.applyOutcome({
        type: 'action',
        sourceId: 'diplomatic-mission',
        sourceName: `Diplomatic Mission with ${faction.name}`,
        outcome: ctx.outcome,
        modifiers: [{
          type: 'static',
          resource: 'gold' as ResourceType,
          value: goldModifier.value as number,
          duration: 'immediate'
        }]
      });
    }

    if (ctx.outcome === 'criticalSuccess') {
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
      return { success: true, message: `The diplomatic mission fails (no change to relations with ${faction.name})` };
    } else if (ctx.outcome === 'criticalFailure') {
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
};
