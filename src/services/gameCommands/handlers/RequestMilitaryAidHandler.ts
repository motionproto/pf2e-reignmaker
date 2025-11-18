/**
 * RequestMilitaryAid Command Handler
 * 
 * Handles complex Request Military Aid game commands:
 * - requestMilitaryAidRecruitment (critical success - shows dialog, recruits allied army)
 * - requestMilitaryAidEquipment (success - shows equipment selection dialog)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { updateKingdom } from '../../../stores/KingdomStore';
import type { Army } from '../../../models/Army';

export class RequestMilitaryAidHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'requestMilitaryAidRecruitment' || 
           command.type === 'requestMilitaryAidEquipment';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    if (command.type === 'requestMilitaryAidRecruitment') {
      return this.handleRecruitment(command, ctx);
    } else {
      return this.handleEquipment(command, ctx);
    }
  }
  
  /**
   * Handle allied army recruitment (critical success)
   */
  private async handleRecruitment(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Determine army level
    let level = 1;
    if (command.level === 'kingdom-level') {
      level = ctx.kingdom.partyLevel || 1;
    } else if (typeof command.level === 'number') {
      level = command.level;
    }
    
    const exemptFromUpkeep = command.exemptFromUpkeep === true;
    
    // Import and show RecruitArmyDialog to get army details
    const { default: RecruitArmyDialog } = await import('../../../view/kingdom/components/RecruitArmyDialog.svelte');
    
    const recruitmentData = await new Promise<any>((resolve) => {
      let dialogComponent: any;
      
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      
      dialogComponent = new RecruitArmyDialog({
        target: mount,
        props: { 
          show: true,
          exemptFromUpkeep: exemptFromUpkeep  // Hide settlement selector
        }
      });
      
      dialogComponent.$on('confirm', (event: CustomEvent) => {
        dialogComponent.$destroy();
        mount.remove();
        resolve(event.detail);
      });
      
      dialogComponent.$on('cancel', () => {
        dialogComponent.$destroy();
        mount.remove();
        resolve(null);
      });
    });
    
    if (!recruitmentData) {
      // User cancelled - no-op
      return null;
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // ⚠️ TECHNICAL DEBT: Global State Write
    // ══════════════════════════════════════════════════════════════════════
    // 
    // This is the ONLY remaining global state write in the handler system.
    // 
    // PROBLEM:
    //   - We collect recruitment data from the dialog (name, type, etc.)
    //   - GameCommandsResolver.recruitArmy() doesn't accept this as a parameter
    //   - It reads from global state instead: (globalThis as any).__pendingRecruitArmy
    // 
    // SOLUTION (Action Overhaul):
    //   - Update GameCommandsResolver.recruitArmy(level, recruitmentData, exemptFromUpkeep)
    //   - Update resolver implementation to use parameter instead of global state
    //   - Remove this global state write
    // 
    // TRACKING:
    //   - Will be fixed during Action Overhaul refactor
    //   - Search codebase for "__pendingRecruitArmy" to find all read locations
    // 
    // ══════════════════════════════════════════════════════════════════════
    
    (globalThis as any).__pendingRecruitArmy = recruitmentData;
    
    // Now prepare recruitment with the data
    return await resolver.recruitArmy(level, undefined, exemptFromUpkeep);
  }
  
  /**
   * Handle equipment selection (success)
   */
  private async handleEquipment(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Check if there are any armies available BEFORE showing dialog
    const availableArmies = (ctx.kingdom.armies || []).filter((a: Army) => {
      if (!a.actorId) return false;
      // Check if army has at least one equipment slot available
      const validTypes = ['armor', 'runes', 'weapons', 'equipment'];
      return validTypes.some(type => !a.equipment?.[type as keyof typeof a.equipment]);
    });
    
    if (availableArmies.length === 0) {
      // No armies to outfit - grant 1 gold instead (fallback case)
      console.log('[RequestMilitaryAidHandler] No armies available to outfit - PREPARING to grant 1 gold');
      
      // Return PreparedCommand with commit function that adds gold
      return {
        specialEffect: {
          type: 'resource',
          message: 'No armies available to outfit - received 1 Gold instead',
          icon: 'fa-coins',
          variant: 'neutral'
        },
        commit: async () => {
          console.log('[RequestMilitaryAidHandler] COMMITTING: Adding 1 gold');
          
          await updateKingdom(k => {
            k.resources.gold = (k.resources.gold || 0) + 1;
          });
          
          console.log('[RequestMilitaryAidHandler] Gold fallback applied successfully');
        }
      };
    }
    
    // Import custom dialog dynamically
    const { default: EquipmentSelectionDialog } = await import('../../../view/kingdom/components/dialogs/EquipmentSelectionDialog.svelte');
    
    // Show dialog and wait for user selection
    const selection = await new Promise<{ armyId: string; equipmentType: string } | null>((resolve) => {
      let dialogComponent: any;
      
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      
      dialogComponent = new EquipmentSelectionDialog({
        target: mount,
        props: { show: true }
      });
      
      dialogComponent.$on('confirm', (event: CustomEvent) => {
        dialogComponent.$destroy();
        mount.remove();
        resolve(event.detail);
      });
      
      dialogComponent.$on('cancel', () => {
        dialogComponent.$destroy();
        mount.remove();
        resolve(null);
      });
    });
    
    if (!selection) {
      // User cancelled - no-op
      return null;
    }
    
    // PREPARE: Generate preview message only (don't apply equipment yet)
    const army = ctx.kingdom.armies?.find((a: any) => a.id === selection.armyId);
    const armyName = army?.name || 'Army';
    
    const equipmentNames = {
      armor: 'Armor',
      runes: 'Runes',
      weapons: 'Weapons',
      equipment: 'Enhanced Gear'
    };
    const equipmentName = equipmentNames[selection.equipmentType as keyof typeof equipmentNames] || selection.equipmentType;
    
    const message = `${armyName} will be outfitted with ${equipmentName}`;
    
    // Return PreparedCommand with commit function that actually applies equipment
    return {
      specialEffect: {
        type: 'status',
        message: message,
        icon: 'fa-shield-alt',
        variant: 'positive'
      },
      commit: async () => {
        console.log('[RequestMilitaryAidHandler] COMMITTING equipment application');
        console.log('  - armyId:', selection.armyId);
        console.log('  - equipmentType:', selection.equipmentType);
        
        // NOW apply the equipment
        const applyResult = await resolver.outfitArmy(
          selection.armyId, 
          selection.equipmentType, 
          'success',
          false
        );
        
        // Check if result is ResolveResult (has success property)
        if ('success' in applyResult) {
          if (!applyResult.success) {
            console.error('[RequestMilitaryAidHandler] Failed to outfit army:', applyResult.error);
            throw new Error(applyResult.error || 'Failed to outfit army');
          }
        } else if ('commit' in applyResult) {
          // PreparedCommand - execute commit
          await applyResult.commit();
        }
        
        console.log('[RequestMilitaryAidHandler] Equipment applied successfully');
      }
    };
  }
}
