/**
 * Request Military Aid - Custom Implementation
 * 
 * Critical Success: Shows army recruitment dialog, then creates allied army (exempt from upkeep)
 * Success: Handled by standard gameCommands (outfitArmy)
 * Critical Failure: Handled by standard gameCommands (adjustFactionAttitude)
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { KingdomData } from '../../actors/KingdomActor';
import type { ResolutionData } from '../../types/modifiers';
import type { ResolveResult } from '../shared/ActionHelpers';
import RequestMilitaryAidResolutionDialog from './RequestMilitaryAidResolutionDialog.svelte';
import { checkFactionAvailabilityRequirement } from '../../controllers/actions/shared-requirements';

const RequestMilitaryAidAction: CustomActionImplementation = {
  id: 'request-military-aid',

  /**
   * Pre-roll dialog configuration
   */
  preRollDialog: {
    dialogId: 'faction-selection',
    extractMetadata: (dialogResult: any) => ({
      factionId: dialogResult.factionId,
      factionName: dialogResult.factionName
    })
  },

  /**
   * Check if action requirements are met
   * Requirements:
   * 1. Diplomatic relations at least friendly
   * 2. At least one eligible faction that hasn't provided aid this turn
   * 
   * NOTE: This check is bypassed after PreparedCommand execution (gold fallback case)
   * because the faction was already marked as aided during pre-roll dialog phase.
   */
  checkRequirements(kingdomData: any, instance?: any): { met: boolean; reason?: string } {
    // If this is being called AFTER apply result (instance has special effects),
    // and it's the gold fallback case, skip requirement checks
    // The work is already done via PreparedCommand, so requirements are moot
    if (instance?.appliedOutcome?.specialEffects) {
      const hasGoldFallback = instance.appliedOutcome.specialEffects.some((e: any) => {
        if (typeof e === 'object' && 'message' in e) {
          return e.message.includes('received 1 Gold instead') || 
                 e.message.includes('No armies available to outfit');
        }
        return false;
      });
      
      if (hasGoldFallback) {
        console.log('🪙 [RequestMilitaryAid] Skipping requirement check for gold fallback (work already done)');
        return { met: true };
      }
    }
    
    return checkFactionAvailabilityRequirement();
  },

  // Both critical success (recruit) and success (outfit) need custom resolution
  // UNLESS success has a gold fallback (no armies available)
  needsCustomResolution(outcome, instance) {
    if (outcome === 'criticalSuccess') {
      return true;
    }
    
    if (outcome === 'success') {
      // Check if this is the gold fallback case (no armies available to outfit)
      // In this case, we don't need a custom dialog - just apply the gold via special effects
      const specialEffects = instance?.appliedOutcome?.specialEffects || [];
      const isGoldFallback = specialEffects.some((e: any) => {
        if (typeof e === 'object' && 'message' in e) {
          return e.message.includes('received 1 Gold instead') || 
                 e.message.includes('No armies available to outfit');
        }
        return false;
      });
      
      // Gold fallback doesn't need custom resolution - just show the badge and apply
      if (isGoldFallback) {
        console.log('🪙 [RequestMilitaryAid] Gold fallback detected - skipping custom dialog');
        return false;
      }
      
      return true;
    }
    
    return false;
  },

  customResolution: {
    // Use wrapper component that handles both outcomes
    component: RequestMilitaryAidResolutionDialog,
    
    getComponentProps(outcome: string) {
      // Pass outcome to wrapper component
      return {
        outcome
      };
    },

    validateData(resolutionData: ResolutionData): boolean {
      console.log('🔍 [RequestMilitaryAid] validateData called with:', resolutionData);
      
      // Check customComponentData (for criticalSuccess army recruitment)
      if (resolutionData.customComponentData) {
        console.log('  ✓ Has customComponentData:', resolutionData.customComponentData);
        
        // For criticalSuccess: need army recruitment data
        if (resolutionData.customComponentData.name && resolutionData.customComponentData.armyType) {
          console.log('  ✅ Valid criticalSuccess data');
          return true;
        }
        
        // For success: need army ID for outfitting (legacy path)
        if (resolutionData.customComponentData.armyId) {
          console.log('  ✅ Valid success data (customComponentData.armyId)');
          return true;
        }
      }
      
      // Check specialEffects (for success outcome via PreparedCommand pattern ONLY)
      // Note: Critical success should NOT pass through this path
      if (resolutionData.specialEffects && resolutionData.specialEffects.length > 0) {
        console.log('  ✓ Has specialEffects:', resolutionData.specialEffects);
        
        // Check for gold fallback case FIRST (no armies available to outfit)
        // When outfitArmy() grants 1 gold instead, it creates a special effect with type: 'resource'
        const hasGoldFallback = resolutionData.specialEffects.some(e => {
          if (typeof e === 'object' && 'message' in e) {
            return e.message.includes('received 1 Gold instead') || 
                   e.message.includes('No armies available to outfit');
          }
          return false;
        });
        
        if (hasGoldFallback) {
          console.log('  ✅ Valid success data (outfitArmy gold fallback)');
          return true;
        }
        
        // PreparedCommand pattern stores a status badge to indicate completion
        // The badge has type: 'status' and a message like "Army X will be outfitted with Y"
        // This is ONLY valid for success outcome (equipment)
        const hasStatusBadge = resolutionData.specialEffects.some(e => 
          typeof e === 'object' && 'type' in e && e.type === 'status'
        );
        
        if (hasStatusBadge) {
          console.log('  ✅ Valid success data (PreparedCommand already executed via status badge)');
          return true;
        }
      }
      
      console.log('  ❌ Validation failed - no valid data found');
      console.log('  Note: Critical success requires customComponentData with name + armyType');
      return false;
    },

    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const { getKingdomActor } = await import('../../stores/KingdomStore');
      const { logger } = await import('../../utils/Logger');
      
      const actor = getKingdomActor();
      if (!actor) {
        return { success: false, error: 'No kingdom actor available' };
      }
      
      const kingdom = actor.getKingdomData();
      if (!kingdom) {
        return { success: false, error: 'No kingdom data available' };
      }
      
      const outcome = instance?.metadata?.outcome;
      const factionId = instance?.metadata?.factionId;
      const factionName = instance?.metadata?.factionName;
      
      // CRITICAL SUCCESS: Recruit allied army
      if (outcome === 'criticalSuccess') {
        logger.info('🎖️ [RequestMilitaryAid] Critical success - checking if army already created');
        
        // For Critical Success: The army is ALWAYS created via PreparedCommand (pending commits)
        // which execute BEFORE this execute() method is called.
        // So by the time we get here, the army should already exist.
        // We just need to return success without doing anything.
        
        // The only reason we'd have customComponentData here is if something went wrong
        // and the commits didn't execute (which shouldn't happen)
        if (resolutionData.customComponentData) {
          logger.warn('⚠️ [RequestMilitaryAid] Unexpected customComponentData present - commits may have failed');
          logger.warn('⚠️ This indicates the PreparedCommand pattern did not work as expected');
        }
        
        logger.info('✅ [RequestMilitaryAid] Allied army was already created via pending commits');
        
        // Mark faction as having provided aid this turn (after successful execution)
        if (factionId) {
          await actor.updateKingdomData((kingdom: any) => {
            if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
              if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
              if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
              if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
            }
            if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
              kingdom.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
              logger.info(`🤝 [RequestMilitaryAid] Marked faction ${factionName || factionId} as aided this turn`);
            }
          });
        }
        
        return { success: true };
      }
      
      // SUCCESS: Outfit existing army (uses OutfitArmyDialog)
      if (outcome === 'success') {
        logger.info('⚔️ [RequestMilitaryAid] Outfitting army from success');
        
        // Check if equipment was already applied via PreparedCommand pattern
        if (resolutionData.specialEffects && resolutionData.specialEffects.length > 0) {
          const hasStatusBadge = resolutionData.specialEffects.some(e => 
            typeof e === 'object' && 'type' in e && e.type === 'status'
          );
          
          const hasResourceBadge = resolutionData.specialEffects.some(e =>
            typeof e === 'object' && 'type' in e && e.type === 'resource'
          );
          
          if (hasStatusBadge || hasResourceBadge) {
            // PreparedCommand already executed via pending commits (either equipment or gold fallback)
            logger.info('✅ [RequestMilitaryAid] Equipment/gold already applied via PreparedCommand');
            
            // Mark faction as having provided aid this turn (after successful execution)
            if (factionId) {
              await actor.updateKingdomData((kingdom: any) => {
                if (!kingdom.turnState?.actionsPhase?.factionsAidedThisTurn) {
                  if (!kingdom.turnState) kingdom.turnState = { actionsPhase: { factionsAidedThisTurn: [] } };
                  if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { factionsAidedThisTurn: [] };
                  if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn) kingdom.turnState.actionsPhase.factionsAidedThisTurn = [];
                }
                if (!kingdom.turnState.actionsPhase.factionsAidedThisTurn.includes(factionId)) {
                  kingdom.turnState.actionsPhase.factionsAidedThisTurn.push(factionId);
                  logger.info(`🤝 [RequestMilitaryAid] Marked faction ${factionName || factionId} as aided this turn`);
                }
              });
            }
            
            return { success: true };
          }
        }
        
        // Otherwise, use OutfitArmyAction logic (legacy path)
        // This shouldn't happen anymore since we use PreparedCommand pattern
        if (!resolutionData.customComponentData?.armyId) {
          logger.error('❌ [RequestMilitaryAid] No armyId in customComponentData and no PreparedCommand badge');
          return { success: false, error: 'No army selected or PreparedCommand not executed' };
        }
        
        const { armyId } = resolutionData.customComponentData;
        
        // Import OutfitArmyAction to reuse its logic
        const { OutfitArmyAction } = await import('../../controllers/actions/implementations');
        
        if (OutfitArmyAction.customResolution) {
          return await OutfitArmyAction.customResolution.execute(resolutionData, instance);
        }
        
        return {
          success: false,
          error: 'OutfitArmyAction not available'
        };
      }
      
      return {
        success: false,
        error: `Unexpected outcome: ${outcome}`
      };
    }
  }
};

export default RequestMilitaryAidAction;
