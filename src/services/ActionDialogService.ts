/**
 * ActionDialogService - Manages action dialog orchestration
 * 
 * Coordinates the flow: dialog selection → roll execution → metadata storage
 * Replaces component-level pending state with centralized service.
 */

import { getActionImplementation } from '../controllers/actions/implementations';
import { logger } from '../utils/Logger';

/**
 * Metadata stored for an action awaiting resolution
 */
export interface ActionMetadata {
  actionId: string;
  skill: string;
  dialogResult?: any;  // Dialog-specific data (structureId, settlementId, etc.)
  timestamp: number;
}

/**
 * Callbacks provided by component for dialog coordination
 */
export interface ActionDialogCallbacks {
  showDialog: (dialogId: string) => void;
  onRollTrigger: (skill: string, metadata: any) => Promise<void>;
}

/**
 * Service for managing action dialog orchestration
 */
export class ActionDialogService {
  private pendingActions = new Map<string, ActionMetadata>();
  
  /**
   * Initiate an action, showing pre-roll dialog if needed
   * 
   * @param actionId - The action being performed
   * @param skill - The skill being used
   * @param callbacks - Component callbacks for dialog/roll coordination
   */
  async initiateAction(
    actionId: string,
    skill: string,
    callbacks: ActionDialogCallbacks
  ): Promise<void> {
    logger.info(`🎬 [ActionDialogService] Initiating action: ${actionId} with skill: ${skill}`);
    
    // Get action implementation
    const impl = getActionImplementation(actionId);
    
    // Check if action needs pre-roll dialog
    if (impl?.preRollDialog) {
      logger.info(`  📋 Action requires pre-roll dialog: ${impl.preRollDialog.dialogId}`);
      
      // Store pending action with skill
      this.pendingActions.set(actionId, {
        actionId,
        skill,
        timestamp: Date.now()
      });
      
      // Show dialog (component handles mounting Svelte component)
      callbacks.showDialog(impl.preRollDialog.dialogId);
      
      // Dialog completion will be handled by handleDialogComplete()
      // which will then trigger the roll via callback
    } else {
      // Standard action - no dialog needed, proceed directly to roll
      logger.info(`  ⏭️ No pre-roll dialog needed, proceeding to roll`);
      await callbacks.onRollTrigger(skill, null);
    }
  }
  
  /**
   * Handle dialog completion and trigger roll
   * 
   * @param actionId - The action ID
   * @param dialogResult - Data returned from dialog (structure selection, etc.)
   */
  async handleDialogComplete(
    actionId: string,
    dialogResult: any,
    onRollTrigger: (skill: string, metadata: any) => Promise<void>
  ): Promise<void> {
    logger.info(`✅ [ActionDialogService] Dialog completed for: ${actionId}`);
    
    const pending = this.pendingActions.get(actionId);
    
    if (!pending) {
      logger.warn(`⚠️ No pending action found for: ${actionId}`);
      return;
    }
    
    // Get action implementation to extract metadata
    const impl = getActionImplementation(actionId);
    
    if (!impl?.preRollDialog) {
      logger.error(`❌ Action ${actionId} has no preRollDialog config`);
      return;
    }
    
    // Extract metadata using action's extractor function
    const metadata = impl.preRollDialog.extractMetadata 
      ? impl.preRollDialog.extractMetadata(dialogResult)
      : dialogResult;
    
    // Update pending action with dialog result
    pending.dialogResult = metadata;
    this.pendingActions.set(actionId, pending);
    
    logger.info(`  📦 Metadata stored:`, metadata);
    
    // Trigger roll with metadata
    await onRollTrigger(pending.skill, metadata);
  }
  
  /**
   * Get metadata for an action
   * Used during resolution to access dialog selections
   */
  getMetadata(actionId: string): ActionMetadata | null {
    return this.pendingActions.get(actionId) || null;
  }
  
  /**
   * Clear action metadata after resolution
   */
  clearAction(actionId: string): void {
    logger.info(`🧹 [ActionDialogService] Clearing action: ${actionId}`);
    this.pendingActions.delete(actionId);
  }
  
  /**
   * Clear all pending actions (cleanup on phase change)
   */
  clearAll(): void {
    logger.info(`🧹 [ActionDialogService] Clearing all pending actions`);
    this.pendingActions.clear();
  }
  
  /**
   * Get all pending action IDs (for debugging)
   */
  getPendingActionIds(): string[] {
    return Array.from(this.pendingActions.keys());
  }
}

/**
 * Factory function to create service instance
 */
export async function createActionDialogService(): Promise<ActionDialogService> {
  return new ActionDialogService();
}
