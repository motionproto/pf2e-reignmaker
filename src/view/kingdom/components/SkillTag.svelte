<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import { performKingdomSkillCheck } from '../../../api/foundry-actors';
   
   export let skill: string;
   export let description: string = '';
   export let selected: boolean = false;
   export let disabled: boolean = false;
   export let loading: boolean = false;
   export let faded: boolean = false;
   
   // New props for handling different check types
   export let checkType: 'action' | 'incident' | 'event' | null = null;
   export let checkName: string = '';
   export let checkId: string = '';
   export let checkEffects: any = null;
   export let onRollComplete: ((outcome: string) => void) | null = null;
   
   const dispatch = createEventDispatcher();
   
   // Internal loading state for direct skill checks
   let internalLoading = false;
   
   // Use external loading prop if provided, otherwise use internal state
   $: isLoading = loading || internalLoading;
   
   async function handleClick() {
      if (!disabled && !isLoading) {
         // For actions, only dispatch the execute event - let the parent handle the roll
         // This prevents double-rolling
         if (checkType === 'action') {
            dispatch('execute', { skill });
            return;
         }
         
         // For other types (incident, event), handle the roll directly
         dispatch('execute', { skill });
         
         // If this is configured for direct skill checks (non-action types)
         if (checkType && checkName && checkId) {
            internalLoading = true;
            
            try {
               // Perform the skill check directly for non-action types
               const result = await performKingdomSkillCheck(
                  skill,
                  checkType,
                  checkName,
                  checkId,
                  checkEffects
               );
               
               // If we have a callback, call it with the result
               if (onRollComplete && result) {
                  onRollComplete(result);
               }
               
               // Dispatch rollComplete event with the result
               dispatch('rollComplete', { skill, result });
            } catch (error) {
               console.error('Failed to perform skill check:', error);
               dispatch('rollError', { skill, error });
            } finally {
               internalLoading = false;
            }
         }
      }
   }
</script>

<button 
   class="skill-tag {selected ? 'selected' : ''} {disabled && !selected ? 'disabled' : ''} {isLoading ? 'loading' : ''} {faded ? 'faded' : ''}"
   on:click={handleClick}
   disabled={disabled || isLoading}
   type="button"
>
   {#if isLoading}
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
         font-weight: 500;
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
         background: rgba(255, 255, 255, 0.08);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
         
         .skill-label {
            color: var(--color-amber-light);
         }
      }
      
      &.selected {
         background: var(--color-amber);
         border-color: var(--color-amber);
         box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
         
         .skill-label {
            color: var(--color-black);
            font-weight: 600;
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
