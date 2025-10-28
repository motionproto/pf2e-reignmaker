/**
 * Army Actor Deletion Hooks
 * Handles user attempts to delete army actors directly in Foundry
 * Warns users to use the Disband Army action, or cleans up kingdom data if they proceed
 */

import { getKingdomData, updateKingdom } from '../stores/KingdomStore';
import { logger } from '../utils/Logger';
import { mountSvelteDialog } from '../utils/SvelteDialog';
import DeleteArmyDialog from '../view/kingdom/components/DeleteArmyDialog.svelte';

/**
 * Register army actor deletion hooks
 * Should be called during module initialization
 */
export function registerArmyActorHooks(): void {

  /**
   * Hook: preDeleteActor
   * Intercepts actor deletion attempts
   * Shows dialog with options: Unlink, Delete Army, or Cancel
   */
  Hooks.on('preDeleteActor', async (actor: any, options: any, userId: string) => {
    // If already confirmed, allow deletion
    if (options.reignmakerConfirmed) {
      return true;
    }
    
    // Check if this actor is an army
    const armyMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    
    if (!armyMetadata?.armyId) {
      return true; // Not an army, allow deletion
    }

    // Find army in kingdom data
    const kingdom = getKingdomData();
    const army = kingdom.armies?.find((a: any) => a.id === armyMetadata.armyId);
    
    if (!army) {
      logger.warn(`⚠️ [ArmyActorHooks] Army data not found for actor ${actor.id}, allowing deletion`);
      return true; // Orphaned actor, allow deletion
    }
    
    // Show dialog with three options
    const Dialog = (globalThis as any).Dialog;
    const choice = await Dialog.wait({
      title: 'Delete Army Actor',
      content: `
        <p>This actor is linked to the army <strong>"${army.name}"</strong>.</p>
        <p>What would you like to do?</p>
      `,
      buttons: {
        unlink: {
          icon: '<i class="fas fa-unlink"></i>',
          label: 'Unlink & Delete Actor (Keep Army)',
          callback: () => 'unlink'
        },
        deleteArmy: {
          icon: '<i class="fas fa-trash"></i>',
          label: 'Delete Army Too',
          callback: () => 'deleteArmy'
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => 'cancel'
        }
      },
      default: 'cancel',
      close: () => 'cancel'
    });
    
    if (choice === 'cancel') {
      return false; // Cancel deletion
    }
    
    if (choice === 'unlink') {
      // Unlink actor from army and allow actor deletion
      const { armyService } = await import('../services/army');
      try {
        await armyService.unlinkActor(armyMetadata.armyId);
        logger.info(`🔓 [ArmyActorHooks] Unlinked army ${army.name} from actor ${actor.name}`);
        
        // Allow actor deletion to proceed
        return true;
      } catch (error) {
        logger.error('❌ [ArmyActorHooks] Failed to unlink army:', error);
        const ui = (globalThis as any).ui;
        ui?.notifications?.error('Failed to unlink army');
        return false;
      }
    }
    
    if (choice === 'deleteArmy') {
      // Delete the army (which will remove metadata and delete actor if requested)
      const { armyService } = await import('../services/army');
      try {
        // Don't delete actor in disbandArmy since we're already deleting it here
        await armyService.disbandArmy(armyMetadata.armyId, false);
        logger.info(`🗑️ [ArmyActorHooks] Disbanded army ${army.name} along with actor`);
        
        // Allow actor deletion to proceed
        return true;
      } catch (error) {
        logger.error('❌ [ArmyActorHooks] Failed to disband army:', error);
        const ui = (globalThis as any).ui;
        ui?.notifications?.error('Failed to disband army');
        return false;
      }
    }
    
    // Shouldn't reach here, but prevent deletion by default
    return false;
  });
  
  /**
   * Hook: deleteActor
   * Runs after actor is deleted
   * Cleans up kingdom data for army actors
   */
  Hooks.on('deleteActor', async (actor: any, options: any, userId: string) => {
    // Check if this actor was an army
    const armyMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    
    if (!armyMetadata?.armyId) {
      return; // Not an army
    }

    // Remove from kingdom store
    await updateKingdom(kingdom => {
      // Remove from armies array
      const beforeCount = kingdom.armies?.length || 0;
      kingdom.armies = kingdom.armies?.filter((a: any) => a.id !== armyMetadata.armyId) || [];
      const afterCount = kingdom.armies.length;
      
      // Remove from settlement support lists
      kingdom.settlements?.forEach((s: any) => {
        const beforeUnits = s.supportedUnits?.length || 0;
        s.supportedUnits = s.supportedUnits?.filter((id: string) => id !== armyMetadata.armyId) || [];
        const afterUnits = s.supportedUnits.length;
        
        if (beforeUnits > afterUnits) {

        }
      });

    });
    
    const ui = (globalThis as any).ui;
    ui?.notifications?.info(`Army "${actor.name}" removed from kingdom records.`);

  });

}
