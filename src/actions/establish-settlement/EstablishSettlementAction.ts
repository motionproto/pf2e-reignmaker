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
        console.log(`🗺️ [EstablishSettlement] Selected hex: ${selectedHexId}`);
        
        // Step 2: Prompt for settlement name using Foundry Dialog
        const settlementName = await promptForSettlementName();
        if (!settlementName) {
          return createErrorResult('Settlement creation cancelled');
        }
        
        // Step 3: If critical success, let user choose a free structure
        let selectedStructureId: string | null = null;
        if (outcome === 'criticalSuccess') {
          selectedStructureId = await promptForStructureSelection();
        }
        
        // Step 4: Apply resource costs
        console.log('💰 [EstablishSettlement] Applying resource costs:', resolutionData.numericModifiers);
        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        
        const costResult = await gameCommands.applyNumericModifiers(
          resolutionData.numericModifiers,
          outcome as any
        );
        
        if (!costResult.success) {
          console.error('❌ [EstablishSettlement] Failed to apply costs:', costResult.error);
          return createErrorResult(costResult.error || 'Failed to pay settlement costs');
        }
        
        console.log('✅ [EstablishSettlement] Resource costs applied');
        
        // Step 5: Convert hex ID to coordinates
        const offset = kingmakerIdToOffset(selectedHexId);
        const location = { x: offset.i, y: offset.j };
        
        // Step 6: Create settlement with actual map location
        const newSettlement = createSettlement(
          settlementName.trim(),
          location,
          SettlementTier.VILLAGE
        );
        
        console.log('🏘️ [EstablishSettlement] Created settlement:', {
          id: newSettlement.id,
          name: newSettlement.name,
          tier: newSettlement.tier,
          location: newSettlement.location,
          hexId: selectedHexId
        });
        
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
            console.log(`🛣️ [EstablishSettlement] Set hasRoad=true for settlement hex ${selectedHexId}`);
          }
          
          // First settlement: Automatically claim all adjacent hexes
          if (isFirstSettlement) {
            console.log('🏴 [EstablishSettlement] First settlement - claiming adjacent hexes');
            const adjacentHexIds = getAdjacentHexIds(selectedHexId);
            
            adjacentHexIds.forEach(hexId => {
              const hex = kingdom.hexes.find((h: any) => h.id === hexId);
              if (hex && hex.claimedBy !== PLAYER_KINGDOM) {
                hex.claimedBy = 1;
                console.log(`  🏴 Claimed adjacent hex: ${hexId}`);
              }
            });
            
            // Update kingdom size
            kingdom.size = kingdom.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length;
            console.log(`  ✅ Total claimed hexes: ${kingdom.size}`);
          }
        });
        
        console.log('✅ [EstablishSettlement] Added settlement to kingdom');
        
        // Step 8: Add structure if critical success
        if (selectedStructureId) {
          console.log('🏗️ [EstablishSettlement] Adding bonus structure:', selectedStructureId);
          
          const { settlementStructureManagement } = await import('../../services/structures/management');
          
          const result = await settlementStructureManagement.addStructureToSettlement(
            selectedStructureId,
            newSettlement.id
          );
          
          if (result.success) {
            console.log('✅ [EstablishSettlement] Bonus structure added');
          } else {
            console.log('⚠️ [EstablishSettlement] Failed to add bonus structure:', result.error);
          }
        }
        
        // Ensure PIXI container is visible
        const { ReignMakerMapLayer } = await import('../../services/map/ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        mapLayer.showPixiContainer();
        console.log('[EstablishSettlement] ✅ Scene control activated');
        
        // Reactive overlays will auto-update from Kingdom Store changes
        console.log('[EstablishSettlement] 🔄 Reactive overlays will auto-update from Kingdom Store change');
        
        logActionSuccess('establish-settlement', `Founded ${settlementName}!`);
        
        const adjacentClaimMessage = isFirstSettlement ? ' (claimed adjacent hexes)' : '';
        const structureMessage = selectedStructureId ? ' with a bonus structure' : '';
        const message = `Founded ${settlementName}${structureMessage}!${adjacentClaimMessage}`;
        
        return createSuccessResult(message);
        
      } catch (error) {
        console.error('❌ [EstablishSettlement] Error:', error);
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

/**
 * Prompt user for settlement name using Foundry Dialog
 */
async function promptForSettlementName(): Promise<string | null> {
  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    
    new Dialog({
      title: 'Name Your New Village',
      content: `
        <div style="margin-bottom: 1rem;">
          <label for="settlement-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Settlement Name:
          </label>
          <input 
            type="text" 
            id="settlement-name" 
            name="settlement-name" 
            placeholder="Enter settlement name..." 
            style="width: 100%; padding: 0.5rem;"
            autofocus
          />
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Create Settlement',
          callback: (html: any) => {
            const input = html.find('#settlement-name')[0] as HTMLInputElement;
            const name = input?.value?.trim() || '';
            if (name) {
              resolve(name);
            } else {
              const ui = (globalThis as any).ui;
              ui?.notifications?.warn('Settlement name is required');
              resolve(null);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'ok',
      close: () => resolve(null)
    }).render(true);
  });
}

/**
 * Prompt user to select a free tier 1 structure (critical success bonus)
 */
async function promptForStructureSelection(): Promise<string | null> {
  return new Promise(async (resolve) => {
    const { structuresService } = await import('../../services/structures');
    structuresService.initializeStructures();
    const allStructures = structuresService.getAllStructures();
    const tier1Structures = allStructures.filter(s => s.tier === 1);
    
    const Dialog = (globalThis as any).Dialog;
    
    const structureOptions = tier1Structures
      .map(s => {
        const skillInfo = s.type === 'skill' && s.effects.skillsSupported
          ? ` (${s.effects.skillsSupported.map((sk: string) => sk.charAt(0).toUpperCase() + sk.slice(1)).join(', ')})`
          : '';
        return `<option value="${s.id}">${s.name}${skillInfo}</option>`;
      })
      .join('\n');
    
    new Dialog({
      title: 'Critical Success! Choose a Free Structure',
      content: `
        <div style="margin-bottom: 1rem;">
          <p style="margin-bottom: 1rem; color: #4CAF50; font-weight: bold;">
            <i class="fas fa-star"></i> Critical Success Bonus: Choose a free Tier 1 structure!
          </p>
          <label for="structure-select" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Select Structure:
          </label>
          <select 
            id="structure-select" 
            name="structure-select" 
            style="width: 100%; padding: 0.5rem;"
          >
            <option value="">No structure (start with empty village)</option>
            ${structureOptions}
          </select>
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Continue',
          callback: (html: any) => {
            const select = html.find('#structure-select')[0] as HTMLSelectElement;
            const structureId = select?.value || null;
            resolve(structureId);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Skip',
          callback: () => resolve(null)
        }
      },
      default: 'ok',
      close: () => resolve(null)
    }).render(true);
  });
}

export default EstablishSettlementAction;
