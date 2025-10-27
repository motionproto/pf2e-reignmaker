/**
 * Dialog for confirming kingdom data reset
 * Extends FormApplication to work with Foundry's settings menu system
 */

// Declare Foundry types
declare const FormApplication: any;
declare const game: any;
declare const ui: any;

export class ResetKingdomDialog extends FormApplication {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: 'reset-kingdom-dialog',
      title: 'Reset Kingdom Data',
      template: 'templates/generic-form.html',  // Use Foundry's generic template
      width: 500,
      classes: ['pf2e-reignmaker', 'reset-kingdom-dialog']
    };
  }

  getData() {
    return {
      message: `
        <p style="font-weight: bold; color: #a00;">⚠️ Warning: This action cannot be undone!</p>
        <p>This will completely delete all kingdom data from the party actor.</p>
        <p>When you next open the Kingdom UI, fresh data will be generated and territory will be synced from the Kingmaker module (if available).</p>
      `
    };
  }

  async _updateObject(event: Event, formData: any) {
    // This is called when the form is submitted
    await ResetKingdomDialog.resetKingdom();
  }

  /**
   * Delete kingdom data from party actor
   */
  private static async resetKingdom(): Promise<void> {
    try {
      // Find the party actor
      const partyActor = game.actors?.find((a: any) => a.type === 'party');

      if (!partyActor) {
        ui.notifications?.error('No party actor found!');
        logger.error('[PF2E ReignMaker] No party actor found');
        return;
      }

      // Remove the kingdom data flag
      await partyActor.unsetFlag('pf2e-reignmaker', 'kingdom-data');

      ui.notifications?.info(`Kingdom data removed from "${partyActor.name}". Reload the Kingdom UI to initialize fresh data.`);


    } catch (error) {
      logger.error('[PF2E ReignMaker] Failed to reset kingdom:', error);
      ui.notifications?.error('Failed to reset kingdom data');
    }
  }
}
