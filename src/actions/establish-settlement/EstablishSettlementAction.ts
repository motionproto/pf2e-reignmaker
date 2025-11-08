/**
 * EstablishSettlementAction - Custom implementation for Establish Settlement
 * 
 * Handles founding new villages with validation for spacing requirements.
 * Uses hex selector for placement, then prompts for name + optional structure.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { createSettlement, SettlementTier } from '../../models/Settlement';
import { updateKingdom, getKingdomData } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';
import { hexSelectorService } from '../../services/hex-selector';
import { getAdjacentHexIds } from '../shared/hexValidation';
import { kingmakerIdToOffset } from '../../services/hex-selector/coordinates';
import { logger } from '../../utils/Logger';


export const EstablishSettlementAction = {
  id: 'establish-settlement',
  
  /**
   * Check if action can be performed
   * Validates resource requirements
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    const requirements: string[] = [];
    
    // Check resource requirements
    const resources = kingdomData.resources || {};
    const gold = resources.gold || 0;
    const food = resources.food || 0;
    const lumber = resources.lumber || 0;
    
    if (gold < 2) {
      requirements.push(`Need 2 Gold (have ${gold})`);
    }
    if (food < 2) {
      requirements.push(`Need 2 Food (have ${food})`);
    }
    if (lumber < 2) {
      requirements.push(`Need 2 Lumber (have ${lumber})`);
    }
    
    return {
      met: requirements.length === 0,
      reason: requirements.length > 0 ? requirements.join(', ') : undefined
    };
  },
  
  customResolution: {
    component: null, // Dialog not used - hex selector handles UI
    
    validateData(resolutionData: ResolutionData): boolean {
      // Always valid - we do the work in execute()
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('establish-settlement', 'Starting settlement placement');
      
      const outcome = instance?.metadata?.outcome || 'success';
      
      try {
        // Import validator
        const { validateSettlementPlacement } = await import('./settlementValidator');
        
        // Get kingdom data to check if this is first settlement
        const kingdom = getKingdomData();
        const existingSettlements = (kingdom.settlements || [])
          .filter((s: any) => s.kingmakerLocation && s.kingmakerLocation.x > 0 && s.kingmakerLocation.y > 0);
        const isFirstSettlement = existingSettlements.length === 0;
        
        // Step 1: Select hex on map
        const selectedHexes = await hexSelectorService.selectHexes({
          title: 'Select Hex for New Settlement',
          count: 1,
          colorType: 'settlement',
          validationFn: validateSettlementPlacement
        });
        
        // Handle cancellation
        if (!selectedHexes || selectedHexes.length === 0) {
          logActionError('establish-settlement', new Error('Settlement placement cancelled'));
          return createErrorResult('Settlement placement cancelled');
        }
        
        const selectedHexId = selectedHexes[0];

        // Step 2: Prompt for settlement name using our dialog store
        const { settlementNameDialog } = await import('../../stores/SettlementNameDialogStore');
        const settlementName = await settlementNameDialog.prompt(selectedHexId);
        if (!settlementName) {
          return createErrorResult('Settlement creation cancelled');
        }
        
        // Step 3: If critical success, let user choose a free structure
        let selectedStructureId: string | null = null;
        if (outcome === 'criticalSuccess') {
          const { structureSelectionDialog } = await import('../../stores/StructureSelectionDialogStore');
          selectedStructureId = await structureSelectionDialog.prompt();
        }
        
        // Step 4: Apply resource costs

        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        
        const costResult = await gameCommands.applyNumericModifiers(
          resolutionData.numericModifiers,
          outcome as any
        );
        
        if (!costResult.success) {
          logger.error('❌ [EstablishSettlement] Failed to apply costs:', costResult.error);
          return createErrorResult(costResult.error || 'Failed to pay settlement costs');
        }

        // Step 5: Convert hex ID to coordinates
        const offset = kingmakerIdToOffset(selectedHexId);
        const location = { x: offset.i, y: offset.j };
        
        // Step 6: Create settlement with actual map location
        const newSettlement = createSettlement(
          settlementName.trim(),
          location,
          SettlementTier.VILLAGE
        );

        // Step 7: Add to kingdom and handle first settlement special case
        await updateKingdom(kingdom => {
          if (!kingdom.settlements) {
            kingdom.settlements = [];
          }
          kingdom.settlements.push(newSettlement);
          
          // Set hasRoad flag for settlement hex (settlements count as roads)
          const hex = kingdom.hexes.find((h: any) => h.id === selectedHexId);
          if (hex) {
            hex.hasRoad = true;
            
            // Add hex feature entry for map rendering
            if (!hex.features) {
              hex.features = [];
            }
            hex.features.push({
              type: 'settlement',
              name: newSettlement.name,
              tier: newSettlement.tier,
              linked: true,              // Linked to Settlement object
              settlementId: newSettlement.id  // Link back to Settlement
            });
          }
          
          // First settlement: Automatically claim all adjacent hexes
          if (isFirstSettlement) {
            const adjacentHexIds = getAdjacentHexIds(selectedHexId);
            
            adjacentHexIds.forEach(hexId => {
              const hex = kingdom.hexes.find((h: any) => h.id === hexId);
              if (hex && hex.claimedBy !== PLAYER_KINGDOM) {
                hex.claimedBy = PLAYER_KINGDOM;  // Use the constant, not hardcoded value
              }
            });
            
            // Update kingdom size
            kingdom.size = kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length;
          }
        });

        // Step 8: Add structure if critical success
        if (selectedStructureId) {

          const { settlementStructureManagement } = await import('../../services/structures/management');
          
          const result = await settlementStructureManagement.addStructureToSettlement(
            selectedStructureId,
            newSettlement.id
          );
          
          if (result.success) {

          } else {

          }
        }
        
        // Ensure PIXI container is visible
        const { ReignMakerMapLayer } = await import('../../services/map/core/ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        mapLayer.showPixiContainer();

        // Reactive overlays will auto-update from Kingdom Store changes

        logActionSuccess('establish-settlement', `Founded ${settlementName}!`);
        
        const adjacentClaimMessage = isFirstSettlement ? ' (claimed adjacent hexes)' : '';
        const structureMessage = selectedStructureId ? ' with a bonus structure' : '';
        const message = `Founded ${settlementName}${structureMessage}!${adjacentClaimMessage}`;
        
        return createSuccessResult(message);
        
      } catch (error) {
        logger.error('❌ [EstablishSettlement] Error:', error);
        logActionError('establish-settlement', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to establish settlement');
      }
    }
  },
  
  /**
   * Both success and critical success need custom resolution
   * Note: This doesn't prevent the roll dialog - the action has skills so it will still show the roll dialog first
   * This just tells the system to call our execute() method after a successful roll
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default EstablishSettlementAction;
