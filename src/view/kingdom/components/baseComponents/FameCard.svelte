<script lang="ts">
   import { tick, onMount, onDestroy } from 'svelte';
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
   
   // Click-outside handler for closing edit mode
   let cardElement: HTMLDivElement;
   
   function handleClickOutside(event: MouseEvent) {
      if (isEditing && cardElement && !cardElement.contains(event.target as Node)) {
         stopEditing();
      }
   }
   
   onMount(() => {
      document.addEventListener('click', handleClickOutside, true);
   });
   
   onDestroy(() => {
      document.removeEventListener('click', handleClickOutside, true);
   });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
   bind:this={cardElement}
   class="fame-card" 
   class:editing={isEditing}
   class:compact={size === 'compact'}
   class:editable
   style="--resource-color: {color};"
   on:click={startEditing}
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
      gap: var(--space-12);
      background: rgba(0, 0, 0, 0.2);
      padding: var(--space-12);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.1);
      outline: 2px solid transparent;
      outline-offset: 0.125rem;
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
         max-width: 7rem;
         
         .fame-icon {
            font-size: var(--font-2xl);
         }
         
         .fame-info {
            min-width: 5rem;
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
         padding: var(--space-8);
         gap: var(--space-8);
         max-width: 100%;
         min-width: 0;
         
         .fame-icon {
            font-size: var(--font-xl);
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
         margin-bottom: var(--space-4);
         text-align: center;
      }
      
      .edit-buttons {
         display: flex;
         gap: var(--space-4);
         margin-bottom: var(--space-4);
      }
      
      .adjust-btn {
         flex: 1;
         padding: var(--space-4);
         border: 1px solid var(--border-default);
         background: var(--bg-surface);
         border-radius: var(--radius-md);
         display: flex;
         align-items: center;
         justify-content: center;
         cursor: pointer;
         transition: all var(--transition-fast);
         color: var(--text-primary);
         font-size: var(--font-xs);
         
         i {
            font-size: var(--font-xs);
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
