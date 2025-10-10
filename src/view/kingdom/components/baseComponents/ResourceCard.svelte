<script lang="ts">
   import { tick } from 'svelte';
   import { getKingdomActor } from '../../../../stores/KingdomStore';
   import { activeEditingCard } from '../../../../stores/EditingStore';
   
   // Props
   export let resource: string;
   export let value: number;
   export let icon: string;
   export let color: string;
   export let size: 'normal' | 'compact' = 'normal';
   export let editable: boolean = true;
   export let onChange: ((newValue: number) => void) | null = null;
   
   // Generate unique card ID
   const cardId = `resource-${resource}-${Math.random().toString(36).substr(2, 9)}`;
   
   // Edit state management
   let editValue: number = value;
   let editInputElement: HTMLInputElement | undefined;
   
   // Reactive isEditing based on activeEditingCard store
   $: isEditing = $activeEditingCard === cardId;
   
   // Update editValue when value prop changes
   $: if (!isEditing) {
      editValue = value;
   }
   
   async function startEditing() {
      if (!editable) return;
      
      activeEditingCard.set(cardId);
      editValue = value;
      await tick();
      if (editInputElement) {
         editInputElement.focus();
         editInputElement.select();
      }
   }
   
   function saveEdit() {
      if (!isEditing) return;
      
      const newValue = Math.max(0, Math.floor(editValue));
      
      if (onChange) {
         onChange(newValue);
      } else {
         // Default behavior: update via KingdomActor
         const actor = getKingdomActor();
         if (actor) {
            actor.updateKingdom((kingdom) => {
               kingdom.resources[resource] = newValue;
            });
         }
      }
      
      activeEditingCard.set(null);
   }
   
   function cancelEdit() {
      editValue = value;
      activeEditingCard.set(null);
   }
   
   function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
         saveEdit();
      } else if (e.key === 'Escape') {
         cancelEdit();
      }
   }
   
   function handleBlur(e: FocusEvent) {
      // Only cancel if focus is leaving the card entirely
      const relatedTarget = e.relatedTarget as HTMLElement;
      const currentCard = (e.currentTarget as HTMLElement).closest('.resource-card');
      
      // Check if the new focus is still within this card
      if (!relatedTarget || !currentCard?.contains(relatedTarget)) {
         cancelEdit();
      }
   }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
   class="resource-card" 
   class:editing={isEditing}
   class:compact={size === 'compact'}
   class:editable
   style="--resource-color: {color};"
   on:click={startEditing}
>
   <i class="fas {icon} resource-icon" style="color: {color};"></i>
   <div class="resource-info">
      {#if isEditing}
         <input
            bind:this={editInputElement}
            type="number"
            bind:value={editValue}
            on:keydown={handleKeydown}
            on:blur={handleBlur}
            on:click|stopPropagation
            class="resource-edit-input"
            min="0"
         />
         <div class="edit-buttons">
            <button 
               class="save-btn" 
               on:click|stopPropagation={saveEdit} 
               aria-label="Save"
               title="Save"
            >
               <i class="fas fa-check"></i>
            </button>
            <button 
               class="cancel-btn" 
               on:click|stopPropagation={cancelEdit} 
               aria-label="Cancel"
               title="Cancel"
            >
               <i class="fas fa-times"></i>
            </button>
         </div>
      {:else}
         <div class="resource-value">{value}</div>
         <div class="resource-label">{resource}</div>
      {/if}
   </div>
</div>

<style lang="scss">
   .resource-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      outline: 2px solid transparent;
      outline-offset: 2px;
      transition: all 0.2s ease;
      position: relative;
      flex: 0 0 auto;
      
      &.editable {
         cursor: pointer;
      }
      
      &.editable:hover:not(.editing) {
         outline-color: var(--resource-color);
         background: rgba(0, 0, 0, 0.3);
      }
      
      &.editing {
         outline-width: 3px;
         outline-color: var(--resource-color);
         background: linear-gradient(135deg, 
            rgba(0, 0, 0, 0.3),
            color-mix(in srgb, var(--resource-color) 10%, transparent)
         );
      }
      
      /* Normal size (for ResourcesPhase) */
      &:not(.compact) {
         max-width: 112px;
         
         .resource-icon {
            font-size: 1.5rem;
         }
         
         .resource-info {
            min-width: 80px;
         }
         
         .resource-value {
            font-size: var(--font-2xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
         }
         
         .resource-label {
            font-size: var(--font-sm);
            color: var(--text-tertiary);
            text-transform: capitalize;
         }
         
         .resource-edit-input {
            width: 80px;
            font-size: var(--font-xl);
         }
      }
      
      /* Compact size (for KingdomStats) */
      &.compact {
         padding: 0.5rem;
         gap: 0.5rem;
         max-width: 100%;
         min-width: 0;
         
         .resource-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
         }
         
         .resource-info {
            min-width: 0;
            flex: 1;
         }
         
         .resource-value {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
         }
         
         .resource-label {
            font-size: var(--font-xs);
            color: var(--text-tertiary);
            text-transform: capitalize;
         }
         
         .resource-edit-input {
            width: 100%;
            font-size: var(--font-lg);
         }
      }
      
      .resource-info {
         display: flex;
         flex-direction: column;
         align-items: center;
      }
      
      .resource-edit-input {
         padding: 0.25rem 0.5rem;
         border: 2px solid var(--resource-color);
         border-radius: 0.25rem;
         background: var(--bg-surface);
         color: var(--text-primary);
         font-weight: var(--font-weight-bold);
         text-align: center;
         
         &:focus {
            outline: none;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--resource-color) 20%, transparent);
         }
      }
      
      /* Remove number input arrows for cleaner look */
      .resource-edit-input::-webkit-inner-spin-button,
      .resource-edit-input::-webkit-outer-spin-button {
         -webkit-appearance: none;
         margin: 0;
      }
      
      .resource-edit-input[type="number"] {
         -moz-appearance: textfield;
      }
      
      .edit-buttons {
         display: flex;
         gap: 0.25rem;
         margin-top: 0.25rem;
      }
      
      .save-btn,
      .cancel-btn {
         flex: 1;
         padding: 0.25rem;
         border: 1px solid var(--border-default);
         background: var(--bg-surface);
         border-radius: 0.25rem;
         display: flex;
         align-items: center;
         justify-content: center;
         cursor: pointer;
         transition: all var(--transition-fast);
         color: var(--text-primary);
         font-size: 0.75rem;
         
         i {
            font-size: 0.75rem;
         }
      }
      
      .save-btn:hover {
         background: var(--color-success);
         border-color: var(--color-success);
         color: white;
      }
      
      .cancel-btn:hover {
         background: var(--color-danger);
         border-color: var(--color-danger);
         color: white;
      }
      
      .save-btn:active,
      .cancel-btn:active {
         transform: scale(0.95);
      }
   }
</style>
