/**
 * tendWounded Action Pipeline
 * Data from: data/player-actions/tend-wounded.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { tendWoundedExecution } from '../../execution/armies/tendWounded';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const tendWoundedPipeline = createActionPipeline('tend-wounded', {
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
        // Store army selection and fetch army data for post-roll
        ctx.metadata = ctx.metadata || {};
        ctx.metadata.armyId = data.armyId;
        ctx.metadata.armyName = data.armyName;
        
        // Fetch army HP and conditions data
        const game = (globalThis as any).game;
        const kingdom = ctx.kingdom;
        const army = kingdom?.armies?.find((a: any) => a.id === data.armyId);
        
        if (army?.actorId) {
          const npcActor = game?.actors?.get(army.actorId);
          
          if (npcActor) {
            // Store HP data
            ctx.metadata.currentHP = npcActor.system?.attributes?.hp?.value || 0;
            ctx.metadata.maxHP = npcActor.system?.attributes?.hp?.max || 0;
            
            // Store conditions data (filter out beneficial effects)
            const items = Array.from(npcActor.items.values()) as any[];
            const allConditions = items
              .filter((i: any) => {
                if (i.type !== 'condition' && i.type !== 'effect') return false;
                
                // Filter out beneficial effects by checking for positive keywords
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
            
            // Deduplicate by slug+badge combination
            const uniqueConditions = new Map();
            allConditions.forEach(c => {
              const key = `${c.slug}${c.badge ? `-${c.badge}` : ''}`;
              if (!uniqueConditions.has(key)) {
                uniqueConditions.set(key, c);
              }
            });
            
            ctx.metadata.conditions = Array.from(uniqueConditions.values());
            
            console.log('✅ [tendWounded] Stored army data in context:', {
              armyId: data.armyId,
              armyName: data.armyName,
              hp: `${ctx.metadata.currentHP}/${ctx.metadata.maxHP}`,
              conditions: ctx.metadata.conditions
            });
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

  // ✅ INLINE COMPONENT: Displays BEFORE "Apply Result" clicked
  // Component shows inline in OutcomeDisplay for better UX
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'tend-wounded-resolution',
      component: 'TendWoundedResolution',  // Resolved via ComponentRegistry
      condition: (ctx: any) => ctx.outcome === 'success',  // Only success, not critical success
      // NO onComplete handler - execution happens in execute()
      // Component dispatches 'resolution' event which OutcomeDisplay captures
      // Data is stored in ctx.resolutionData.customComponentData['tend-wounded-resolution']
    }
  ],

  execute: async (ctx: any) => {
    // Get army selection from pre-roll interaction
    const armyId = ctx.metadata?.armyId;
    const armyName = ctx.metadata?.armyName;
    
    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    // For critical success, auto-apply (full heal + remove all conditions)
    if (ctx.outcome === 'criticalSuccess') {
      await tendWoundedExecution(armyId, ctx.outcome);
      return { success: true, message: `${armyName} fully healed and all conditions removed` };
    }

    // For success, get player's choice from post-roll interaction
    if (ctx.outcome === 'success') {
      console.log('🔍 [tendWounded] Resolution Data:', JSON.stringify(ctx.resolutionData, null, 2));
      const tendData = ctx.resolutionData?.customComponentData?.['tend-wounded-resolution'];
      
      // Handle cancellation
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

    // For failure, nothing happens
    if (ctx.outcome === 'failure') {
      return { success: true, message: 'Recovery attempt had no effect' };
    }

    // For critical failure, increase enfeebled
    if (ctx.outcome === 'criticalFailure') {
      await tendWoundedExecution(armyId, ctx.outcome);
      return { success: true, message: `${armyName} became more enfeebled` };
    }

    return { success: true };
  }
});
