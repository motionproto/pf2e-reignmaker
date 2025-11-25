/**
 * Army Actor Hooks
 * Handles army actor lifecycle events:
 * - Actor deletion (with confirmation dialogs)
 * - Actor updates (syncs name/level)
 * - Item deletion (syncs equipment removal)
 */

import { getKingdomData, updateKingdom } from '../stores/KingdomStore';
import { logger } from '../utils/Logger';
import { mountSvelteDialog } from '../utils/SvelteDialog';
import DisbandArmyDialog from '../view/kingdom/components/DisbandArmyDialog.svelte';

/**
 * Register army actor hooks
 * Should be called during module initialization
 */
export function registerArmyActorHooks(): void {

  /**
   * Hook: preDeleteActor
   * Intercepts actor deletion attempts
   * Shows dialog with options: Unlink, Delete Army, or Cancel
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
    
    // Block deletion immediately and handle asynchronously
    (async () => {
      // Get settlement info for dialog
      const settlement = kingdom.settlements?.find((s: any) => s.id === army.supportedBySettlementId);
      
      // Show custom Svelte dialog
      const result = await new Promise<'unlink' | 'disband' | 'cancel'>(async (resolve) => {
        // Create container for dialog
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.zIndex = '1000';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
      
      // Mount Svelte component
      const dialogComponent = new DisbandArmyDialog({
        target: container,
        props: {
          show: true,
          armyName: army.name,
          armyLevel: army.level,
          hasLinkedActor: true,
          isSupported: army.isSupported,
          supportedBySettlement: settlement?.name || ''
        }
      });
      
      // Enable pointer events for dialog content
      setTimeout(() => {
        const dialogElements = container.querySelectorAll('.dialog-backdrop, .dialog');
        dialogElements.forEach(el => {
          (el as HTMLElement).style.pointerEvents = 'auto';
        });
      }, 0);
      
      // Cleanup function
      const cleanup = () => {
        dialogComponent.$destroy();
        document.body.removeChild(container);
      };
      
      // Handle confirm - user chose to disband the army
      dialogComponent.$on('confirm', (event: CustomEvent<{ deleteActor: boolean }>) => {
        cleanup();
        // If user unchecked "Delete NPC Actor", just unlink
        if (!event.detail.deleteActor) {
          resolve('unlink');
        } else {
          resolve('disband');
        }
      });
      
      // Handle cancel
      dialogComponent.$on('cancel', () => {
        cleanup();
        resolve('cancel');
      });
    });
    
      if (result === 'cancel') {
        logger.info('🚫 [ArmyActorHooks] User cancelled army deletion');
        return;
      }
      
      if (result === 'unlink') {
        // Unlink actor from army and delete actor
        const { armyService } = await import('../services/army');
        try {
          await armyService.unlinkActor(armyMetadata.armyId);
          logger.info(`🔓 [ArmyActorHooks] Unlinked army ${army.name} from actor ${actor.name}`);
          
          // Now delete the actor with confirmation flag, suppress Foundry's dialog
          await actor.delete({ reignmakerConfirmed: true }, { render: false });
        } catch (error) {
          logger.error('❌ [ArmyActorHooks] Failed to unlink army:', error);
          const ui = (globalThis as any).ui;
          ui?.notifications?.error('Failed to unlink army');
        }
        return;
      }
      
      if (result === 'disband') {
        // Delete actor with confirmation flag, suppress Foundry's dialog
        // The deleteActor hook will handle cleaning up the army from kingdom data
        logger.info(`🗑️ [ArmyActorHooks] User confirmed disbanding army ${army.name}`);
        await actor.delete({ reignmakerConfirmed: true }, { render: false });
        return;
      }
    })();
    
    // Block deletion immediately - the async handler above will re-trigger if confirmed
    return false;
  });
  
  /**
   * Hook: updateActor
   * Syncs army name and level changes from actor back to kingdom data
   */
  Hooks.on('updateActor', async (actor: any, changes: any, options: any, userId: string) => {
    // Check if this actor is an army
    const armyMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    
    if (!armyMetadata?.armyId) {
      return; // Not an army
    }
    
    // Check if name or level changed
    const nameChanged = changes.name !== undefined;
    const levelChanged = changes.system?.details?.level !== undefined;
    
    if (!nameChanged && !levelChanged) {
      return; // No relevant changes
    }
    
    // Sync changes back to kingdom data
    const { armyService } = await import('../services/army');
    try {
      await armyService.syncActorToArmy(actor.id);
      logger.info(`🔄 [ArmyActorHooks] Synced army ${actor.name} (name: ${nameChanged}, level: ${levelChanged})`);
    } catch (error) {
      logger.error('❌ [ArmyActorHooks] Failed to sync army:', error);
    }
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

  /**
   * Hook: preDeleteItem (runs before item deletion)
   * Syncs equipment removal when army equipment effects are deleted from actors
   * When an equipment effect is removed from an army actor, removes the corresponding
   * equipment flag from the army's kingdom data
   * 
   * Uses preDeleteItem to capture item data before it's deleted
   */
  Hooks.on('preDeleteItem', async (item: any, options: any, userId: string) => {
    // Check if this item is an army equipment effect
    const itemSlug = item.system?.slug;
    if (!itemSlug || !itemSlug.startsWith('army-equipment-')) {
      return; // Not an army equipment effect, allow deletion
    }

    // Extract equipment type from slug (format: "army-equipment-{type}")
    const equipmentType = itemSlug.replace('army-equipment-', '');
    const validTypes = ['armor', 'runes', 'weapons', 'equipment'];
    if (!validTypes.includes(equipmentType)) {
      logger.warn(`⚠️ [ArmyActorHooks] Unknown equipment type in slug: ${equipmentType}`);
      return; // Allow deletion anyway
    }

    // Get the parent actor (available before deletion)
    const actor = item.parent;
    if (!actor) {
      logger.warn(`⚠️ [ArmyActorHooks] Item ${item.id} has no parent actor`);
      return; // Allow deletion anyway
    }

    // Check if this actor is an army
    const armyMetadata = actor.getFlag('pf2e-reignmaker', 'army-metadata');
    if (!armyMetadata?.armyId) {
      return; // Not an army actor, allow deletion
    }

    // Find the army in kingdom data and remove the equipment flag
    await updateKingdom(kingdom => {
      const army = kingdom.armies?.find((a: any) => a.id === armyMetadata.armyId);
      if (army && army.equipment) {
        // Remove the equipment type from the army's equipment object
        delete army.equipment[equipmentType as keyof typeof army.equipment];
        logger.info(`🔄 [ArmyActorHooks] Removed ${equipmentType} equipment from ${army.name} (effect deleted from actor)`);
      } else {
        logger.warn(`⚠️ [ArmyActorHooks] Army ${armyMetadata.armyId} not found or has no equipment data`);
      }
    });

    // Allow the deletion to proceed
    return true;
  });

}
