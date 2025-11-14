/**
 * Establish Diplomatic Relations Action Implementation
 * Handles faction attitude improvements with diplomatic capacity validation
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  createSuccessResult,
  createErrorResult,
  replaceTemplatePlaceholders,
  type ResolveResult 
} from '../shared/ActionHelpers';
import FactionSelectionDialog from './FactionSelectionDialog.svelte';
import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { factionService } from '../../services/factions';
import type { AttitudeLevel } from '../../models/Faction';
import { ATTITUDE_ORDER } from '../../models/Faction';

/**
 * Get next attitude level (improved by one step)
 */
function getNextAttitude(current: AttitudeLevel): AttitudeLevel | null {
  const index = ATTITUDE_ORDER.indexOf(current);
  if (index > 0) {
    return ATTITUDE_ORDER[index - 1];
  }
  return null;
}

/**
 * Get previous attitude level (worsened by one step)
 */
function getPreviousAttitude(current: AttitudeLevel): AttitudeLevel | null {
  const index = ATTITUDE_ORDER.indexOf(current);
  if (index < ATTITUDE_ORDER.length - 1) {
    return ATTITUDE_ORDER[index + 1];
  }
  return null;
}

const EstablishDiplomaticRelationsAction: CustomActionImplementation = {
  id: 'dimplomatic-mission',
  
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
    
    // Check if there are factions that can be improved
    const improvableFactions = factions.filter((f: any) => 
      f.attitude !== 'Helpful' && f.attitude !== 'Hostile'
    );
    
    if (improvableFactions.length === 0) {
      return { met: false, reason: 'No factions can be improved (all are Helpful or Hostile)' };
    }
    
    // Check gold (maximum cost is 4 for success/failure/critical failure)
    const availableGold = kingdom.resources?.gold || 0;
    if (availableGold < 4) {
      return { met: false, reason: 'Insufficient gold (need at least 4 gold)' };
    }
    
    return { met: true };
  },
  
  /**
   * Custom resolution to handle attitude changes
   */
  customResolution: {
    component: null, // No custom UI needed, just execute logic
    
    validateData(resolutionData: ResolutionData): boolean {
      // No validation needed - modifiers are static costs
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('establish-diplomatic-relations', 'Processing diplomatic relations');
      console.log('🎯 [EstablishDiplomaticRelationsAction] execute() called');
      console.log('🎯 [EstablishDiplomaticRelationsAction] instance:', instance);
      console.log('🎯 [EstablishDiplomaticRelationsAction] instance.metadata:', instance?.metadata);
      
      try {
        // Get faction info from instance metadata
        const factionId = instance?.metadata?.factionId;
        const factionName = instance?.metadata?.factionName;
        console.log('🎯 [EstablishDiplomaticRelationsAction] Extracted factionId:', factionId);
        console.log('🎯 [EstablishDiplomaticRelationsAction] Extracted factionName:', factionName);
        
        if (!factionId) {
          console.error('❌ [EstablishDiplomaticRelationsAction] Missing faction ID!');
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
        
        // Get faction
        const faction = factionService.getFaction(factionId);
        if (!faction) {
          return createErrorResult(`Faction not found: ${factionId}`);
        }
        
        // Determine outcome based on resolution data
        const outcome = instance?.metadata?.outcome || 'success';

        // Calculate new attitude BEFORE updating (so we can show it in the message)
        let newAttitude: AttitudeLevel | null = null;
        let specificMessage = '';
        
        switch (outcome) {
          case 'criticalSuccess':
          case 'success':
            // Improve attitude by one step
            newAttitude = getNextAttitude(faction.attitude);
            if (newAttitude) {
              await factionService.updateAttitude(factionId, newAttitude);
              specificMessage = outcome === 'criticalSuccess'
                ? `${factionName}'s attitude improved to ${newAttitude}!`
                : `${factionName}'s attitude improved to ${newAttitude}.`;
              logActionSuccess('establish-diplomatic-relations', 
                `Improved ${factionName} attitude: ${faction.attitude} → ${newAttitude}`);
            } else {
              // Already at maximum (Helpful)
              specificMessage = `${factionName} is already at maximum attitude (Helpful).`;
            }
            break;
            
          case 'criticalFailure':
            // Worsen attitude by one step
            newAttitude = getPreviousAttitude(faction.attitude);
            if (newAttitude) {
              await factionService.updateAttitude(factionId, newAttitude);
              specificMessage = `${factionName}'s attitude worsened to ${newAttitude}.`;
              logActionSuccess('establish-diplomatic-relations', 
                `Worsened ${factionName} attitude: ${faction.attitude} → ${newAttitude}`);
            } else {
              // Already at minimum (Hostile)
              specificMessage = `${factionName} is already at minimum attitude (Hostile).`;
            }
            break;
            
          case 'failure':
            // No attitude change
            specificMessage = `Your diplomatic mission with ${factionName} yielded no results, but relations remain stable.`;
            logActionSuccess('establish-diplomatic-relations', 
              `No attitude change for ${factionName}`);
            break;
        }
        
        // Show custom notification (like Upgrade Settlement)
        const game = (window as any).game;
        if (outcome === 'criticalSuccess') {
          game?.ui?.notifications?.info(`🎉 Critical Success! ${specificMessage}`);
        } else if (newAttitude && outcome !== 'failure') {
          game?.ui?.notifications?.info(`✅ ${specificMessage}`);
        } else if (outcome === 'criticalFailure') {
          game?.ui?.notifications?.warn(`⚠️ ${specificMessage}`);
        } else {
          game?.ui?.notifications?.info(`ℹ️ ${specificMessage}`);
        }
        
        logActionSuccess('establish-diplomatic-relations', specificMessage);
        return createSuccessResult(specificMessage);
        
      } catch (error) {
        logActionError('establish-diplomatic-relations', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Always use custom resolution to handle attitude changes
  needsCustomResolution(outcome): boolean {
    return true;
  }
};

export default EstablishDiplomaticRelationsAction;
