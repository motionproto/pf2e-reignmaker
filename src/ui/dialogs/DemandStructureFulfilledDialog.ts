/**
 * DemandStructureFulfilledDialog - Resolution dialog when player builds the demanded structure
 * 
 * Shows:
 * - Celebration message
 * - Interactive dice rolling for rewards (unrest reduction)
 * - "Claim Rewards" button (enabled after dice rolled)
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { createGameCommandsService } from '../../services/GameCommandsService';
import { logger } from '../../utils/Logger';

interface DemandStructureFulfilledOptions {
  structureId: string;
  structureName: string;
  settlementName?: string;
  eventInstanceId?: string;
  modifierId?: string;
}

interface DemandStructureFulfilledResult {
  unrestReduction: number;
  goldReward: number;
}

export const DemandStructureFulfilledDialog = {
  /**
   * Show the demand fulfilled dialog
   * User rolls dice interactively, then claims rewards
   * 
   * @param options - Structure ID, name, and optional event instance/modifier IDs
   * @returns The result with rewards, or null if cancelled
   */
  async show(options: DemandStructureFulfilledOptions): Promise<DemandStructureFulfilledResult | null> {
    const { structureId, structureName, settlementName } = options;
    
    // Import and mount the Svelte component
    const { default: DemandStructureFulfilledResolution } = await import('../../view/kingdom/components/DemandStructureFulfilledResolution.svelte');
    
    return new Promise<DemandStructureFulfilledResult | null>((resolve) => {
      let dialogComponent: any = null;
      
      // Create mount point
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      
      // Don't pre-roll - let the component handle interactive dice rolling
      dialogComponent = new DemandStructureFulfilledResolution({
        target: mount,
        props: {
          show: true,
          structureId,
          structureName,
          settlementName: settlementName || ''
        }
      });
      
      // Listen for selection event
      dialogComponent.$on('selection', (event: any) => {
        const result = event.detail;
        cleanup();
        resolve({
          unrestReduction: result.unrestReduction,
          goldReward: result.goldReward
        });
      });
      
      // Listen for cancel event
      dialogComponent.$on('cancel', () => {
        cleanup();
        resolve(null);
      });
      
      function cleanup() {
        if (dialogComponent) {
          dialogComponent.$destroy();
          dialogComponent = null;
        }
        if (mount.parentNode) {
          mount.parentNode.removeChild(mount);
        }
      }
    });
  },
  
  /**
   * Apply the rewards from the dialog result
   */
  async applyRewards(
    structureId: string,
    structureName: string,
    result: DemandStructureFulfilledResult,
    eventInstanceId?: string,
    modifierId?: string,
    settlementName?: string
  ): Promise<void> {
    const { unrestReduction, goldReward } = result;
    
    // 1. Apply resource modifiers
    const gameCommands = await createGameCommandsService();
    await gameCommands.applyNumericModifiers([
      { resource: 'unrest', value: -unrestReduction },
      { resource: 'gold', value: goldReward }
    ], 'success');
    
    // 2. Remove the ongoing modifier and mark event as resolved
    logger.info(`[DemandStructureFulfilledDialog] Attempting to remove modifier. modifierId=${modifierId}, structureId=${structureId}`);
    
    await updateKingdom(kingdom => {
      // Remove the demand structure modifier by ID if provided, otherwise by metadata match
      if (kingdom.activeModifiers) {
        const beforeCount = kingdom.activeModifiers.length;
        
        // Log what modifiers we're looking at
        const demandModifiers = kingdom.activeModifiers.filter((m: any) => 
          m.sourceType === 'custom' && m.sourceName === 'Demand Structure Event'
        );
        logger.info(`[DemandStructureFulfilledDialog] Found ${demandModifiers.length} demand modifiers before removal`);
        demandModifiers.forEach((m: any) => {
          logger.info(`  - id=${m.id}, metadata.demandedStructureId=${m.metadata?.demandedStructureId}`);
        });
        
        kingdom.activeModifiers = kingdom.activeModifiers.filter((m: any) => {
          // Match by modifier ID if provided
          if (modifierId && m.id === modifierId) {
            logger.info(`[DemandStructureFulfilledDialog] Removing modifier by ID match: ${m.id}`);
            return false;
          }
          // Fallback: match by structure ID in metadata
          if (m.sourceType === 'custom' && 
              m.sourceName === 'Demand Structure Event' && 
              m.metadata?.demandedStructureId === structureId) {
            logger.info(`[DemandStructureFulfilledDialog] Removing modifier by structureId match: ${m.id}`);
            return false;
          }
          return true;
        });
        const removed = beforeCount - kingdom.activeModifiers.length;
        logger.info(`[DemandStructureFulfilledDialog] Removed ${removed} demand modifier(s). ${kingdom.activeModifiers.length} modifiers remain.`);
      } else {
        logger.warn(`[DemandStructureFulfilledDialog] No activeModifiers array found on kingdom!`);
      }
      
      // Mark event instance as resolved (if it exists)
      if (eventInstanceId) {
        const idx = kingdom.pendingOutcomes?.findIndex((i: any) => i.previewId === eventInstanceId);
        if (idx !== undefined && idx >= 0) {
          kingdom.pendingOutcomes[idx].status = 'resolved';
          kingdom.pendingOutcomes[idx].appliedOutcome = {
            outcome: 'success',
            actorName: 'Auto-Resolved',
            skillName: '',
            effect: 'Citizens celebrate the new structure!',
            modifiers: [
              { type: 'static', resource: 'unrest', value: -unrestReduction },
              { type: 'static', resource: 'gold', value: goldReward }
            ],
            manualEffects: [],
            effectsApplied: true
          };
        }
      }
    });
    
    // 3. Chat message
    const ChatMessage = (globalThis as any).ChatMessage;
    const citizensText = settlementName 
      ? `Citizens of <strong>${settlementName}</strong> celebrate`
      : 'Citizens celebrate';
    
    await ChatMessage.create({
      content: `<div class="reignmaker-chat">
        <h3>Demand for Structure Fulfilled!</h3>
        <p>${citizensText} as <strong>${structureName}</strong> has been built.</p>
        <p>Unrest reduced by <strong>${unrestReduction}</strong>.</p>
        <p>Gold gained: <strong>${goldReward}</strong>.</p>
      </div>`,
      speaker: { alias: 'Kingdom' }
    });
    
    logger.info(`[DemandStructureFulfilledDialog] Applied rewards for structure ${structureId} in ${settlementName || 'unknown'}: -${unrestReduction} unrest, +${goldReward} gold`);
  }
};

/**
 * Check if a structure is demanded by an active Demand Structure event
 * Returns the modifier info if found
 */
export function getDemandedStructureInfo(structureId: string, kingdom: any): { 
  isDemanded: boolean; 
  modifierId?: string;
  eventInstanceId?: string;
  settlementName?: string;
} {
  if (!kingdom?.activeModifiers) {
    return { isDemanded: false };
  }
  
  // Look for modifier with metadata containing the demanded structure ID
  const modifier = kingdom.activeModifiers.find((m: any) => 
    m.sourceType === 'custom' && 
    m.sourceName === 'Demand Structure Event' &&
    (m.metadata?.demandedStructureId === structureId || 
     m.id.includes(`demand-structure-${structureId}`))  // Fallback for legacy format
  );
  
  if (modifier) {
    return {
      isDemanded: true,
      modifierId: modifier.id,
      eventInstanceId: modifier.sourceId,
      settlementName: modifier.metadata?.demandedSettlementName
    };
  }
  
  return { isDemanded: false };
}

