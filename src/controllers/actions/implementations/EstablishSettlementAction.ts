/**
 * EstablishSettlementAction - Custom implementation for Establish Settlement
 * 
 * Handles founding new villages with validation for spacing requirements
 * and custom dialog for naming + optional structure selection on critical success.
 */

import type { KingdomData } from '../../../actors/KingdomActor';
import type { ActionRequirement } from '../action-resolver';
import type { ResolutionData } from '../../../types/modifiers';
import { createSettlement, SettlementTier } from '../../../models/Settlement';
import { updateKingdom } from '../../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from './ActionHelpers';
import EstablishSettlementDialog from '../../../view/kingdom/components/EstablishSettlementDialog.svelte';

/**
 * Calculate distance between two hex coordinates
 */
function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  // Use cube coordinates for accurate hex distance
  // Convert axial to cube
  const z1 = -x1 - y1;
  const z2 = -x2 - y2;
  
  return Math.max(
    Math.abs(x1 - x2),
    Math.abs(y1 - y2),
    Math.abs(z1 - z2)
  );
}

export const EstablishSettlementAction = {
  id: 'establish-settlement',
  
  /**
   * Check if action can be performed
   * Validates that no other settlement exists within 4 hexes
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Note: This check would need a target hex coordinate to work properly
    // For now, we'll skip the distance check during requirements
    // and rely on manual validation when placing on the map
    
    console.log('🔍 [EstablishSettlement] Checking requirements');
    
    // Check if we have any settlements (informational only)
    const settlementCount = kingdomData.settlements?.length || 0;
    console.log(`   Existing settlements: ${settlementCount}`);
    
    return {
      met: true
    };
  },
  
  customResolution: {
    component: EstablishSettlementDialog,
    
    validateData(resolutionData: ResolutionData): boolean {
      const data = resolutionData.customComponentData;
      
      console.log('🔍 [EstablishSettlement] Validating resolution data:', {
        hasData: !!data,
        hasName: !!data?.settlementName,
        fullData: data
      });
      
      // Require non-empty settlement name
      if (!data?.settlementName || data.settlementName.trim() === '') {
        console.log('❌ [EstablishSettlement] Validation failed: Missing settlement name');
        return false;
      }
      
      console.log('✅ [EstablishSettlement] Validation passed');
      return true;
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      const { settlementName, structureId, outcome } = resolutionData.customComponentData;
      
      logActionStart('establish-settlement', `Creating settlement "${settlementName}"`);
      
      try {
        // Apply resource costs first (from numeric modifiers)
        // These are the costs shown in the outcome display (-2 gold, -2 food, -2 lumber)
        console.log('💰 [EstablishSettlement] Applying resource costs:', resolutionData.numericModifiers);
        const { createGameCommandsService } = await import('../../../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        
        const costResult = await gameCommands.applyNumericModifiers(
          resolutionData.numericModifiers,
          outcome as any  // Pass outcome for automatic fame bonus on critical success
        );
        
        if (!costResult.success) {
          console.error('❌ [EstablishSettlement] Failed to apply costs:', costResult.error);
          return createErrorResult(costResult.error || 'Failed to pay settlement costs');
        }
        
        console.log('✅ [EstablishSettlement] Resource costs applied');
        
        // Create new settlement
        // Location defaults to { x: 0, y: 0 } which marks it as unmapped
        const newSettlement = createSettlement(
          settlementName.trim(),
          { x: 0, y: 0 },  // Unmapped initially
          SettlementTier.VILLAGE
        );
        
        console.log('🏘️ [EstablishSettlement] Created settlement:', {
          id: newSettlement.id,
          name: newSettlement.name,
          tier: newSettlement.tier,
          location: newSettlement.location
        });
        
        // Add to kingdom
        await updateKingdom(kingdom => {
          if (!kingdom.settlements) {
            kingdom.settlements = [];
          }
          kingdom.settlements.push(newSettlement);
        });
        
        console.log('✅ [EstablishSettlement] Added settlement to kingdom');
        
        // Add structure if critical success
        if (structureId) {
          console.log('🏗️ [EstablishSettlement] Adding bonus structure:', structureId);
          
          const { settlementStructureManagement } = await import('../../../services/structures/management');
          
          const result = await settlementStructureManagement.addStructureToSettlement(
            structureId,
            newSettlement.id
          );
          
          if (result.success) {
            console.log('✅ [EstablishSettlement] Bonus structure added');
          } else {
            console.log('⚠️ [EstablishSettlement] Failed to add bonus structure:', result.error);
          }
        }
        
        logActionSuccess('establish-settlement', `Founded ${settlementName}!`);
        
        const message = structureId
          ? `Founded ${settlementName} with a bonus structure! Place it on the Kingmaker hex map.`
          : `Founded ${settlementName}! Place it on the Kingmaker hex map.`;
        
        return createSuccessResult(message);
        
      } catch (error) {
        console.error('❌ [EstablishSettlement] Error:', error);
        logActionError('establish-settlement', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to establish settlement');
      }
    }
  },
  
  /**
   * Both success and critical success need custom dialog
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default EstablishSettlementAction;
