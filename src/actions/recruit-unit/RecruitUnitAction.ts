/**
 * RecruitArmyAction - Custom implementation for Recruit Army
 * 
 * Opens dialogue for army name and settlement selection,
 * creates NPC actor, and places it on the settlement location.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { getKingdomData } from '../../stores/KingdomStore';
import { SettlementTierConfig } from '../../models/Settlement';
import { isHexClaimedByPlayer } from '../shared/hexValidation';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

// Import army token images for army creation
import cavalryImg from '../../../img/army_tokens/army-calvary.webp';
import engineersImg from '../../../img/army_tokens/army-engineers.webp';
import infantryImg from '../../../img/army_tokens/army-infantry.webp';
import koboldImg from '../../../img/army_tokens/army-kobold.webp';
import wolvesImg from '../../../img/army_tokens/army-wolves.webp';
import { logger } from '../../utils/Logger';

// Army type definitions
const ARMY_TYPES = {
  cavalry: { name: 'Cavalry', image: cavalryImg },
  engineers: { name: 'Engineers', image: engineersImg },
  infantry: { name: 'Infantry', image: infantryImg },
  kobold: { name: 'Kobold', image: koboldImg },
  wolves: { name: 'Wolves', image: wolvesImg }
} as const;

type ArmyType = keyof typeof ARMY_TYPES;

/**
 * Prompt user for army details using Svelte dialog
 */
async function promptForArmyDetails(): Promise<{
  name: string;
  settlementId: string | null;
  armyType: ArmyType;
} | null> {
  const { showDialog } = await import('../../services/DialogService');
  const RecruitArmyDialog = (await import('../../view/kingdom/components/RecruitArmyDialog.svelte')).default;
  
  const result = await showDialog<{
    name: string;
    settlementId: string | null;
    armyType: ArmyType;
  }>({
    component: RecruitArmyDialog,
    props: {}
  });
  
  return result;
}

/**
 * Legacy Foundry Dialog implementation (kept for reference)
 * TODO: Remove after Svelte dialog is tested
 */
async function promptForArmyDetails_OLD(): Promise<{
  name: string;
  settlementId: string | null;
  armyType: ArmyType;
} | null> {
  return new Promise((resolve) => {
    const kingdom = getKingdomData();
    const Dialog = (globalThis as any).Dialog;
    
    // Get settlements with available army capacity in claimed hexes only
    const availableSettlements = kingdom.settlements.filter(s => {
      // Must have a valid map location
      const hasLocation = s.location.x !== 0 || s.location.y !== 0;
      if (!hasLocation) return false;
      
      // Check if the settlement's hex is claimed by the kingdom
      const hexId = s.kingmakerLocation 
        ? `${s.kingmakerLocation.x}.${String(s.kingmakerLocation.y).padStart(2, '0')}`
        : `${s.location.x}.${String(s.location.y).padStart(2, '0')}`;
      
      if (!isHexClaimedByPlayer(hexId, kingdom)) return false;
      
      // Get settlement tier config for army support
      const capacity = SettlementTierConfig[s.tier]?.armySupport || 0;
      const current = s.supportedUnits?.length || 0;
      return current < capacity;
    });
    
    // Generate default army name
    const armyNumber = (kingdom.armies?.length || 0) + 1;
    const defaultName = `Army ${armyNumber}`;
    
    // Build settlement options HTML
    const settlementOptions = availableSettlements
      .map(s => {
        const capacity = SettlementTierConfig[s.tier]?.armySupport || 0;
        const current = s.supportedUnits?.length || 0;
        return `<option value="${s.id}">${s.name} (${s.tier} - ${current}/${capacity})</option>`;
      })
      .join('\n');
    
    const hasAvailableSettlements = availableSettlements.length > 0;
    
    // Build army type options HTML with images
    const armyTypeOptions = Object.entries(ARMY_TYPES)
      .map(([type, config]) => `
        <label class="army-type-option">
          <input type="radio" name="army-type" value="${type}" ${type === 'infantry' ? 'checked' : ''} />
          <div class="army-type-card">
            <img src="${config.image}" alt="${config.name}" />
            <span>${config.name}</span>
          </div>
        </label>
      `)
      .join('');
    
    new Dialog({
      title: 'Recruit Army Unit',
      content: `
        <style>
          .army-type-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .army-type-option {
            cursor: pointer;
          }
          .army-type-option input[type="radio"] {
            display: none;
          }
          .army-type-card {
            padding: 0.5rem;
            border: 2px solid #7a7971;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
          }
          .army-type-card:hover {
            border-color: #999;
          }
          .army-type-option input[type="radio"]:checked + .army-type-card {
            border-color: #f00;
            background: rgba(255, 0, 0, 0.1);
          }
          .army-type-card img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
        </style>
        <div>
          <div style="margin-bottom: 1rem;">
            <label for="army-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Army Name:</label>
            <input type="text" id="army-name" name="army-name" value="${defaultName}" placeholder="Enter army name..." style="width: 100%; padding: 0.5rem;" autofocus />
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Army Type:</label>
            <div class="army-type-grid">
              ${armyTypeOptions}
            </div>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label for="settlement-select" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Supported By Settlement:</label>
            ${hasAvailableSettlements ? `
              <select id="settlement-select" name="settlement-select" style="width: 100%; padding: 0.5rem;">
                <option value="">Unsupported (No Settlement)</option>
                ${settlementOptions}
              </select>
              <small style="display: block; margin-top: 0.5rem; font-size: 0.85rem; font-style: italic;">Armies must be supported by settlements or they will cause unrest.</small>
            ` : `
              <div style="padding: 0.75rem; background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3);">
                <div><i class="fas fa-exclamation-triangle" style="color: orange;"></i> <strong style="color: orange;">Warning:</strong> No claimed settlements have available army support capacity.</div>
                <small>This army will be unsupported and may cause unrest.</small>
              </div>
            `}
          </div>
        </div>
      `,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        },
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Recruit Army',
          callback: (html: any) => {
            const nameInput = html.find('#army-name')[0] as HTMLInputElement;
            const settlementSelect = html.find('#settlement-select')[0] as HTMLSelectElement;
            const armyTypeInput = html.find('input[name="army-type"]:checked')[0] as HTMLInputElement;
            
            const name = nameInput?.value?.trim() || '';
            if (!name) {
              const ui = (globalThis as any).ui;
              ui?.notifications?.warn('Army name is required');
              resolve(null);
              return;
            }
            
            const settlementId = settlementSelect?.value || null;
            const armyType = (armyTypeInput?.value as ArmyType) || 'infantry';
            resolve({ name, settlementId, armyType });
          }
        }
      },
      default: 'ok',
      close: () => resolve(null)
    }).render(true);
  });
}

