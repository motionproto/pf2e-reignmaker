<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { settlementService } from '../../../../services/settlements';
   
   export let settlement: Settlement;
   
   // Image upload
   async function selectImage() {
      if (!settlement) return;
      
      // @ts-ignore
      const fp = new FilePicker({
         type: "image",
         current: settlement.imagePath || "",
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
      fp.render(true);
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
</script>

<div class="detail-section">
   {#if settlement.imagePath}
      <div class="settlement-image">
         <img src={settlement.imagePath} alt={settlement.name} />
         <div class="image-actions">
            <button on:click={selectImage} class="change-image-btn">
               <i class="fas fa-exchange-alt"></i> Change Image
            </button>
            <button on:click={removeImage} class="remove-image-btn">
               <i class="fas fa-times"></i> Remove
            </button>
         </div>
      </div>
   {:else}
      <div class="image-placeholder">
         <i class="fas fa-image fa-3x"></i>
         <button on:click={selectImage} class="upload-image-btn">
            <i class="fas fa-upload"></i> Upload Image
         </button>
      </div>
   {/if}
</div>

<style lang="scss">
   @import './settlements-shared.scss';
   
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
   
   .image-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      background: var(--bg-elevated);
      border: 2px dashed var(--border-default);
      border-radius: var(--radius-lg);
      text-align: center;
      
      i {
         margin-bottom: 1rem;
         opacity: var(--opacity-muted);
         color: var(--text-secondary);
      }
      
      .upload-image-btn {
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
            margin: 0 0.5rem 0 0;
            opacity: 1;
         }
      }
   }
</style>
