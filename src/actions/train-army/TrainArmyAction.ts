/**
 * Train Army Action - Custom Implementation
 * 
 * Validates that at least one army is below party level before allowing the action
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { CustomActionImplementation } from '../../controllers/actions/implementations';

const TrainArmyAction: CustomActionImplementation = {
  id: 'train-army',
  
  /**
   * Check if there are any armies below party level
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check if there are any armies at all
    if (!kingdomData.armies || kingdomData.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    
    // Get party level from kingdom data (synced by partyLevelHooks)
    const partyLevel = kingdomData.partyLevel || 1;
    
    // Check if any army is below party level
    const armiesBelowLevel = kingdomData.armies.filter(army => army.level < partyLevel);
    
    if (armiesBelowLevel.length === 0) {
      return {
        met: false,
        reason: `All armies are already at party level (${partyLevel})`
      };
    }
    
    return { met: true };
  }
};

export default TrainArmyAction;
