<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let skill: string;
   export let description: string = '';
   export let bonus: number | null = null;
   export let selected: boolean = false;
   export let disabled: boolean = false;
   export let loading: boolean = false;
   export let faded: boolean = false;
   
   const dispatch = createEventDispatcher();
   
   // Simple UI component - just dispatches events
   function handleClick() {
      if (!disabled && !loading) {
         dispatch('execute', { skill });
      }
   }
</script>

<button
   class="skill-tag {selected ? 'selected' : ''} {disabled && !selected ? 'disabled' : ''} {loading ? 'loading' : ''} {faded ? 'faded' : ''}"
   on:click={handleClick}
   disabled={disabled || loading}
   type="button"
>
   {#if loading}
      <i class="fas fa-dice-d20 fa-spin"></i>
   {/if}
   <span class="skill-label">
      {skill}
      {#if bonus !== null}
         <span class="skill-bonus">({bonus >= 0 ? '+' : ''}{bonus})</span>
      {/if}
   </span>
   {#if description}
      <span class="skill-divider">·</span>
      <span class="skill-description">{description}</span>
   {/if}
</button>

<style lang="scss">
   .skill-tag {
      display: inline-flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-10) var(--space-16);
      background: var(--hover-low);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      font-size: var(--font-md);
      line-height: 1;
      position: relative;
      
      // Remove button defaults
      font-family: inherit;
      text-align: left;
      
      // Secondary button style
      backdrop-filter: blur(0.25rem);
      box-shadow: 0 0.0625rem 0.125rem var(--overlay-lower);
      
      .skill-label {
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
         display: flex;
         align-items: center;
         gap: var(--space-4);
      }
      
      .skill-bonus {
         color: var(--text-secondary);
         font-size: var(--font-sm);
         opacity: 0.8;
      }
      
      .skill-divider {
         color: var(--text-tertiary);
         opacity: 0.5;
         margin: 0 var(--space-2);
      }
      
      .skill-description {
         color: var(--text-secondary);
         opacity: 0.8;
      }
      
      &:hover:not(.disabled):not(.selected) {
         transform: translateY(-0.0625rem);
         border-color: var(--border-strong);
         background: var(--btn-secondary-hover);
         box-shadow: 0 0.125rem 0.375rem rgba(0, 0, 0, 0.15);
         
         .skill-label {
            color: white;
         }
      }
      
      &.selected {
         background: var(--color-gray-900);
         border-color: var(--color-gray-400);
       
         
         .skill-label {
            color: var(--color-black);
            font-weight: var(--font-weight-semibold);
         }
         
         .skill-description,
         .skill-divider {
            color: var(--color-black);
            opacity: 0.7;
         }
         
         &:hover {
            transform: translateY(-0.0625rem);
            box-shadow: 0 0.25rem 0.75rem rgba(251, 191, 36, 0.4);
         }
      }
      
      &.disabled {
         opacity: 0.4;
         cursor: not-allowed;
         
         &:hover {
            transform: none;
            border-color: var(--border-strong);
            background: var(--hover-low);
            box-shadow: 0 0.0625rem 0.125rem var(--overlay-lower);
         }
      }
      
      &.loading {
         opacity: 0.7;
         cursor: wait;
         
         .fa-spin {
            color: var(--text-primary);
            animation: spin 1s linear infinite;
            margin-right: var(--space-4);
         }
         
         .skill-label {
            color: var(--color-gray-200);
         }
         
         .skill-description {
            color: var(--color-gray-400);
         }
         
         .skill-divider {
            color: var(--color-gray-400);
         }
      }
      
      &.faded {
         opacity: 0.3;
         
         &:hover {
            transform: none;
            background: var(--hover-low);
         }
      }
   }
   
   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }
</style>
