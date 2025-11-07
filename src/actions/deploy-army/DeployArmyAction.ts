/**
 * Deploy Army Action Implementation
 * 
 * Checks if there are any armies available that haven't been deployed this turn.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { CustomActionImplementation } from '../../controllers/actions/implementations';

const DeployArmyAction: CustomActionImplementation = {
  id: 'deploy-army',
  
  /**
   * Check if there are any armies that haven't been deployed yet this turn
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check if there are any armies at all
    if (!kingdomData.armies || kingdomData.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    
    // Get deployed army IDs from turnState
    const deployedArmyIds = kingdomData.turnState?.actionsPhase?.deployedArmyIds || [];
    
    // Check if all armies have been deployed
    if (deployedArmyIds.length >= kingdomData.armies.length) {
      return {
        met: false,
        reason: 'All armies have already moved this turn'
      };
    }
    
    // At least one army hasn't been deployed yet
    return { met: true };
  }
};

export default DeployArmyAction;
