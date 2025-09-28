<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let disabled: boolean = false;
   export let type: 'button' | 'submit' | 'reset' = 'button';
   export let variant: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning' = 'primary';
   export let ariaLabel: string | undefined = undefined;
   export let tooltip: string | undefined = undefined;
   export let icon: string | undefined = undefined;
   export let iconPosition: 'left' | 'right' = 'left';
   
   const dispatch = createEventDispatcher();
   
   function handleClick(event: MouseEvent) {
      if (!disabled) {
         dispatch('click', event);
      }
   }
</script>

<button 
   {type}
   class="button {variant}"
   {disabled}
   aria-label={ariaLabel}
   data-tooltip={tooltip}
   on:click={handleClick}
>
   {#if icon && iconPosition === 'left'}
      <i class={icon}></i>
   {/if}
   <slot />
   {#if icon && iconPosition === 'right'}
      <i class={icon}></i>
   {/if}
</button>

<style lang="scss">
   .button {
      padding: 10px 16px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.025em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all var(--transition-fast);
      position: relative;
      overflow: hidden;
      
      // Shimmer effect
      &::before {
         content: '';
         position: absolute;
         top: 0;
         left: -100%;
         width: 100%;
         height: 100%;
         transition: left 0.5s ease;
      }
      
      &:hover::before {
         left: 100%;
      }
      
      &:hover:not(:disabled) {
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:active:not(:disabled) {
         transform: translateY(0);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         
         &::before {
            display: none;
         }
      }
      
      // Primary variant (default)
      &.primary {
         background: var(--btn-primary-bg);
         color: var(--btn-primary-color);
         border: 1px solid var(--btn-primary-border);
         
         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }
         
         &:hover:not(:disabled) {
            background: var(--btn-primary-hover);
            border-color: var(--btn-primary-border-hover);
         }
         
         &:active:not(:disabled) {
            box-shadow: var(--shadow-sm);
         }
         
         &:disabled {
            background: var(--color-gray-700);
            border-color: var(--border-subtle);
            color: var(--text-tertiary);
         }
      }
      
      // Secondary variant
      &.secondary {
         background: var(--btn-secondary-bg);
         color: var(--text-primary);
         border: 1px solid var(--border-medium);
         
         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.1),
               transparent);
         }
         
         &:hover:not(:disabled) {
            background: var(--btn-secondary-hover);
            border-color: var(--border-strong);
         }
         
         &:disabled {
            background: var(--color-gray-700);
            border-color: var(--border-subtle);
            color: var(--text-tertiary);
         }
      }
      
      // Outline variant
      &.outline {
         background: transparent;
         color: var(--text-primary);
         border: 1px solid var(--border-medium);
         
         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.1),
               transparent);
         }
         
         &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--border-strong);
         }
         
         &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.08);
         }
         
         &:disabled {
            background: transparent;
            border-color: var(--border-subtle);
            color: var(--text-tertiary);
         }
      }
      
      // Success variant
      &.success {
         background: var(--color-green);
         border: 1px solid var(--color-green-dark);
         color: var(--color-white);
         
         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }
         
         &:hover:not(:disabled) {
            background: var(--color-green-dark);
            border-color: var(--color-green-darker);
         }
         
         &:disabled {
            background: var(--color-gray-700);
            border-color: var(--border-subtle);
            color: var(--text-tertiary);
         }
      }
      
      // Danger variant
      &.danger {
         background: var(--color-red);
         border: 1px solid var(--color-red-dark);
         color: var(--color-white);
         
         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }
         
         &:hover:not(:disabled) {
            background: var(--color-red-dark);
            border-color: var(--color-red-darker);
         }
         
         &:disabled {
            background: var(--color-gray-700);
            border-color: var(--border-subtle);
            color: var(--text-tertiary);
         }
      }
      
      // Warning variant
      &.warning {
         background: var(--color-amber);
         border: 1px solid var(--color-amber-dark);
         color: var(--color-dark);
         
         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }
         
         &:hover:not(:disabled) {
            background: var(--color-amber-dark);
            border-color: var(--color-amber-darker);
         }
         
         &:disabled {
            background: var(--color-gray-700);
            border-color: var(--border-subtle);
            color: var(--text-tertiary);
         }
      }
      
   :global(i) {
      font-size: 1em;
      
      &.spinning {
         animation: spin 1s linear infinite;
      }
   }
   
   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }
      
      // Support for slotted content with special styles
      :global(.badge), :global(.count), :global(.fame-count) {
         font-size: var(--font-sm);
         opacity: 0.9;
         padding: 2px 6px;
         background: rgba(0, 0, 0, 0.2);
         border-radius: var(--radius-sm);
         margin-left: 4px;
      }
   }
</style>
