/**
 * Request Economic Aid - Custom Implementation
 * 
 * Requirements:
 * 1. Diplomatic relations at least friendly
 * 2. At least one eligible faction that hasn't provided aid this turn
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import type { ResolveResult } from '../shared/ActionHelpers';
import { checkFactionAvailabilityRequirement } from '../../controllers/actions/shared-requirements';

const RequestEconomicAidAction: CustomActionImplementation = {
  id: 'request-economic-aid',

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
   */
  checkRequirements(kingdomData: any): { met: boolean; reason?: string } {
    return checkFactionAvailabilityRequirement();
  },
  
  // Request Economic Aid uses standard action flow, but needs to mark faction after success
  needsCustomResolution(outcome) {
    // Only success needs custom resolution to mark faction as aided
    return outcome === 'success';
  },
  
  customResolution: {
    component: null, // No custom dialog needed, just marking faction
    
    validateData(resolutionData: ResolutionData): boolean {
      // Always valid - we just need to mark the faction
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      const { getKingdomActor } = await import('../../stores/KingdomStore');
      const { logger } = await import('../../utils/Logger');
      
      const actor = getKingdomActor();
      if (!actor) {
        return { success: false, error: 'No kingdom actor available' };
      }
      
      const factionId = instance?.metadata?.factionId;
      const factionName = instance?.metadata?.factionName;
      
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
            logger.info(`🤝 [RequestEconomicAid] Marked faction ${factionName || factionId} as aided this turn`);
          }
        });
      }
      
      return { success: true };
    }
  }
};

export default RequestEconomicAidAction;
