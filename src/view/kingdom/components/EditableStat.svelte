<script lang="ts">
   import { tick } from 'svelte';
   
   export let value: number = 0;
   export let onChange: (newValue: number) => void;
   export let className: string = '';
   export let min: number = 0;
   export let max: number | undefined = undefined;
   
   let isEditing = false;
   let editValue = value;
   let inputElement: HTMLInputElement;
   
   // Update edit value when prop changes
   $: if (!isEditing) {
      editValue = value;
   }
   
   async function startEditing() {
      editValue = value;
      isEditing = true;
      await tick();
      inputElement?.focus();
      inputElement?.select();
   }
   
   function save() {
      let newValue = Math.floor(editValue);
      newValue = Math.max(min, newValue);
      if (max !== undefined) {
         newValue = Math.min(max, newValue);
      }
      onChange(newValue);
      isEditing = false;
   }
   
   function cancel() {
      editValue = value;
      isEditing = false;
   }
   
   function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
         save();
      } else if (e.key === 'Escape') {
         cancel();
      }
   }
</script>

{#if !isEditing}
   <div class="editable-value-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <span 
         class="stat-value editable {className}" 
         on:click={startEditing}
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
      <button class="save-btn" on:click={save} aria-label="Save">
         <i class="fas fa-check"></i>
      </button>
      <button class="cancel-btn" on:click={cancel} aria-label="Cancel">
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
      font-size: 1rem;
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
   }
   
   .stat-value.editable {
      cursor: pointer;
      padding: 0.125rem 0;
      border-radius: 0.25rem;
      display: inline-flex;
      align-items: center;
      transition: all var(--transition-fast);
   }
   
   .stat-value.editable:hover {
      background: var(--bg-subtle);
      padding: 0.125rem 0.5rem;
   }
   
   .stat-value.editable:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
   }
   
   .edit-icon {
      font-size: 0.75rem;
      display: none;
      color: var(--text-muted);
   }
   
   .stat-value.editable:hover .edit-icon {
      display: inline;
      margin-left: 0.25rem;
   }
   
   .edit-container {
      display: flex;
      align-items: center;
      gap: 0.25rem;
   }
   
   .stat-edit-input {
      width: 80px;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border-primary);
      border-radius: 0.25rem;
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 1rem;
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
      width: 24px;
      height: 24px;
      border: 1px solid var(--border-default);
      background: var(--bg-surface);
      border-radius: 0.25rem;
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
      font-size: 0.75rem;
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
