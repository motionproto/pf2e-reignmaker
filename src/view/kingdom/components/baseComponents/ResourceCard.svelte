<script lang="ts">
   import { tick } from 'svelte';
   import { getKingdomActor } from '../../../../stores/KingdomStore';
   import { activeEditingCard } from '../../../../stores/EditingStore';
   import FloatingNumber from '../FloatingNumber.svelte';
   import { getUnrestIconAndColor } from '../../../../services/domain/unrest/UnrestService';
   import type { KingdomData } from '../../../../actors/KingdomActor';
   
   // Props
   export let resource: string;
   export let value: number;
   export let icon: string;
   export let color: string;
   export let size: 'normal' | 'compact' | 'fill' = 'normal';
   export let editable: boolean = true;
   export let onChange: ((newValue: number) => void) | null = null;
   export let tooltip: string | undefined = undefined;
   
   // Generate unique card ID
   const cardId = `resource-${resource}-${Math.random().toString(36).substr(2, 9)}`;
   
   // Dynamic icon/color for unrest based on level
   $: isUnrestResource = resource === 'unrest';
   $: dynamicIconAndColor = isUnrestResource ? getUnrestIconAndColor(value) : { icon, color };
   $: displayIcon = dynamicIconAndColor.icon;
   $: displayColor = dynamicIconAndColor.color;
   
   // Animation tracking
   let previousValue: number | undefined = undefined;
   let showAnimation = false;
   let animationDelta = 0;
   
   // Reactive: detect value changes (skip initial render)
   $: {
      if (previousValue !== undefined && value !== previousValue && !isEditing) {
         animationDelta = value - previousValue;
         showAnimation = true;

         // Auto-hide after animation completes (4.6s)
         setTimeout(() => {
            showAnimation = false;
         }, 4600);
      }
      previousValue = value;
   }
   
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
            actor.updateKingdomData((kingdom: KingdomData) => {
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
   class:fill={size === 'fill'}
   class:editable
   class:has-tooltip={!editable && tooltip}
   style="--resource-color: {color};"
   on:click={startEditing}
>
   {#if tooltip && !editable}
      <div class="tooltip">{tooltip}</div>
   {/if}
   <!-- Floating animation overlay -->
   {#if showAnimation}
      <div class="animation-overlay">
         <FloatingNumber 
            animationId={`${resource}-${Date.now()}`}
            resource={resource}
            delta={animationDelta}
            startX={0}
            startY={0}
         />
      </div>
   {/if}
   
   <i class="fas {displayIcon} resource-icon" style="color: {displayColor};"></i>
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
               on:mousedown|preventDefault|stopPropagation={saveEdit} 
               aria-label="Save"
               title="Save"
            >
               <i class="fas fa-check"></i>
            </button>
            <button 
               class="cancel-btn" 
               on:mousedown|preventDefault|stopPropagation={cancelEdit} 
               aria-label="Cancel"
               title="Cancel"
            >
               <i class="fas fa-times"></i>
            </button>
         </div>
      {:else}
         <div class="resource-value">{value}</div>
         <div class="resource-label">
            {#if size === 'fill'}
               {resource} / turn
            {:else}
               {resource}
            {/if}
         </div>
      {/if}
   </div>
</div>

<style lang="scss">
   .resource-card {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      background: rgba(0, 0, 0, 0.2);
      padding: var(--space-12);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      outline: 2px solid transparent;
      outline-offset: 0.125rem;
      transition: all 0.2s ease;
      position: relative;
      flex: 0 0 auto;
      overflow: visible; /* Allow animations to escape card bounds */
      
      &.editable {
         cursor: pointer;
      }
      
      &.editable:hover:not(.editing) {
         outline-color: var(--resource-color);
         background: rgba(0, 0, 0, 0.3);
      }
      
      &.has-tooltip:hover {
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
         .resource-icon {
            font-size: var(--font-2xl);
         }
         
         .resource-info {
            min-width: 5rem;
            align-items: flex-start;
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
            width: 5rem;
            font-size: var(--font-xl);
         }
      }
      
      /* Compact size (for KingdomStats) */
      &.compact {
         padding: var(--space-8);
         gap: var(--space-8);
         max-width: 100%;
         min-width: 0;
         
         .resource-icon {
            font-size: var(--font-xl);
            flex-shrink: 0;
         }
         
         .resource-info {
            min-width: 0;
            flex: 1;
            align-items: center;
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
      
      /* Fill size (for containers like SetupTab worksite cards) */
      &.fill {
         width: 100%;
         height: 100%;
         flex: 1;
         border-radius: 0 0 var(--radius-xl) var(--radius-xl); /* Sharp top corners, rounded bottom to match parent */
         border-top: none; /* Remove top border to blend with parent */
         padding: var(--space-16);
         gap: var(--space-12);
         
         .resource-icon {
            font-size: var(--font-4xl);
            flex-shrink: 0;
         }
         
         .resource-info {
            min-width: 0;
            flex: 1;
            align-items: center;
            justify-content: center;
         }
         
         .resource-value {
            font-size: var(--font-3xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
         }
         
         .resource-label {
            font-size: var(--font-sm);
            color: var(--text-tertiary);
            text-transform: capitalize;
         }
         
         .resource-edit-input {
            width: 100%;
            font-size: var(--font-2xl);
         }
      }
      
      .resource-info {
         display: flex;
         flex-direction: column;
      }
      
      .resource-edit-input {
         padding: var(--space-4) var(--space-8);
         border: 2px solid var(--resource-color);
         border-radius: var(--radius-md);
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
         gap: var(--space-4);
         margin-top: var(--space-4);
      }
      
      .save-btn,
      .cancel-btn {
         flex: 1;
         padding: var(--space-4);
         border: 1px solid var(--border-subtle);
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
   
   .animation-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1000;
   }
   
   .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-0.5rem);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: var(--space-6) var(--space-12);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 1001;
      
      &::after {
         content: '';
         position: absolute;
         top: 100%;
         left: 50%;
         transform: translateX(-50%);
         border: 4px solid transparent;
         border-top-color: rgba(0, 0, 0, 0.9);
      }
   }
   
   .resource-card.has-tooltip:hover .tooltip {
      opacity: 1;
   }
</style>
