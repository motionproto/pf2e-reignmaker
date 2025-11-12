/**
 * Request Military Aid - Custom Implementation
 * 
 * Critical Success: Shows army recruitment dialog, then creates allied army (exempt from upkeep)
 * Success: Handled by standard gameCommands (outfitArmy)
 * Critical Failure: Handled by standard gameCommands (adjustFactionAttitude)
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { KingdomData } from '../../actors/KingdomActor';
import type { ResolutionData } from '../../types/modifiers';
import type { ResolveResult } from '../shared/ActionHelpers';
import RequestMilitaryAidResolutionDialog from './RequestMilitaryAidResolutionDialog.svelte';

const RequestMilitaryAidAction: CustomActionImplementation = {
  id: 'request-military-aid',

  // Both critical success (recruit) and success (outfit) need custom resolution
  needsCustomResolution(outcome) {
    return outcome === 'criticalSuccess' || outcome === 'success';
  },

  customResolution: {
    // Use wrapper component that handles both outcomes
    component: RequestMilitaryAidResolutionDialog,
    
    getComponentProps(outcome: string) {
      // Pass outcome to wrapper component
      return {
        outcome
      };
    },

    validateData(resolutionData: ResolutionData): boolean {
      console.log('🔍 [RequestMilitaryAid] validateData called with:', resolutionData);
      
      // Check customComponentData (for criticalSuccess army recruitment)
      if (resolutionData.customComponentData) {
        console.log('  ✓ Has customComponentData:', resolutionData.customComponentData);
        
        // For criticalSuccess: need army recruitment data
        if (resolutionData.customComponentData.name && resolutionData.customComponentData.armyType) {
          console.log('  ✅ Valid criticalSuccess data');
          return true;
        }
        
        // For success: need army ID for outfitting (legacy path)
        if (resolutionData.customComponentData.armyId) {
          console.log('  ✅ Valid success data (customComponentData.armyId)');
          return true;
        }
      }
      
      // Check specialEffects (for success outcome via PreparedCommand pattern ONLY)
      // Note: Critical success should NOT pass through this path
      if (resolutionData.specialEffects && resolutionData.specialEffects.length > 0) {
        console.log('  ✓ Has specialEffects:', resolutionData.specialEffects);
        
        // PreparedCommand pattern stores a status badge to indicate completion
        // The badge has type: 'status' and a message like "Army X will be outfitted with Y"
        // This is ONLY valid for success outcome (equipment)
        const hasStatusBadge = resolutionData.specialEffects.some(e => 
          typeof e === 'object' && 'type' in e && e.type === 'status'
        );
        
        if (hasStatusBadge) {
          console.log('  ✅ Valid success data (PreparedCommand already executed via status badge)');
          return true;
        } else {
          console.log('  ❌ No valid status badge found in specialEffects');
          console.log('  First effect structure:', resolutionData.specialEffects[0]);
        }
      }
      
      console.log('  ❌ Validation failed - no valid data found');
      console.log('  Note: Critical success requires customComponentData with name + armyType');
      return false;
    },

    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const { getKingdomActor } = await import('../../stores/KingdomStore');
      const { logger } = await import('../../utils/Logger');
      
      const actor = getKingdomActor();
      if (!actor) {
        return { success: false, error: 'No kingdom actor available' };
      }
      
      const kingdom = actor.getKingdomData();
      if (!kingdom) {
        return { success: false, error: 'No kingdom data available' };
      }
      
      const outcome = instance?.metadata?.outcome;
      
      // CRITICAL SUCCESS: Recruit allied army
      if (outcome === 'criticalSuccess') {
        logger.info('🎖️ [RequestMilitaryAid] Creating allied army from critical success');
        
        const { name, armyType, settlementId } = resolutionData.customComponentData!;
        
        // Set pending data for recruitArmy
        (globalThis as any).__pendingRecruitArmy = {
          name,
          armyType,
          settlementId
        };
        
        // Create allied army using prepare/commit pattern
        const resolver = await createGameCommandsResolver();
        const partyLevel = kingdom.partyLevel || 1;
        
        try {
          // Recruit with exemptFromUpkeep = true for allied army
          const prepared = await resolver.recruitArmy(partyLevel, name, true);
          
          // Execute commit immediately
          await prepared.commit();
          
          logger.info(`✅ [RequestMilitaryAid] Successfully created allied army: ${name}`);
          
          // Clean up global state
          delete (globalThis as any).__pendingRecruitArmy;
          
          return { success: true };
          
        } catch (error) {
          logger.error('❌ [RequestMilitaryAid] Failed to create allied army:', error);
          delete (globalThis as any).__pendingRecruitArmy;
          
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create allied army'
          };
        }
      }
      
      // SUCCESS: Outfit existing army (uses OutfitArmyDialog)
      if (outcome === 'success') {
        logger.info('⚔️ [RequestMilitaryAid] Outfitting army from success');
        
        // Check if equipment was already applied via PreparedCommand pattern
        if (resolutionData.specialEffects && resolutionData.specialEffects.length > 0) {
          const hasStatusBadge = resolutionData.specialEffects.some(e => 
            typeof e === 'object' && 'type' in e && e.type === 'status'
          );
          
          if (hasStatusBadge) {
            // PreparedCommand already executed via pending commits
            logger.info('✅ [RequestMilitaryAid] Equipment already applied via PreparedCommand (status badge present)');
            return { success: true };
          }
        }
        
        // Otherwise, use OutfitArmyAction logic (legacy path)
        const { armyId } = resolutionData.customComponentData!;
        
        // Import OutfitArmyAction to reuse its logic
        const { OutfitArmyAction } = await import('../../controllers/actions/implementations');
        
        if (OutfitArmyAction.customResolution) {
          return await OutfitArmyAction.customResolution.execute(resolutionData, instance);
        }
        
        return {
          success: false,
          error: 'OutfitArmyAction not available'
        };
      }
      
      return {
        success: false,
        error: `Unexpected outcome: ${outcome}`
      };
    }
  }
};

export default RequestMilitaryAidAction;
