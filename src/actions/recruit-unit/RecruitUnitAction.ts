/**
 * RecruitArmyAction - Custom implementation for Recruit Army
 * 
 * Opens dialogue for army name and settlement selection,
 * creates NPC actor, and places it on the settlement location.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { getKingdomData } from '../../stores/KingdomStore';
import { SettlementTierConfig } from '../../models/Settlement';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

import { logger } from '../../utils/Logger';
import { ARMY_TYPES, type ArmyType } from '../../utils/armyHelpers';

/**
 * Prompt user for army details using Svelte dialog
 */
async function promptForArmyDetails(): Promise<{
  name: string;
  settlementId: string | null;
  armyType: ArmyType;
} | null> {
  const { showDialog } = await import('../../services/DialogService');
  const RecruitArmyDialog = (await import('../../view/kingdom/components/RecruitArmyDialog.svelte')).default;
  
  const result = await showDialog<{
    name: string;
    settlementId: string | null;
    armyType: ArmyType;
  }>({
    component: RecruitArmyDialog,
    props: {}
  });
  
  return result;
}


export const RecruitArmyAction = {
  id: 'recruit-unit',
  
  /**
   * Check if action can be performed
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {

    // Check if we have any settlements (informational only)
    const settlementCount = kingdomData.settlements?.length || 0;

    // Get party level for army level
    const game = (globalThis as any).game;
    let partyLevel = 1;
    if (game?.actors) {
      const partyActors = Array.from(game.actors).filter((a: any) => 
        a.type === 'character' && a.hasPlayerOwner
      );
      if (partyActors.length > 0) {
        partyLevel = (partyActors[0] as any).level || 1;
      }
    }

    return {
      met: true
    };
  },
  
  customResolution: {
    component: null, // Dialog not used - we handle it in execute()
    
    validateData(resolutionData: ResolutionData): boolean {
      // Always valid - we do the work in execute()
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('recruit-unit', 'Starting army recruitment');
      
      const outcome = instance?.metadata?.outcome || 'success';
      
      try {
        // Step 1: Prompt for army details
        const armyDetails = await promptForArmyDetails();
        if (!armyDetails) {
          logActionError('recruit-unit', new Error('Army recruitment cancelled'));
          return createErrorResult('Army recruitment cancelled');
        }
        
        const { name, settlementId, armyType } = armyDetails;

        // Step 2: Get party level for army level
        const game = (globalThis as any).game;
        let armyLevel = 1;
        if (game?.actors) {
          const partyActors = Array.from(game.actors).filter((a: any) => 
            a.type === 'character' && a.hasPlayerOwner
          );
          if (partyActors.length > 0) {
            armyLevel = (partyActors[0] as any).level || 1;
          }
        }

        // Step 3: Apply resource costs (unrest reduction for critical success)

        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        
        const costResult = await gameCommands.applyNumericModifiers(
          resolutionData.numericModifiers,
          outcome as any
        );
        
        if (!costResult.success) {
          logger.error('❌ [RecruitArmy] Failed to apply effects:', costResult.error);
          return createErrorResult(costResult.error || 'Failed to apply army recruitment effects');
        }

        // Step 4: Create army with NPC actor and army type
        const { armyService } = await import('../../services/army');
        const army = await armyService.createArmy(name, armyLevel, {
          type: armyType,
          image: ARMY_TYPES[armyType].image
        });

        // Step 5: Assign to selected settlement (if any)
        if (settlementId && settlementId !== army.supportedBySettlementId) {

          await armyService.assignArmyToSettlement(army.id, settlementId);
        }
        
        // Step 6: Place NPC actor token on settlement location (GM-safe via ActionDispatcher)
        if (army.actorId && army.supportedBySettlementId) {
          const kingdom = getKingdomData();
          const settlement = kingdom.settlements.find(s => s.id === army.supportedBySettlementId);
          
          if (settlement && settlement.location && (settlement.location.x !== 0 || settlement.location.y !== 0)) {

            try {
              // Use shared helper for token placement
              const { placeArmyTokenAtSettlement } = await import('../../utils/armyHelpers');
              await placeArmyTokenAtSettlement(armyService, army.actorId, settlement, name);
            } catch (error) {
              logger.error('⚠️ [RecruitArmy] Failed to place token:', error);
              // Don't fail the whole action if token placement fails
            }
          }
        }
        
        logActionSuccess('recruit-unit', `Recruited ${name}!`);
        
        const settlementMessage = army.supportedBySettlementId 
          ? ` (supported by settlement)` 
          : ' (unsupported)';
        const message = `Recruited ${name} at level ${armyLevel}${settlementMessage}!`;
        
        return createSuccessResult(message);
        
      } catch (error) {
        logger.error('❌ [RecruitArmy] Error:', error);
        logActionError('recruit-unit', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to recruit army');
      }
    }
  },
  
  /**
   * Both success and critical success need custom resolution
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default RecruitArmyAction;
