<script lang="ts">
   import { tick, onMount } from 'svelte';
   
   export let value: number = 0;
   export let onChange: (newValue: number) => void;
   export let className: string = '';
   export let min: number = 0;
   export let max: number | undefined = undefined;
   
   // External control props (optional - for parent-controlled editing)
   export let isExternallyControlled: boolean = false;
   export let isEditing: boolean = false;
   export let onStartEdit: (() => void) | undefined = undefined;
   export let onStopEdit: (() => void) | undefined = undefined;
   
   // Internal state (used when not externally controlled)
   let internalIsEditing = false;
   let editValue = value;
   let inputElement: HTMLInputElement;
   
   // Determine which editing state to use
   $: actualIsEditing = isExternallyControlled ? isEditing : internalIsEditing;
   
   // Update edit value when prop changes
   $: if (!actualIsEditing) {
      editValue = value;
   }
   
   // Watch for external editing state changes to focus input
   $: if (isExternallyControlled && isEditing) {
      handleEditStart();
   }
   
   async function handleEditStart() {
      editValue = value;
      await tick();
      inputElement?.focus();
      inputElement?.select();
   }
   
   async function startEditing() {
      if (isExternallyControlled && onStartEdit) {
         onStartEdit();
      } else {
         editValue = value;
         internalIsEditing = true;
         await tick();
         inputElement?.focus();
         inputElement?.select();
      }
   }
   
   function save() {
      let newValue = Math.floor(editValue);
      newValue = Math.max(min, newValue);
      if (max !== undefined) {
         newValue = Math.min(max, newValue);
      }
      onChange(newValue);
      
      if (isExternallyControlled && onStopEdit) {
         onStopEdit();
      } else {
         internalIsEditing = false;
      }
   }
   
   function cancel() {
      editValue = value;
      if (isExternallyControlled && onStopEdit) {
         onStopEdit();
      } else {
         internalIsEditing = false;
      }
   }
   
   function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
         save();
      } else if (e.key === 'Escape') {
         cancel();
      }
   }
</script>

{#if !actualIsEditing}
   <div class="editable-value-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <span 
         class="stat-value editable {className}" 
         on:click|stopPropagation={startEditing}
         role="button"
         tabindex="0"
         on:keydown={(e) => e.key === 'Enter' && startEditing()}
      >
         {value}
         <i class="fas fa-pen edit-icon"></i>
      </span>
   </div>
{:else}
   <div class="edit-container">
      <input
         bind:this={inputElement}
         type="number"
         bind:value={editValue}
         on:keydown={handleKeydown}
         class="stat-edit-input"
         {min}
         {max}
      />
      <button class="save-btn" on:click|stopPropagation={save} aria-label="Save">
         <i class="fas fa-check"></i>
      </button>
      <button class="cancel-btn" on:click|stopPropagation={cancel} aria-label="Cancel">
         <i class="fas fa-times"></i>
      </button>
   </div>
{/if}

<style>
   .editable-value-container {
      display: flex;
      justify-content: flex-end;
   }
   
   .stat-value {
      font-size: var(--font-md);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
   }
   
   .stat-value.editable {
      cursor: pointer;
      padding: var(--space-2) 0;
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      transition: all var(--transition-fast);
   }
   
   .stat-value.editable:hover {
      background: var(--bg-subtle);
      padding: var(--space-2) var(--space-8);
   }
   
   .stat-value.editable:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 0.1250rem;
   }
   
   .edit-icon {
      font-size: var(--font-xs);
      display: none;
      color: var(--text-muted);
   }
   
   .stat-value.editable:hover .edit-icon {
      display: inline;
      margin-left: var(--space-4);
   }
   
   .edit-container {
      display: flex;
      align-items: center;
      gap: var(--space-4);
   }
   
   .stat-edit-input {
      width: 5.0000rem;
      padding: var(--space-4) var(--space-8);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-bold);
   }
   
   .stat-edit-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--shadow-focus);
   }
   
   /* Remove number input arrows for cleaner look */
   .stat-edit-input::-webkit-inner-spin-button,
   .stat-edit-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
   }
   
   .stat-edit-input[type="number"] {
      -moz-appearance: textfield;
   }
   
   .save-btn,
   .cancel-btn {
      width: 1.5000rem;
      height: 1.5000rem;
      border: 1px solid var(--border-default);
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);
      color: var(--text-primary);
   }
   
   .save-btn:hover {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
      transform: scale(1.05);
   }
   
   .cancel-btn:hover {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: white;
      transform: scale(1.05);
   }
   
   .save-btn:active,
   .cancel-btn:active {
      transform: scale(0.95);
   }
   
   .save-btn i,
   .cancel-btn i {
      font-size: var(--font-xs);
   }
   
   /* Pass-through classes for special styling */
   :global(.stat-value.danger) {
      color: var(--color-danger);
   }
   
   :global(.stat-value.positive) {
      color: var(--color-success);
   }
   
   :global(.stat-value.imprisoned) {
      color: var(--color-gray-500);
   }
</style>
