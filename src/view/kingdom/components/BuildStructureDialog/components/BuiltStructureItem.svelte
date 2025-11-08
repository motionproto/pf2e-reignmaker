<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Structure } from '../../../../../models/Structure';
  import StructureCard from '../../structures/StructureCard.svelte';
  
  export let structure: Structure;
  
  const dispatch = createEventDispatcher();
  
  let expanded = false;
  
  function handleClick() {
    expanded = !expanded;
    // Deselect any selected structure when clicking built structures
    dispatch('select', '');
  }
</script>

<div class="structure-built" class:expanded on:click={handleClick}>
  <div class="structure-built-header">
    <span class="structure-built-name">{structure.name}</span>
    <div class="badges">
      <i class="fas fa-check-circle check-icon"></i>
      <span class="structure-built-tier">Tier {structure.tier || 1}</span>
    </div>
  </div>
  
  {#if expanded}
    <div class="structure-built-content">
      <StructureCard {structure} tier={structure.tier} />
    </div>
  {/if}
</div>

<style lang="scss">
  .structure-built {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    opacity: 0.75;
    
    .structure-built-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      cursor: pointer;
      transition: background 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .structure-built-name {
        flex: 1;
        font-size: var(--font-xl);
        color: var(--text-secondary);
        font-weight: var(--font-weight-semibold);
      }
      
      .badges {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        .check-icon {
          font-size: var(--font-md);
          color: rgba(100, 200, 100, 0.8);
        }
        
        .structure-built-tier {
          font-size: var(--font-size-md);
          font-weight: var(--font-weight-semibold);
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.08);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-default);
        }
      }
    }
    
    .structure-built-content {
      border-top: 1px solid var(--border-subtle);
      
      // Remove the card's own border and header since we're using our own
      :global(.structure-card) {
        border: none;
        border-radius: 0;
        background: transparent;
      }
      
      :global(.structure-card-header) {
        display: none;
      }
    }
  }
</style>
