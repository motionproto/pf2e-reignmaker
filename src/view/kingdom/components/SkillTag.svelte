<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let skill: string;
   export let description: string = '';
   export let selected: boolean = false;
   export let disabled: boolean = false;
   
   const dispatch = createEventDispatcher();
   
   function handleClick() {
      if (!disabled) {
         dispatch('select', { skill });
      }
   }
</script>

<button 
   class="skill-tag {selected ? 'selected' : ''} {disabled && !selected ? 'disabled' : ''}"
   on:click={handleClick}
   {disabled}
   type="button"
>
   <span class="skill-label">{skill}</span>
   {#if description}
      <span class="skill-divider">·</span>
      <span class="skill-description">{description}</span>
   {/if}
</button>

<style lang="scss">
   .skill-tag {
      display: inline-flex;
      align-items: center; // Center vertically
      gap: 6px;
      padding: 10px 16px; // Even vertical padding
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm); // Standard button radius
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      font-size: var(--font-md);
      line-height: 1; // Consistent line height
      
      // Remove button defaults
      font-family: inherit;
      text-align: left;
      
      // Secondary button style
      backdrop-filter: blur(4px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.08);
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
      
      &:active:not(:disabled) {
         transform: translateY(0);
         background: rgba(255, 255, 255, 0.03);
      }
      
      &.selected {
         background: linear-gradient(135deg, 
            rgba(251, 191, 36, 0.15),
            rgba(251, 191, 36, 0.1));
         border-color: var(--color-amber);
         box-shadow: 0 1px 4px rgba(251, 191, 36, 0.2);
         
         .skill-label {
            color: var(--color-amber-light);
         }
         
         &:hover {
            background: linear-gradient(135deg, 
               rgba(251, 191, 36, 0.2),
               rgba(251, 191, 36, 0.15));
         }
      }
      
      &.disabled {
         opacity: 0.4;
         cursor: not-allowed;
         
         &:hover {
            transform: none;
            border-color: var(--border-strong);
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
         }
      }
   }
   
   .skill-label {
      font-weight: 600;
      color: var(--text-primary);
      text-transform: capitalize;
      line-height: 1;
   }
   
   .skill-divider {
      color: var(--text-tertiary);
      opacity: 0.5;
      font-weight: 300;
      line-height: 1;
   }
   
   .skill-description {
      color: var(--text-tertiary);
      font-size: var(--font-md);
      line-height: 1;
   }
</style>
