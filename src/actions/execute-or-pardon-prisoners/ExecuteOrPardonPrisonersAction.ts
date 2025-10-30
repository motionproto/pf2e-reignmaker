/**
 * ExecuteOrPardonPrisonersAction - Custom action implementation for Execute or Pardon Prisoners
 * 
 * This action allows players to deal with imprisoned unrest through either
 * execution (harsh justice) or pardon (mercy), requiring settlements with
 * justice structures that have imprisoned unrest.
 * 
 * Note: Settlement selection happens PRE-ROLL via dialog, not post-roll via custom resolution.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import { structuresService } from '../../services/structures';

export const ExecuteOrPardonPrisonersAction = {
  id: 'execute-or-pardon-prisoners',
  
  /**
   * Check if action can be performed
   * Requirements:
   * - At least one settlement with imprisoned unrest > 0
   * - Settlement must have justice structure (imprisonment capacity > 0)
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Check if any settlements have imprisoned unrest
    const settlementsWithPrisoners = kingdomData.settlements.filter(settlement => {
      const imprisonedUnrest = settlement.imprisonedUnrest || 0;
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      
      // Must have prisoners AND have justice structure (capacity > 0)
      return imprisonedUnrest > 0 && capacity > 0;
    });
    
    if (settlementsWithPrisoners.length === 0) {
      // Check if there are justice structures but no prisoners
      const hasJusticeStructures = kingdomData.settlements.some(settlement => {
        return structuresService.calculateImprisonedUnrestCapacity(settlement) > 0;
      });
      
      if (!hasJusticeStructures) {
        return {
          met: false,
          reason: 'No justice structures found'
        };
      }
      
      return {
        met: false,
        reason: 'No imprisoned unrest to pardon or execute'
      };
    }
    
    return { met: true };
  }
};

/**
 * Export for index registry
 */
export default ExecuteOrPardonPrisonersAction;
