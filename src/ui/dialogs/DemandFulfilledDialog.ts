/**
 * DemandFulfilledDialog - Resolution dialog when player claims the demanded hex
 * 
 * Shows:
 * - Celebration message
 * - Interactive dice rolling for rewards (gold, unrest reduction)
 * - Worksite selection based on terrain
 * - "Claim Rewards" button (enabled after dice rolled and worksite selected)
 */

import type { WorksiteType } from '../../pipelines/shared/worksiteValidator';
import { updateKingdom } from '../../stores/KingdomStore';
import { createGameCommandsService } from '../../services/GameCommandsService';
import { logger } from '../../utils/Logger';

interface DemandFulfilledOptions {
  hexId: string;
  terrain: string;
  eventInstanceId?: string;
}

interface DemandFulfilledResult {
  goldBonus: number;
  unrestReduction: number;
  worksiteType: WorksiteType | null;
}

export const DemandFulfilledDialog = {
  /**
   * Show the demand fulfilled dialog
   * User rolls dice interactively, selects worksite, then claims rewards
   * 
   * @param options - Hex ID, terrain, and optional event instance ID
   * @returns The result with rewards and selected worksite, or null if cancelled
   */
  async show(options: DemandFulfilledOptions): Promise<DemandFulfilledResult | null> {
    const { hexId, terrain } = options;
    
    // Import and mount the Svelte component
    const { default: DemandFulfilledResolution } = await import('../../view/kingdom/components/DemandFulfilledResolution.svelte');
    
    return new Promise<DemandFulfilledResult | null>((resolve) => {
      let dialogComponent: any = null;
      
      // Create mount point
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      
      // Don't pre-roll - let the component handle interactive dice rolling
      dialogComponent = new DemandFulfilledResolution({
        target: mount,
        props: {
          show: true,
          hexId,
          terrain
        }
      });
      
      // Listen for selection event
      dialogComponent.$on('selection', (event: any) => {
        const result = event.detail;
        cleanup();
        resolve({
          goldBonus: result.goldBonus,
          unrestReduction: result.unrestReduction,
          worksiteType: result.worksiteType
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
    hexId: string,
    result: DemandFulfilledResult,
    eventInstanceId?: string
  ): Promise<void> {
    const { goldBonus, unrestReduction, worksiteType } = result;
    
    // 1. Apply resource modifiers
    const gameCommands = await createGameCommandsService();
    await gameCommands.applyNumericModifiers([
      { resource: 'unrest', value: -unrestReduction },
      { resource: 'gold', value: goldBonus }
    ], 'success');
    
    // 2. Create worksite if selected
    if (worksiteType) {
      const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
      await createWorksiteExecution(hexId, worksiteType);
      logger.info(`[DemandFulfilledDialog] Created free ${worksiteType} on hex ${hexId}`);
    }
    
    // 3. Remove 'demanded' feature and mark event as resolved
    await updateKingdom(kingdom => {
      // Remove 'demanded' feature from hex
      const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
      if (hex?.features) {
        hex.features = hex.features.filter((f: any) => f.type !== 'demanded');
        logger.info(`[DemandFulfilledDialog] Removed 'demanded' feature from hex ${hexId}`);
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
            effect: 'Citizens celebrate the new territory!',
            modifiers: [
              { type: 'static', resource: 'unrest', value: -unrestReduction },
              { type: 'static', resource: 'gold', value: goldBonus }
            ],
            manualEffects: [],
            effectsApplied: true
          };
        }
      }
    });
    
    // 4. Chat message
    const ChatMessage = (globalThis as any).ChatMessage;
    await ChatMessage.create({
      content: `<div class="reignmaker-chat">
        <h3>Demand for Expansion Fulfilled</h3>
        <p>Citizens celebrate as hex <strong>${hexId}</strong> has been claimed.</p>
        <p>Unrest reduced by <strong>${unrestReduction}</strong>.</p>
        <p>Gold gained: <strong>+${goldBonus}</strong>.</p>
        ${worksiteType ? `<p>A free <strong>${worksiteType}</strong> has been established!</p>` : ''}
      </div>`,
      speaker: { alias: 'Kingdom' }
    });
    
    logger.info(`[DemandFulfilledDialog] Applied rewards for hex ${hexId}: -${unrestReduction} unrest, +${goldBonus} gold, worksite: ${worksiteType || 'none'}`);
  }
};
