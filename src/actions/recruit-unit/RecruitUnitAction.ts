/**
 * RecruitArmyAction - Pre-dialog handler for Recruit Army
 * 
 * The dialog is shown via action-handlers-config (pre-roll pattern).
 * This action implementation just validates and returns success.
 * The actual army creation is done by GameCommandsResolver.recruitArmy()
 * using the data stored in globalThis.__pendingRecruitArmy.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import {
  logActionStart,
  logActionSuccess,
  createSuccessResult,
  type ResolveResult
} from '../shared/ActionHelpers';

import { logger } from '../../utils/Logger';


export const RecruitArmyAction = {
  id: 'recruit-unit',
  
  /**
   * Check if action can be performed (informational only)
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    return {
      met: true
    };
  },
  
  customResolution: {
    component: null, // Dialog shown via action-handlers-config
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('recruit-unit', 'Recruiting army...');
      
      // The actual army creation is handled by the recruitArmy game command
      // which reads from globalThis.__pendingRecruitArmy (set by dialog)
      // Just return success - the game command will do the work
      
      logActionSuccess('recruit-unit', 'Army recruited successfully');
      return createSuccessResult('Army recruited successfully');
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
