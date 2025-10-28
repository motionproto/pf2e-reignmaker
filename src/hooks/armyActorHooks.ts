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
   * Shows warning dialog for army actors with option to cancel or proceed
   */
  Hooks.on('preDeleteActor', (actor: any, options: any, userId: string) => {
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
    
    // Find supporting settlement name
    const supportedBySettlement = army.supportedBySettlementId 
      ? kingdom.settlements?.find((s: any) => s.id === army.supportedBySettlementId)?.name || ''
      : '';
    
    // Show custom Svelte dialog asynchronously (don't await)
    mountSvelteDialog(DeleteArmyDialog, {
      actorName: actor.name,
      armyLevel: army.level,
      isSupported: army.isSupported,
      supportedBySettlement,
    }).then(result => {
      // If confirmed, manually trigger deletion with confirmation flag
      if (result.confirmed) {
        actor.delete({ reignmakerConfirmed: true });
      }
    });
    
    // Always prevent the original deletion - we'll handle it manually if confirmed
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
