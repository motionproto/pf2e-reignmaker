import { SvelteApp } from '#runtime/svelte/application';
import { deepMerge } from '#runtime/util/object';

import KingdomAppShell from './KingdomAppShell.svelte';
import { getHighestPartyLevel } from '../../hooks/partyLevelHooks';
import { getKingdomActor } from '../../stores/KingdomStore';

/**
 * Kingdom management application using TyphonJS Runtime Library
 */
class KingdomApp extends SvelteApp<KingdomApp.Options>
{
   /**
    * @param [options] - KingdomApp options to handle.
    */
   constructor(options?: KingdomApp.Options)
   {
      super(options);
   }

   static get defaultOptions(): KingdomApp.Options
   {
      // Calculate optimal height based on available screen space
      const availableHeight = window.screen.availHeight || window.innerHeight;
      
      // Use 85% of available height to leave room for taskbar and title bars
      const calculatedHeight = Math.floor(availableHeight * 0.85);
      
      // Ensure the height is at least the minimum
      const optimalHeight = Math.max(calculatedHeight, 480);

      return deepMerge<SvelteApp.Options, KingdomApp.Options>(super.defaultOptions, {
         id: 'pf2e-reignmaker',
         resizable: true,
         minimizable: true,
         width: 1280,
         height: optimalHeight,
         minWidth: 720,
         minHeight: 480,
         
         title: 'ReignMaker',

         svelte: {
            class: KingdomAppShell,
            target: document.body,
            context: {
               // External context data
               actorId: null,
            },
            props: {
               // Props passed to app shell
            }
         }
      });
   }

   /**
    * Override header buttons to add custom kingdom actions
    */
   _getHeaderButtons(): SvelteApp.HeaderButton[]
   {
      const buttons: SvelteApp.HeaderButton[] = super._getHeaderButtons();

      // Add import button
      buttons.unshift({
         class: 'import',
         icon: 'fas fa-file-import',
         title: 'Import Territory Data',
         onPress: (): void => {
            // Trigger welcome dialog in the app shell
            this.svelte.appShell?.$set({ showWelcomeDialog: true });
         }
      });

      // Settings button removed - now handled within the app content

      return buttons;
   }

   /**
    * Override to handle data initialization
    */
   async _render(force?: boolean, options?: any): Promise<void>
   {
      // Load kingdom data before rendering
      const actorId = this.options.actorId || 'xxxPF2ExPARTYxxx';
      
      // Update context with actor ID
      if (this.svelte.context)
      {
         this.svelte.context.actorId = actorId;
      }

      // Sync party level when app opens
      const actor = getKingdomActor();
      if (actor) {
         const kingdom = actor.getKingdomData();
         if (kingdom) {
            const currentPartyLevel = getHighestPartyLevel();
            if (kingdom.partyLevel !== currentPartyLevel) {
               console.log(`🎯 [KingdomApp] Syncing party level: ${kingdom.partyLevel} → ${currentPartyLevel}`);
               await actor.updateKingdomData((k: any) => {
                  k.partyLevel = currentPartyLevel;
               });
            }
         }
      }

      // Data initialization is now handled by KingdomAppShell to ensure proper timing

      return super._render(force, options);
   }
   
   /**
    * Override close to save data before closing
    */
   async close(options?: { force?: boolean }): Promise<void>
   {

      // Data is now automatically saved via KingdomActor system

      return super.close(options);
   }
}

/**
 * Type definitions for KingdomApp
 */
declare namespace KingdomApp {
   /**
    * Extended context for the Kingdom application
    */
   interface External extends SvelteApp.Context.External<KingdomApp> {
      /** The actor ID for the party/kingdom */
      actorId: string | null;
   }

   /** Extended options */
   interface Options extends SvelteApp.Options<KingdomAppShell, External> {
      /** Actor ID for the kingdom */
      actorId?: string;
   }
}

export { KingdomApp }
