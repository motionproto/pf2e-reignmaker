/**
 * Send Scouts Action Implementation
 * Reveals unexplored hexes on the map
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { KingdomData } from '../../actors/KingdomActor';

const SendScoutsAction: CustomActionImplementation = {
  id: 'send-scouts',
  
  /**
   * Check if action requirements are met
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check gold cost only
    // Note: We don't track hex exploration state in our data, so no validation needed
    const goldCost = 1;
    if ((kingdomData.resources?.gold || 0) < goldCost) {
      return {
        met: false,
        reason: 'Insufficient gold',
        requiredResources: new Map([['gold', goldCost]]),
        missingResources: new Map([['gold', goldCost - (kingdomData.resources?.gold || 0)]])
      };
    }
    
    return { met: true };
  }
};

export default SendScoutsAction;
