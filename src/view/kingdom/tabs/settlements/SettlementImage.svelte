<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { settlementService } from '../../../../services/settlements';
   import { getDefaultSettlementImage } from '../../../../models/Settlement';
   import Button from '../../components/baseComponents/Button.svelte';
   
   export let settlement: Settlement;
   
   // Image upload
   async function selectImage() {
      if (!settlement) return;
      
      // @ts-ignore - Check if player has file browser permission
      const game = (globalThis as any).game;
      
      // Check if user has FILES_BROWSE permission
      if (!game?.user?.hasPermission("FILES_BROWSE")) {
         // Show helpful message about needing permission
         // @ts-ignore
         const dialog = new Dialog({
            title: "📁 File Browser Permission Required",
            content: `
               <div style="text-align: left; line-height: 1.6;">
                  <p><strong>To upload custom settlement images, you need file browsing permission.</strong></p>
                  <p>Please ask your GM to:</p>
                  <ol style="margin-left: 1.5em;">
                     <li>Open <strong>Configure Settings</strong></li>
                     <li>Choose <strong>Open Permission Configuration</strong></li>
                     <li>Check to allow players to <strong>"Upload Files"</strong> and <strong>"Use File Browser"</strong></li>
                  </ol>
                  <p style="margin-top: 1em;">Until then, your settlements will use the default tier images based on settlement size.</p>
               </div>
            `,
            buttons: {
               ok: {
                  icon: '<i class="fas fa-check"></i>',
                  label: "OK"
               }
            },
            default: "ok"
         });
         dialog.render(true);
         return;
      }
      
      // User has permission - open FilePicker
      // @ts-ignore - FilePicker with player-accessible configuration
      const fp = new FilePicker({
         type: "image",
         current: settlement.imagePath || "",
         // Allow browsing from user data directory (accessible to players)
         activeSource: "data",
         // Explicitly set displayMode for better UX
         displayMode: "tiles",
         // Allow players to browse their uploads
         redirectToRoot: ["data"],
         callback: async (path: string) => {
            if (settlement) {
               try {
                  await settlementService.updateSettlementImage(settlement.id, path);
                  // @ts-ignore
                  ui.notifications?.info('Settlement image updated');
               } catch (error) {
                  console.error('Failed to update image:', error);
                  // @ts-ignore
                  ui.notifications?.error(`Failed to update image: ${error.message}`);
               }
            }
         }
      });
      
      // Render the file picker with error handling
      try {
         fp.render(true);
      } catch (error) {
         console.error('Failed to open file picker:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to open file picker. Please contact your GM if this persists.');
      }
   }
   
   async function removeImage() {
      if (!settlement) return;
      
      try {
         await settlementService.updateSettlementImage(settlement.id, '');
         // @ts-ignore
         ui.notifications?.info('Settlement image removed');
      } catch (error) {
         console.error('Failed to remove image:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to remove image: ${error.message}`);
      }
   }
   
   function pickMapImage() {
      // TODO: Implement map image picker functionality
      // @ts-ignore
      ui.notifications?.info('Pick Map Image - Feature coming soon');
   }
   
   async function restoreDefault() {
      if (!settlement) return;
      
      try {
         // Get the default tier image path and set it
         const defaultImage = getDefaultSettlementImage(settlement.tier);
         await settlementService.updateSettlementImage(settlement.id, defaultImage);
         // @ts-ignore
         ui.notifications?.info('Settlement image restored to default');
      } catch (error) {
         console.error('Failed to restore default image:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to restore default image: ${error.message}`);
      }
   }
</script>

<div class="detail-section">
   {#if settlement.imagePath}
      <div class="settlement-image">
         <img src={settlement.imagePath} alt={settlement.name} />
         <div class="image-actions">
            <Button variant="secondary" size="small" icon="fa-solid fa-image" on:click={selectImage}>
               Change Image
            </Button>
            <Button variant="outline" size="small" icon="fas fa-times" on:click={removeImage}>
               Remove
            </Button>
            <div class="spacer"></div>
            <Button variant="secondary" size="small" on:click={pickMapImage}>
               Map Image
            </Button>
         </div>
      </div>
   {:else}
      <div class="placeholder-actions">
         <Button variant="secondary" size="small" icon="fas fa-upload" on:click={selectImage}>
            Upload Image
         </Button>
         <Button variant="outline" size="small" icon="fas fa-undo" on:click={restoreDefault}>
            Restore Default
         </Button>
         <div class="spacer"></div>
         <Button variant="secondary" size="small" on:click={pickMapImage}>
            Map Image
         </Button>
      </div>
   {/if}
</div>

<style lang="scss">
   .detail-section {
      margin-bottom: 1.5rem;
   }
   
   .settlement-image {
      img {
         width: 100%;
         max-height: 300px;
         object-fit: cover;
         border-radius: var(--radius-lg);
         margin-bottom: 0.75rem;
      }
      
      .image-actions {
         display: flex;
         gap: 0.5rem;
         
         .spacer {
            flex: 1;
         }
         
         button {
            flex: 1;
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            background: var(--bg-elevated);
            color: var(--text-primary);
            cursor: pointer;
            transition: var(--transition-base);
            font-size: var(--font-md);
            
            &:hover {
               background: var(--bg-overlay);
               border-color: var(--color-primary);
            }
            
            i {
               margin-right: 0.5rem;
            }
         }
         
         .remove-image-btn {
            color: var(--color-danger);
            
            &:hover {
               background: var(--bg-overlay);
               border-color: var(--color-danger);
            }
         }
      }
   }
   
   .placeholder-actions {
      display: flex;
      gap: 0.5rem;
      
      .spacer {
         flex: 1;
      }
   }
</style>
