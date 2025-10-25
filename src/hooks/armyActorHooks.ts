/**
 * Army Actor Deletion Hooks
 * Handles user attempts to delete army actors directly in Foundry
 * Warns users to use the Disband Army action, or cleans up kingdom data if they proceed
 */

import { getKingdomData, updateKingdom } from '../stores/KingdomStore';
import { logger } from '../utils/Logger';

/**
 * Register army actor deletion hooks
 * Should be called during module initialization
 */
export function registerArmyActorHooks(): void {
  logger.debug('[ArmyActorHooks] Registering army actor hooks...');
  
  /**
   * Hook: preDeleteActor
   * Intercepts actor deletion attempts
   * Shows warning dialog for army actors with option to cancel or proceed
   */
  Hooks.on('preDeleteActor', (actor: any, options: any, userId: string) => {
    // If already confirmed, allow deletion
    if (options.reignmakerConfirmed) {
      logger.debug('[ArmyActorHooks] Deletion confirmed, allowing...');
      return true;
    }
    
    // Check if this actor is an army
    const armyMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    
    if (!armyMetadata?.armyId) {
      return true; // Not an army, allow deletion
    }
    
    logger.debug(`🗑️ [ArmyActorHooks] Intercepting deletion of army actor: ${actor.name}`);
    
    // Find army in kingdom data
    const kingdom = getKingdomData();
    const army = kingdom.armies?.find((a: any) => a.id === armyMetadata.armyId);
    
    if (!army) {
      logger.warn(`⚠️ [ArmyActorHooks] Army data not found for actor ${actor.id}, allowing deletion`);
      return true; // Orphaned actor, allow deletion
    }
    
    // Show warning dialog
    const Dialog = (globalThis as any).Dialog;
    
    new Dialog({
      title: `Delete Army Actor?`,
      content: `
        <div style="padding: 1rem;">
          <p><strong>⚠️ This is a Kingdom Army actor</strong></p>
          <hr style="margin: 1rem 0;">
          <p><strong>${actor.name}</strong> (Level ${army.level})</p>
          <p>Status: ${army.isSupported ? '✅ Supported' : '⚠️ Unsupported'}</p>
          ${army.supportedBySettlementId ? `<p>Supported by: ${kingdom.settlements?.find((s: any) => s.id === army.supportedBySettlementId)?.name || 'Unknown'}</p>` : ''}
          <hr style="margin: 1rem 0;">
          <p><strong>Recommended:</strong></p>
          <p>Use the <em>Disband Army</em> player action during the Actions phase for proper cleanup.</p>
          <hr style="margin: 1rem 0;">
          <p><strong>If you delete anyway:</strong></p>
          <ul>
            <li>Actor will be permanently deleted</li>
            <li>Army will be removed from kingdom records</li>
            <li>Settlement support slots will be freed</li>
          </ul>
        </div>
      `,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => {
            logger.debug('[ArmyActorHooks] Army deletion cancelled by user');
          }
        },
        delete: {
          icon: '<i class="fas fa-trash"></i>',
          label: 'Delete Anyway',
          callback: () => {
            logger.debug('[ArmyActorHooks] User confirmed deletion, proceeding...');
            // Delete with confirmation flag to bypass hook
            actor.delete({ reignmakerConfirmed: true });
          }
        }
      },
      default: 'cancel'
    }).render(true);
    
    // Prevent immediate deletion - dialog will handle it
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
    
    logger.debug(`🗑️ [ArmyActorHooks] Cleaning up kingdom data for deleted army actor: ${actor.name}`);
    
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
          logger.debug(`   Removed army from settlement: ${s.name}`);
        }
      });
      
      logger.debug(`   Armies removed: ${beforeCount - afterCount}`);
    });
    
    const ui = (globalThis as any).ui;
    ui?.notifications?.info(`Army "${actor.name}" removed from kingdom records.`);
    
    logger.debug(`✅ [ArmyActorHooks] Kingdom data cleaned up for ${actor.name}`);
  });
  
  logger.debug('✅ [ArmyActorHooks] Army actor hooks registered');
}
