/**
 * requestMilitaryAid Action Pipeline
 * Data from: data/player-actions/request-military-aid.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import type { Faction } from '../../models/Faction';
import { factionService } from '../../services/factions';
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
        // Check if there are eligible armies
        const armies = ctx.kingdom.armies || [];
        const eligibleArmies = armies.filter((army: any) => {
          if (!army.actorId) return false;
          const equipmentCount = army.equipment 
            ? Object.values(army.equipment).filter(Boolean).length 
            : 0;
          return equipmentCount < 4;
        });

        // If no armies available, show gold fallback
        if (eligibleArmies.length === 0) {
          return {
            resources: [
              { resource: 'gold', amount: 1 }
            ],
            specialEffects: [{
              type: 'status' as const,
              message: 'Your lack of military leaves little opportunity for support',
              variant: 'neutral' as const
            }],
            warnings: []
          };
        }

        // Otherwise show equipment message (will show post-roll interaction)
        effects.push({
          type: 'status' as const,
          message: `${faction.name} provides military equipment and supplies`,
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

  postApplyInteractions: [
    {
      id: 'recruit-allied-army',
      type: 'configuration',
      condition: (ctx) => ctx.outcome === 'criticalSuccess',
      component: 'RecruitArmyDialog',  // Resolved via ComponentRegistry
      componentProps: {
        show: true,
        exemptFromUpkeep: true
      }
    },
    {
      id: 'outfit-army',
      type: 'configuration',
      condition: (ctx) => {
        if (ctx.outcome !== 'success') return false;
        
        // Check if there are eligible armies (with available equipment slots)
        const armies = ctx.kingdom.armies || [];
        const eligibleArmies = armies.filter((army: any) => {
          if (!army.actorId) return false;
          const equipmentCount = army.equipment 
            ? Object.values(army.equipment).filter(Boolean).length 
            : 0;
          return equipmentCount < 4;
        });
        
        // Only show dialog if there are eligible armies
        return eligibleArmies.length > 0;
      },
      component: 'OutfitArmySelectionDialog'  // Resolved via ComponentRegistry
    }
  ],

  execute: async (ctx) => {
    const factionId = ctx.metadata?.faction?.id || ctx.metadata?.factionId;
    
    if (!factionId) {
      return { success: false, error: 'No faction selected' };
    }

    const faction = factionService.getFaction(factionId);
    if (!faction) {
      return { success: false, error: 'Faction not found' };
    }

    const { getKingdomActor } = await import('../../stores/KingdomStore');
    const actor = getKingdomActor();
    if (!actor) {
      return { success: false, error: 'No kingdom actor available' };
    }

    // Handle different outcomes
    if (ctx.outcome === 'criticalSuccess') {
      // Create allied army from postApplyInteractions resolution
      const recruitmentData = ctx.resolution?.['recruit-allied-army'];
      
      // Handle cancellation gracefully (user cancelled recruitment dialog)
      if (!recruitmentData) {
        return { 
          success: true, 
          message: 'Army recruitment cancelled - no army was created',
          cancelled: true 
        };
      }

      // Create allied army via game command (uses prepare/commit pattern)
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      
      const preparedCommand = await resolver.recruitArmy(
        ctx.kingdom.level,
        recruitmentData.name,
        true // exemptFromUpkeep
      );

      // Commit the prepared command
      if (preparedCommand.commit) {
        await preparedCommand.commit();
      }

      // Mark faction as having provided aid this turn
      await actor.updateKingdomData((kingdom: any) => {
        if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
          if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
          if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
          if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) {
            kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
          }
        }
        if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
          kingdom.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
        }
      });

      return { 
        success: true, 
        message: `${faction.name} sent elite reinforcements (allied army exempt from upkeep)` 
      };
    }
    
    if (ctx.outcome === 'success') {
      // Check if there are eligible armies
      const armies = ctx.kingdom.armies || [];
      const eligibleArmies = armies.filter((army: any) => {
        if (!army.actorId) return false;
        const equipmentCount = army.equipment 
          ? Object.values(army.equipment).filter(Boolean).length 
          : 0;
        return equipmentCount < 4;
      });

      // If no eligible armies, grant 1 gold as fallback
      if (eligibleArmies.length === 0) {
        await actor.updateKingdomData((kingdom: any) => {
          kingdom.resources.gold = (kingdom.resources.gold || 0) + 1;
        });

        // Mark faction as having provided aid this turn
        await actor.updateKingdomData((kingdom: any) => {
          if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
            if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
            if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
            if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) {
              kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
            }
          }
          if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
            kingdom.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
          }
        });

        return { 
          success: true, 
          message: `${faction.name} provided 1 gold (no armies available to outfit)` 
        };
      }

      // Outfit army from postApplyInteractions resolution
      const outfitData = ctx.resolution?.['outfit-army'];
      
      // Handle cancellation gracefully (user cancelled outfit dialog)
      if (!outfitData) {
        return { 
          success: true, 
          message: 'Army outfit cancelled - no equipment was applied',
          cancelled: true 
        };
      }

      // Apply equipment via game command
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      
      // outfitArmy returns PreparedCommand | ResolveResult
      const result = await resolver.outfitArmy(
        outfitData.armyId,
        outfitData.equipmentType,
        'success', // outcome
        false // fallbackToGold
      );

      // Check if it's a PreparedCommand (has commit function)
      if ('commit' in result && typeof result.commit === 'function') {
        // It's a PreparedCommand - commit it
        await result.commit();
      } else {
        // It's a ResolveResult - type narrow and check if it succeeded
        const resolveResult = result as { success: boolean; error?: string };
        if (!resolveResult.success) {
          return { success: false, error: resolveResult.error };
        }
      }

      // Mark faction as having provided aid this turn
      await actor.updateKingdomData((kingdom: any) => {
        if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
          if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
          if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
          if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) {
            kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
          }
        }
        if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
          kingdom.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
        }
      });

      return { 
        success: true, 
        message: `${faction.name} provided military equipment and supplies` 
      };
    }
    
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

    return { success: true };
  }
});
