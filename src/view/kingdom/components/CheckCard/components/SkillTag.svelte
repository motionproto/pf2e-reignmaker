<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let skill: string;
   export let description: string = '';
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
   <span class="skill-label">{skill}</span>
   {#if description}
      <span class="skill-divider">·</span>
      <span class="skill-description">{description}</span>
   {/if}
</button>

<style lang="scss">
   .skill-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
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
      backdrop-filter: blur(4px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      
      .skill-label {
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
      }
      
      .skill-divider {
         color: var(--text-tertiary);
         opacity: 0.5;
         margin: 0 2px;
      }
      
      .skill-description {
         color: var(--text-secondary);
         opacity: 0.8;
      }
      
      &:hover:not(.disabled):not(.selected) {
         transform: translateY(-1px);
         border-color: var(--border-strong);
         background:   var(--btn-secondary-hover);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
         
         .skill-label {
            color: white;
         }
      }
      
      &.selected {
         background: var(--color-gray-900);
         border-color: var(--color-gray-400);
         box-shadow: 0 2px 8px hsla(0, 0%, 46%, 0.3);
         
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
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
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
      
      &.loading {
         opacity: 0.7;
         cursor: wait;
         
         .fa-spin {
            animation: spin 1s linear infinite;
            margin-right: 4px;
         }
      }
      
      &.faded {
         opacity: 0.3;
         
         &:hover {
            transform: none;
            background: rgba(255, 255, 255, 0.05);
         }
      }
   }
   
   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }
</style>
