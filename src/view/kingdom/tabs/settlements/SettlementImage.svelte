<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { settlementService } from '../../../../services/settlements';
   import { getDefaultSettlementImage } from '../../../../models/Settlement';
   import { processMapIcon, sanitizeSettlementName } from '../../../../utils/ImageProcessor';
   import { ensureUploadDirectory } from '../../../../utils/FileSystemHelper';
   import Button from '../../components/baseComponents/Button.svelte';
   import Dialog from '../../components/baseComponents/Dialog.svelte';
   
   export let settlement: Settlement;
   
   // Dialog state
   let showMapIconInfo = false;
   
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
                  logger.error('Failed to update image:', error);
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
         logger.error('Failed to open file picker:', error);
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
         logger.error('Failed to remove image:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to remove image: ${error.message}`);
      }
   }
   
   async function pickMapImage() {
      if (!settlement) return;
      
      // @ts-ignore - Check if player has file browser permission
      const game = (globalThis as any).game;
      
      // Check if user has FILES_BROWSE permission
      if (!game?.user?.hasPermission("FILES_BROWSE")) {
         // @ts-ignore
         ui.notifications?.warn('You need file browsing permission to upload map icons. Please ask your GM.');
         return;
      }
      
      // Show info dialog before file picker
      showMapIconInfo = true;
   }
   
   function handleMapIconConfirm() {
      showMapIconInfo = false;
      openMapIconPicker();
   }
   
   function handleMapIconCancel() {
      showMapIconInfo = false;
   }
   
   async function openMapIconPicker() {
      if (!settlement) return;
      
      // @ts-ignore
      const game = (globalThis as any).game;
      
      // Generate suggested filename
      const sanitizedName = sanitizeSettlementName(settlement.name);
      // Use world-specific directory
      const worldId = game.world.id;
      const uploadDir = `worlds/${worldId}/reignmaker-uploads/map-icons`;
      
      // Ensure directory exists (routes through GM if player)
      try {
         await ensureUploadDirectory(uploadDir);
      } catch (err) {
         logger.error('Failed to ensure directory exists:', err);
         // @ts-ignore
         ui.notifications?.error('Failed to create upload directory. Please ensure a GM is online.');
         return;
      }
      
      // Open file picker for initial selection - start browsing in upload directory
      // @ts-ignore
      const fp = new FilePicker({
         type: "image",
         current: uploadDir, // Start browsing in our upload directory
         activeSource: "data",
         displayMode: "tiles",
         redirectToRoot: ["data"],
         callback: async (selectedPath: string) => {
            try {
               // Fetch the selected file
               const response = await fetch(selectedPath);
               if (!response.ok) throw new Error('Failed to fetch selected image');
               
               const blob = await response.blob();
               const file = new File([blob], 'temp.jpg', { type: blob.type });
               
               // Process the image
               // @ts-ignore
               ui.notifications?.info('Processing image...');
               const processedBlob = await processMapIcon(file);
               
               // Convert blob to File for upload
               const processedFile = new File([processedBlob], `${sanitizedName}.webp`, { type: 'image/webp' });
               
               // Upload to Foundry's file system in our upload directory
               // @ts-ignore
               const upload = await FilePicker.upload(
                  'data',
                  uploadDir,
                  processedFile,
                  {}
               );
               
               if (upload?.path) {
                  // Update settlement with new map icon path
                  await settlementService.updateSettlementMapIcon(settlement.id, upload.path);
                  // @ts-ignore
                  ui.notifications?.success('Map icon updated successfully');
               } else {
                  throw new Error('Upload failed - no path returned');
               }
            } catch (error) {
               logger.error('Failed to process/upload map icon:', error);
               // @ts-ignore
               ui.notifications?.error(`Failed to update map icon: ${error.message}`);
            }
         }
      });
      
      fp.render(true);
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
         logger.error('Failed to restore default image:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to restore default image: ${error.message}`);
      }
   }
</script>

<!-- Map Icon Info Dialog -->
<Dialog 
   bind:show={showMapIconInfo}
   title="🗺️ Map Icon Upload"
   confirmLabel="Choose Image"
   cancelLabel="Cancel"
   on:confirm={handleMapIconConfirm}
   on:cancel={handleMapIconCancel}
>
   <div class="map-icon-info">
      <p><strong>Map icons are automatically processed:</strong></p>
      <ul>
         <li>📐 Center-cropped to square</li>
         <li>📏 Scaled to 128×128 pixels</li>
         <li>🖼️ Converted to WebP format</li>
         <li>💾 Optimized file size (~50KB)</li>
      </ul>
      <p class="info-footer">
         <strong>Supported formats:</strong> PNG, JPG, WebP<br/>
         <strong>Any size works</strong> - the image will be automatically processed.
      </p>
   </div>
</Dialog>

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
   .map-icon-info {
      text-align: left;
      line-height: 1.6;
      font-size: var(--font-md);
      padding: 0rem 1.5rem; /* Less vertical, more horizontal */
      
      p {
         margin-bottom: 0.75rem;
      }
      
      ul {
         margin: 0.5rem 0 0.5rem 1.5rem;
         padding: 0;
      }
      
      li {
         margin-bottom: 0.25rem;
      }
      
      .info-footer {
         margin-top: 1rem;
      }
   }
   
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
