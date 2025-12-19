/**
 * Tend Wounded Action Pipeline
 * Heal and restore damaged units
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { tendWoundedExecution } from '../../execution/armies/tendWounded';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const tendWoundedPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'tend-wounded',
  name: 'Tend Wounded',
  description: 'Tend to wounded troops, restore morale, and replenish ranks after battle losses',
  brief: 'Heal and restore damaged units',
  category: 'military-operations',
  checkType: 'action',

  skills: [
    { skill: 'medicine', description: 'heal the wounded' },
    { skill: 'performance', description: 'boost morale' },
    { skill: 'religion', description: 'spiritual restoration' },
    { skill: 'nature', description: 'natural remedies' },
    { skill: 'crafting', description: 'repair equipment' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The troops recover completely.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Full heal + remove all conditions', 'fa-heart', 'positive')
      ]
    },
    success: {
      description: 'The troops recover.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Heal HP or remove condition', 'fa-heart', 'positive')
      ]
    },
    failure: {
      description: 'The troops fail to recover.',
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The recovery effort fails.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Enfeebled condition increased by 1', 'fa-exclamation-triangle', 'negative')
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }

    const hasPlayerArmiesWithActors = kingdom.armies.some((army: any) => 
      army.ledBy === PLAYER_KINGDOM && army.actorId
    );

    if (!hasPlayerArmiesWithActors) {
      return {
        met: false,
        reason: 'No player armies available'
      };
    }

    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'configuration',
      id: 'select-wounded-army',
      component: 'TendWoundedArmySelector',
      componentProps: {
        show: true
      },
      onComplete: async (data: any, ctx: any) => {
        ctx.metadata = ctx.metadata || {};
        ctx.metadata.armyId = data.armyId;
        ctx.metadata.armyName = data.armyName;
        
        const game = (globalThis as any).game;
        const kingdom = ctx.kingdom;
        const army = kingdom?.armies?.find((a: any) => a.id === data.armyId);
        
        if (army?.actorId) {
          const npcActor = game?.actors?.get(army.actorId);
          
          if (npcActor) {
            ctx.metadata.currentHP = npcActor.system?.attributes?.hp?.value || 0;
            ctx.metadata.maxHP = npcActor.system?.attributes?.hp?.max || 0;
            
            const items = Array.from(npcActor.items.values()) as any[];
            const allConditions = items
              .filter((i: any) => {
                if (i.type !== 'condition' && i.type !== 'effect') return false;
                
                const name = i.name?.toLowerCase() || '';
                const isBeneficial = name.includes('bonus') || 
                                    name.includes('+') ||
                                    name.includes('deploy') ||
                                    name.includes('stance') ||
                                    name.includes('inspire');
                
                return !isBeneficial;
              })
              .map((i: any) => ({
                name: i.name,
                slug: i.system?.slug || '',
                badge: i.system?.badge?.value || null,
                img: i.img
              }));
            
            const uniqueConditions = new Map();
            allConditions.forEach(c => {
              const key = `${c.slug}${c.badge ? `-${c.badge}` : ''}`;
              if (!uniqueConditions.has(key)) {
                uniqueConditions.set(key, c);
              }
            });
            
            ctx.metadata.conditions = Array.from(uniqueConditions.values());
          }
        }
      }
    }
  ],

  preview: {
    calculate: (ctx) => {
      const outcomeBadges = [];
      const armyName = ctx.metadata.armyName || 'Army';
      let customDescription: string | undefined;

      if (ctx.outcome === 'criticalSuccess') {
        customDescription = `${armyName} recovers completely.`;
        outcomeBadges.push(
          textBadge('Full heal + remove all conditions', 'fa-heart', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        customDescription = `${armyName} recovers.`;
      } else if (ctx.outcome === 'failure') {
        customDescription = `${armyName} fails to recover.`;
      } else if (ctx.outcome === 'criticalFailure') {
        customDescription = `The recovery effort for ${armyName} fails.`;
        outcomeBadges.push(
          textBadge('Enfeebled condition increased by 1', 'fa-exclamation-triangle', 'negative')
        );
      }

      return { 
        resources: [], 
        outcomeBadges, 
        warnings: [],
        customDescription 
      };
    }
  },

  postRollInteractions: [
    {
      type: 'configuration',
      id: 'tend-wounded-resolution',
      component: 'TendWoundedResolution',
      condition: (ctx: any) => ctx.outcome === 'success',
    }
  ],

  execute: async (ctx: any) => {
    const armyId = ctx.metadata?.armyId;
    const armyName = ctx.metadata?.armyName;
    
    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    if (ctx.outcome === 'criticalSuccess') {
      await tendWoundedExecution(armyId, ctx.outcome);
      return { success: true, message: `${armyName} fully healed and all conditions removed` };
    }

    if (ctx.outcome === 'success') {
      const tendData = ctx.resolutionData?.customComponentData?.['tend-wounded-resolution'];
      
      if (!tendData) {
        return { 
          success: true, 
          message: 'Recovery cancelled - no treatment applied',
          cancelled: true 
        };
      }

      const selectedOption = tendData.selectedOption;
      const conditionToRemove = tendData.conditionToRemove;

      await tendWoundedExecution(armyId, ctx.outcome, selectedOption, conditionToRemove);
      
      if (selectedOption === 'heal') {
        return { success: true, message: `${armyName} healed to full HP` };
      } else {
        return { success: true, message: `Removed condition from ${armyName}` };
      }
    }

    if (ctx.outcome === 'failure') {
      return { success: true, message: 'Recovery attempt had no effect' };
    }

    if (ctx.outcome === 'criticalFailure') {
      await tendWoundedExecution(armyId, ctx.outcome);
      return { success: true, message: `${armyName} became more enfeebled` };
    }

    return { success: true };
  }
};
