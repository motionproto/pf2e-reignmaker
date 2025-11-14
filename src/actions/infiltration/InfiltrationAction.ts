/**
 * Infiltration Action Implementation
 * Handles espionage operations against factions
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult 
} from '../shared/ActionHelpers';
import { getKingdomActor } from '../../stores/KingdomStore';

const InfiltrationAction: CustomActionImplementation = {
  id: 'infiltration',
  
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
   * Check if action has custom requirements
   */
  checkRequirements(kingdomData: any): { met: boolean; reason?: string } {
    const actor = getKingdomActor();
    if (!actor) return { met: false, reason: 'No kingdom actor available' };
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) return { met: false, reason: 'No kingdom data available' };
    
    // Check if there are any factions
    const factions = kingdom.factions || [];
    if (factions.length === 0) {
      return { met: false, reason: 'No factions available. Create factions first.' };
    }
    
    return { met: true };
  },
  
  /**
   * Custom resolution to handle infiltration outcomes
   */
  customResolution: {
    component: null, // No custom UI needed, just execute logic
    
    validateData(resolutionData: ResolutionData): boolean {
      // No validation needed - outcomes are informational
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('infiltration', 'Processing infiltration mission');
      console.log('🕵️ [InfiltrationAction] execute() called');
      console.log('🕵️ [InfiltrationAction] instance:', instance);
      console.log('🕵️ [InfiltrationAction] instance.metadata:', instance?.metadata);
      
      try {
        // Get faction info from instance metadata
        const factionId = instance?.metadata?.factionId;
        const factionName = instance?.metadata?.factionName;
        console.log('🕵️ [InfiltrationAction] Extracted factionId:', factionId);
        console.log('🕵️ [InfiltrationAction] Extracted factionName:', factionName);
        
        if (!factionId) {
          console.error('❌ [InfiltrationAction] Missing faction ID!');
          return createErrorResult('Missing faction ID');
        }
        
        const actor = getKingdomActor();
        if (!actor) {
          return createErrorResult('No kingdom actor available');
        }
        
        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return createErrorResult('No kingdom data available');
        }
        
        // Get outcome from instance
        const outcome = instance?.appliedOutcome?.outcome || 'success';
        console.log('🕵️ [InfiltrationAction] Outcome:', outcome);
        
        // NOTE: Standard modifiers (gold, unrest) are already applied by the action resolution system
        // before custom resolution executes. We only need to add faction-specific messages here.
        
        let specificMessage = '';
        const game = (window as any).game;
        
        switch (outcome) {
          case 'criticalSuccess':
            specificMessage = `Your spies gathered extensive intelligence on ${factionName}. Valuable secrets have been uncovered!`;
            game?.ui?.notifications?.info(`🎉 Critical Success! ${specificMessage}`);
            logActionSuccess('infiltration', `Critical success against ${factionName}`);
            break;
            
          case 'success':
            specificMessage = `Your agents successfully gathered intelligence on ${factionName}.`;
            game?.ui?.notifications?.info(`✅ ${specificMessage}`);
            logActionSuccess('infiltration', `Success against ${factionName}`);
            break;
            
          case 'failure':
            specificMessage = `Your infiltration attempt against ${factionName} yielded no useful information.`;
            game?.ui?.notifications?.info(`ℹ️ ${specificMessage}`);
            logActionSuccess('infiltration', `Failed infiltration of ${factionName}`);
            break;
            
          case 'criticalFailure':
            specificMessage = `Your spies were captured by ${factionName}! This may have diplomatic consequences.`;
            game?.ui?.notifications?.warn(`⚠️ Critical Failure! ${specificMessage}`);
            logActionSuccess('infiltration', `Critical failure - spies captured by ${factionName}`);
            break;
        }
        
        logActionSuccess('infiltration', specificMessage);
        return createSuccessResult(specificMessage);
        
      } catch (error) {
        logActionError('infiltration', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Always use custom resolution to handle faction-specific messages
  needsCustomResolution(outcome): boolean {
    return true;
  }
};

export default InfiltrationAction;
