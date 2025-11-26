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
    
    // Pass recruitment data directly - no global state needed
    return await resolver.recruitArmy(level, recruitmentData, exemptFromUpkeep);
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
        outcomeBadge: {
          icon: 'fa-coins',
          template: 'Received 1 Gold (no armies to outfit)',
          variant: 'info'
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
    
    // Import OutfitArmyResolution (same component used by outfit-army action)
    const { default: OutfitArmyResolution } = await import('../../../view/kingdom/components/OutfitArmyResolution.svelte');
    
    // Show dialog and wait for user selection
    const selection = await new Promise<{ armyId: string; equipmentType: string } | null>((resolve) => {
      let dialogComponent: any;
      
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      
      dialogComponent = new OutfitArmyResolution({
        target: mount,
        props: { 
          outcome: 'success',  // Always success for Request Military Aid
          applied: false
        }
      });
      
      dialogComponent.$on('selection', (event: CustomEvent) => {
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
      outcomeBadge: {
        icon: 'fa-shield-alt',
        template: `Outfitting ${armyName} with ${equipmentName}`,
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