export const RecruitArmyAction = {
  id: 'recruit-unit',
  
  /**
   * Check if action can be performed
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {

    // Check if we have any settlements (informational only)
    const settlementCount = kingdomData.settlements?.length || 0;

    // Get party level for army level
    const game = (globalThis as any).game;
    let partyLevel = 1;
    if (game?.actors) {
      const partyActors = Array.from(game.actors).filter((a: any) => 
        a.type === 'character' && a.hasPlayerOwner
      );
      if (partyActors.length > 0) {
        partyLevel = (partyActors[0] as any).level || 1;
      }
    }

    return {
      met: true
    };
  },
  
  customResolution: {
    component: null, // Dialog not used - we handle it in execute()
    
    validateData(resolutionData: ResolutionData): boolean {
      // Always valid - we do the work in execute()
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('recruit-unit', 'Starting army recruitment');
      
      const outcome = instance?.metadata?.outcome || 'success';
      
      try {
        // Step 1: Prompt for army details
        const armyDetails = await promptForArmyDetails();
        if (!armyDetails) {
          logActionError('recruit-unit', new Error('Army recruitment cancelled'));
          return createErrorResult('Army recruitment cancelled');
        }
        
        const { name, settlementId, armyType } = armyDetails;

        // Step 2: Get party level for army level
        const game = (globalThis as any).game;
        let armyLevel = 1;
        if (game?.actors) {
          const partyActors = Array.from(game.actors).filter((a: any) => 
            a.type === 'character' && a.hasPlayerOwner
          );
          if (partyActors.length > 0) {
            armyLevel = (partyActors[0] as any).level || 1;
          }
        }

        // Step 3: Apply resource costs (unrest reduction for critical success)

        const { createGameCommandsService } = await import('../../services/GameCommandsService');
        const gameCommands = await createGameCommandsService();
        
        const costResult = await gameCommands.applyNumericModifiers(
          resolutionData.numericModifiers,
          outcome as any
        );
        
        if (!costResult.success) {
          logger.error('❌ [RecruitArmy] Failed to apply effects:', costResult.error);
          return createErrorResult(costResult.error || 'Failed to apply army recruitment effects');
        }

        // Step 4: Create army with NPC actor and army type
        const { armyService } = await import('../../services/army');
        const army = await armyService.createArmy(name, armyLevel, {
          type: armyType,
          image: ARMY_TYPES[armyType].image
        });

        // Step 5: Assign to selected settlement (if any)
        if (settlementId && settlementId !== army.supportedBySettlementId) {

          await armyService.assignArmyToSettlement(army.id, settlementId);
        }
        
        // Step 6: Place NPC actor token on settlement location (GM-safe via ActionDispatcher)
        if (army.actorId && army.supportedBySettlementId) {
          const kingdom = getKingdomData();
          const settlement = kingdom.settlements.find(s => s.id === army.supportedBySettlementId);
          
          if (settlement && settlement.location && (settlement.location.x !== 0 || settlement.location.y !== 0)) {

            try {
              const scene = game?.scenes?.current;
              if (scene) {
                // Convert settlement location to world coordinates
                const gridSize = scene.grid?.size || 100;
                const x = settlement.location.x * gridSize;
                const y = settlement.location.y * gridSize;
                
                // Place token via GM-safe service method
                await armyService.placeArmyToken(army.actorId, scene.id, x, y);

              } else {

              }
            } catch (error) {
              logger.error('⚠️ [RecruitArmy] Failed to place token:', error);
              // Don't fail the whole action if token placement fails
            }
          }
        }
        
        logActionSuccess('recruit-unit', `Recruited ${name}!`);
        
        const settlementMessage = army.supportedBySettlementId 
          ? ` (supported by settlement)` 
          : ' (unsupported)';
        const message = `Recruited ${name} at level ${armyLevel}${settlementMessage}!`;
        
        return createSuccessResult(message);
        
      } catch (error) {
        logger.error('❌ [RecruitArmy] Error:', error);
        logActionError('recruit-unit', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to recruit army');
      }
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
