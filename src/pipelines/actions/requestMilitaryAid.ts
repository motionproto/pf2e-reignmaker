/**
 * Request Military Aid Action Pipeline
 * Call for allied troops in battle
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { Faction } from '../../models/Faction';
import { factionService } from '../../services/factions';
import { textBadge } from '../../types/OutcomeBadge';

export const requestMilitaryAidPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'request-military-aid',
  name: 'Request Military Aid',
  description: 'Call upon allies to provide troops or military support during conflicts',
  brief: 'Call for allied troops in battle',
  category: 'foreign-affairs',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'alliance obligations', doctrine: 'virtuous' },
    { skill: 'society', description: 'mutual defense', doctrine: 'practical' },
    { skill: 'arcana', description: 'magical pacts', doctrine: 'practical' },
    { skill: 'intimidation', description: 'pressure tactics', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your ally sends elite reinforcements to support your cause.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Receive military aid', 'fa-shield-alt', 'positive')
      ]
    },
    success: {
      description: 'Your ally provides military equipment and supplies.',
      modifiers: []
    },
    failure: {
      description: 'Your ally cannot help at this time.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your ally is offended by the request.',
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

      const outcomeBadges: any[] = [];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge(`${faction.name} will send elite reinforcements (allied army, exempt from upkeep)`, 'fa-shield-alt', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        const armies = ctx.kingdom.armies || [];
        const eligibleArmies = armies.filter((army: any) => {
          if (!army.actorId) return false;
          const equipmentCount = army.equipment 
            ? Object.values(army.equipment).filter(Boolean).length 
            : 0;
          return equipmentCount < 4;
        });

        if (eligibleArmies.length === 0) {
          return {
            resources: [
              { resource: 'gold', amount: 1 }
            ],
            outcomeBadges: [
              textBadge('Your lack of military leaves little opportunity for support', 'fa-coins', 'info')
            ],
            warnings: []
          };
        }

        outcomeBadges.push(
          textBadge(`${faction.name} provides military equipment and supplies`, 'fa-shield', 'positive')
        );
      } else if (ctx.outcome === 'criticalFailure') {
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

  postApplyInteractions: [
    {
      id: 'recruit-allied-army',
      type: 'configuration',
      condition: (ctx) => ctx.outcome === 'criticalSuccess',
      component: 'RecruitArmyDialog',
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
        
        const armies = ctx.kingdom.armies || [];
        const eligibleArmies = armies.filter((army: any) => {
          if (!army.actorId) return false;
          const equipmentCount = army.equipment 
            ? Object.values(army.equipment).filter(Boolean).length 
            : 0;
          return equipmentCount < 4;
        });
        
        return eligibleArmies.length > 0;
      },
      component: 'OutfitArmyResolution',
      componentProps: {
        outcome: 'success'
      },
      onComplete: async (data: any, ctx: any) => {
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['outfit-army'] = data;
      }
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

    if (ctx.outcome === 'criticalSuccess') {
      const recruitmentData = ctx.resolution?.['recruit-allied-army'];
      
      if (!recruitmentData) {
        return { 
          success: true, 
          message: 'Army recruitment cancelled - no army was created',
          cancelled: true 
        };
      }

      const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
      const { getPartyLevel } = await import('../../services/gameCommands/GameCommandUtils');
      const registry = getGameCommandRegistry();
      const partyLevel = getPartyLevel();
      
      const preparedCommand = await registry.process(
        {
          type: 'recruitArmy',
          level: partyLevel,
          recruitmentData: {
            name: recruitmentData.name,
            armyType: recruitmentData.armyType,
            settlementId: recruitmentData.settlementId || null,
            supportedBy: faction.name
          },
          exemptFromUpkeep: true
        },
        { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
      );

      if (preparedCommand?.commit) {
        await preparedCommand.commit();
      }

      await actor.updateKingdomData((kingdom: any) => {
        if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
          if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
          if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
          if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) {
            kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
          }
        }
        if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
          kingdom.turnState.actionsPhase.factionsAidedThisTurn = [
            ...kingdom.turnState.actionsPhase.factionsAidedThisTurn,
            factionId
          ];
        }
      });

      return { 
        success: true, 
        message: `${faction.name} sent elite reinforcements (allied army exempt from upkeep)` 
      };
    }
    
    if (ctx.outcome === 'success') {
      const armies = ctx.kingdom.armies || [];
      const eligibleArmies = armies.filter((army: any) => {
        if (!army.actorId) return false;
        const equipmentCount = army.equipment 
          ? Object.values(army.equipment).filter(Boolean).length 
          : 0;
        return equipmentCount < 4;
      });

      if (eligibleArmies.length === 0) {
        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommandsService = await createGameCommandsService();
        
        await gameCommandsService.applyNumericModifiers([
          { resource: 'gold', value: 1 }
        ], ctx.outcome);

        await actor.updateKingdomData((kingdom: any) => {
          if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
            if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
            if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
            if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) {
              kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
            }
          }
          if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
            kingdom.turnState.actionsPhase.factionsAidedThisTurn = [
              ...kingdom.turnState.actionsPhase.factionsAidedThisTurn,
              factionId
            ];
          }
        });

        return { 
          success: true, 
          message: `${faction.name} provided 1 gold (no armies available to outfit)` 
        };
      }

      const outfitData = ctx.resolution?.['outfit-army'];
      
      if (!outfitData) {
        return { 
          success: true, 
          message: 'Army outfit cancelled - no equipment was applied',
          cancelled: true 
        };
      }

      const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
      const registry = getGameCommandRegistry();
      
      const result = await registry.process(
        {
          type: 'outfitArmy',
          armyId: outfitData.armyId,
          equipmentType: outfitData.equipmentType,
          outcome: 'success',
          fallbackToGold: false
        },
        { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
      );

      if ('commit' in result && typeof result.commit === 'function') {
        await result.commit();
      } else {
        const resolveResult = result as { success: boolean; error?: string };
        if (!resolveResult.success) {
          return { success: false, error: resolveResult.error };
        }
      }

      await actor.updateKingdomData((kingdom: any) => {
        if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
          if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
          if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
          if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) {
            kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
          }
        }
        if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
          kingdom.turnState.actionsPhase.factionsAidedThisTurn = [
            ...kingdom.turnState.actionsPhase.factionsAidedThisTurn,
            factionId
          ];
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
