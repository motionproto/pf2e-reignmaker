/**
 * Dialog for confirming kingdom data reset
 */

import { getKingdomActor } from '../main.kingdom';

// Declare Foundry Dialog type
declare const Dialog: any;

export class ResetKingdomDialog {
  static async show(): Promise<void> {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Reset Kingdom Data',
        content: `
          <div style="margin-bottom: 1em;">
            <p style="font-weight: bold; color: #a00;">⚠️ Warning: This action cannot be undone!</p>
            <p>This will completely reset all kingdom data, including:</p>
            <ul style="margin-left: 1em; margin-top: 0.5em;">
              <li>Turn counter (reset to 1)</li>
              <li>All resources (gold, food, lumber, etc.)</li>
              <li>All hexes and settlements</li>
              <li>All armies and build queue</li>
              <li>Unrest and fame</li>
              <li>Active modifiers and ongoing events</li>
              <li>Player actions and phase progress</li>
            </ul>
          </div>
        `,
        buttons: {
          reset: {
            icon: '<i class="fas fa-trash-restore"></i>',
            label: 'Reset Kingdom',
            callback: async () => {
              await ResetKingdomDialog.resetKingdom();
              resolve();
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve()
          }
        },
        default: 'cancel'
      }).render(true);
    });
  }

  private static async resetKingdom(): Promise<void> {
    try {
      const actor = await getKingdomActor();
      if (!actor) {
        // @ts-ignore
        ui.notifications?.warn('No kingdom actor found');
        return;
      }

      console.log('PF2E ReignMaker | Performing complete kingdom reset...');
      
      // STEP 1: Completely remove ALL old flags (nuke from orbit)
      // This clears any legacy fields that might be hanging around
      const moduleId = 'pf2e-reignmaker';
      const allFlags = actor.flags?.[moduleId];
      
      if (allFlags) {
        console.log('PF2E ReignMaker | Clearing all existing flags:', Object.keys(allFlags));
        
        // Unset ALL flags for this module
        for (const key of Object.keys(allFlags)) {
          await actor.unsetFlag(moduleId, key);
          console.log(`PF2E ReignMaker | Cleared flag: ${key}`);
        }
      }
      
      // STEP 2: Initialize fresh kingdom data
      await actor.initializeKingdom('New Kingdom');
      
      // @ts-ignore
      ui.notifications?.info('Kingdom data has been completely reset (all legacy data cleared)');
      
      console.log('PF2E ReignMaker | Kingdom data reset successfully - all legacy fields removed');
    } catch (error) {
      console.error('PF2E ReignMaker | Failed to reset kingdom:', error);
      // @ts-ignore
      ui.notifications?.error('Failed to reset kingdom data');
    }
  }
}
