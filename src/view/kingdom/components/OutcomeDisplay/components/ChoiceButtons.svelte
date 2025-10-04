<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let choices: any[] | undefined = undefined;
  export let selectedChoice: number | null = null;
  export let choicesResolved: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  $: hasChoices = choices && choices.length > 0;
  
  function handleChoiceSelect(index: number) {
    dispatch('select', { index });
  }
</script>

{#if hasChoices && !choicesResolved && choices}
  <div class="choice-buttons">
    <div class="choice-buttons-header">Choose one:</div>
    <div class="choice-buttons-list">
      {#each choices as choice, index}
        <button
          class="choice-button {selectedChoice === index ? 'selected' : ''}"
          on:click={() => handleChoiceSelect(index)}
        >
          {choice.label}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .choice-buttons {
    margin-top: 10px;
    
    .choice-buttons-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: 10px;
    }
    
    .choice-buttons-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .choice-button {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--border-strong);
        transform: translateY(-1px);
      }
      
      &.selected {
        background: rgba(59, 130, 246, 0.2);
        border-color: var(--color-blue);
        color: var(--color-blue);
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
      }
      
      &:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
      }
    }
  }
</style>
