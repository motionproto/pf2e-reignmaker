/**
 * RecruitArmyAction - Pre-dialog handler for Recruit Army
 * 
 * The dialog is shown via action-handlers-config (pre-roll pattern).
 * No custom resolution needed - the gameCommands in recruit-unit.json
 * handle the actual army creation via GameCommandsResolver.recruitArmy()
 * using the data stored in globalThis.__pendingRecruitArmy.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';

export const RecruitArmyAction = {
  id: 'recruit-unit',
  
  /**
   * Pre-roll dialog configuration
   */
  preRollDialog: {
    dialogId: 'recruit-army',
    extractMetadata: (dialogResult: any) => ({
      name: dialogResult.name,
      settlementId: dialogResult.settlementId,
      armyType: dialogResult.armyType
    })
  },
  
  /**
   * Check if action can be performed (informational only)
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    return {
      met: true
    };
  }
  
  // NO custom resolution - let ActionResolver.executeAction() run gameCommands
};

export default RecruitArmyAction;
