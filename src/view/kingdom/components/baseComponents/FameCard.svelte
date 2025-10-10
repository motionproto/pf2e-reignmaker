<script lang="ts">
   import { tick } from 'svelte';
   import { activeEditingCard } from '../../../../stores/EditingStore';
   
   // Props
   export let value: number;
   export let icon: string = 'fa-star';
   export let color: string = 'var(--color-amber)';
   export let size: 'normal' | 'compact' = 'normal';
   export let editable: boolean = true;
   export let minValue: number = 0;
   export let maxValue: number = 3;
   export let onChange: ((newValue: number) => void) | null = null;
   
   // Generate unique card ID
   const cardId = `fame-${Math.random().toString(36).substr(2, 9)}`;
   
   // Reactive isEditing based on activeEditingCard store
   $: isEditing = $activeEditingCard === cardId;
   
   async function startEditing() {
      if (!editable) return;
      activeEditingCard.set(cardId);
   }
   
   function adjustValue(delta: number) {
      const newValue = Math.max(minValue, Math.min(maxValue, value + delta));
      if (onChange && newValue !== value) {
         onChange(newValue);
      }
   }
   
   function stopEditing() {
      activeEditingCard.set(null);
   }
   
   function handleBlur(e: FocusEvent) {
      // Only stop editing if focus is leaving the card entirely
      const relatedTarget = e.relatedTarget as HTMLElement;
      const currentCard = (e.currentTarget as HTMLElement).closest('.fame-card');
      
      // Check if the new focus is still within this card
      if (!relatedTarget || !currentCard?.contains(relatedTarget)) {
         stopEditing();
      }
   }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
   class="fame-card" 
   class:editing={isEditing}
   class:compact={size === 'compact'}
   class:editable
   style="--resource-color: {color};"
   on:click={startEditing}
   on:blur={handleBlur}
>
   <i class="fas {icon} fame-icon" style="color: {color};"></i>
   <div class="fame-info">
      {#if isEditing}
         <div class="fame-value-display">{value}</div>
         <div class="edit-buttons">
            <button 
               class="adjust-btn minus-btn" 
               on:click|stopPropagation={() => adjustValue(-1)}
               disabled={value <= minValue}
               aria-label="Decrease"
               title="Decrease"
            >
               <i class="fas fa-minus"></i>
            </button>
            <button 
               class="adjust-btn plus-btn" 
               on:click|stopPropagation={() => adjustValue(1)}
               disabled={value >= maxValue}
               aria-label="Increase"
               title="Increase"
            >
               <i class="fas fa-plus"></i>
            </button>
         </div>
      {:else}
         <div class="fame-value">{value}</div>
         <div class="fame-label">Fame</div>
      {/if}
   </div>
</div>

<style lang="scss">
   .fame-card {
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
      
      /* Normal size */
      &:not(.compact) {
         max-width: 112px;
         
         .fame-icon {
            font-size: 1.5rem;
         }
         
         .fame-info {
            min-width: 80px;
         }
         
         .fame-value,
         .fame-value-display {
            font-size: var(--font-2xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
         }
         
         .fame-label {
            font-size: var(--font-sm);
            color: var(--text-tertiary);
            text-transform: capitalize;
         }
      }
      
      /* Compact size */
      &.compact {
         padding: 0.5rem;
         gap: 0.5rem;
         max-width: 100%;
         min-width: 0;
         
         .fame-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
         }
         
         .fame-info {
            min-width: 0;
            flex: 1;
         }
         
         .fame-value,
         .fame-value-display {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
         }
         
         .fame-label {
            font-size: var(--font-xs);
            color: var(--text-tertiary);
            text-transform: capitalize;
         }
      }
      
      .fame-info {
         display: flex;
         flex-direction: column;
         align-items: center;
      }
      
      .fame-value-display {
         margin-bottom: 0.25rem;
         text-align: center;
      }
      
      .edit-buttons {
         display: flex;
         gap: 0.25rem;
         margin-bottom: 0.25rem;
      }
      
      .adjust-btn {
         flex: 1;
         padding: 0.25rem 0.5rem;
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
         min-width: 32px;
         
         i {
            font-size: 0.75rem;
         }
         
         &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
         }
      }
      
      .minus-btn:hover:not(:disabled) {
         background: var(--color-danger);
         border-color: var(--color-danger);
         color: white;
      }
      
      .plus-btn:hover:not(:disabled) {
         background: var(--color-success);
         border-color: var(--color-success);
         color: white;
      }
      
      .adjust-btn:active:not(:disabled) {
         transform: scale(0.95);
      }
   }
</style>
