<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StructureCard from '../../structures/StructureCard.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  
  export let structure: Structure;
  export let selectedStructureId: string;
  export let successMessage: string;
  export let selectedSettlement: any;
  
  const dispatch = createEventDispatcher();
  
  // Check if structure is in build queue for this settlement
  $: isInBuildQueue = $kingdomData.buildQueue?.some(project => 
    project.structureId === structure.id && 
    project.settlementName === selectedSettlement?.name
  ) || false;
  
  // Calculate affordability
  $: structureMissing = new Map<string, number>();
  $: available = $kingdomData.resources;
  $: {
    structureMissing.clear();
    for (const [resource, needed] of Object.entries(structure.constructionCost)) {
      if (needed && needed > 0) {
        const avail = available[resource] || 0;
        if (avail < needed) {
          structureMissing.set(resource, needed - avail);
        }
      }
    }
  }
  $: structureCanAfford = structureMissing.size === 0;
  
  function selectStructure() {
    dispatch('select', structure.id);
  }
  
  function buildStructure() {
    dispatch('build', structure.id);
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="structure-card-with-build">
  <div 
    class="structure-card-wrapper {selectedStructureId === structure.id ? 'selected' : ''} {isInBuildQueue ? 'in-progress' : ''}"
    on:click={selectStructure}
  >
    <StructureCard 
      {structure} 
      tier={structure.tier}
    />
  </div>
  
  <!-- Build Button in Card -->
  <div class="card-build-section">
    {#if isInBuildQueue}
      <span class="in-progress-badge">
        In Progress
      </span>
    {:else if !structureCanAfford}
      <span class="build-queue">
        <i class="fas fa-hourglass-half"></i>
        Queue
      </span>
    {/if}
    
    {#if !isInBuildQueue}
      <button 
        class="card-cancel-button"
        on:click={handleCancel}
      >
        Cancel
      </button>
      
      <button 
        class="card-build-button" 
        on:click={buildStructure}
        disabled={!!successMessage}
      >
        <i class="fas fa-hammer"></i>
        Build
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  .structure-card-with-build {
    position: relative;
  }
  
  .structure-card-wrapper {
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    
    &.selected {
      :global(.structure-card) {
        border-color: var(--color-amber);
        background: rgba(251, 191, 36, 0.1);
        box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
      }
    }
    
    &.in-progress {
      opacity: 0.6;
      pointer-events: none;
      
      :global(.structure-card) {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--border-subtle);
      }
    }
    
    &:hover:not(.selected):not(.in-progress) {
      transform: translateY(-2px);
      
      :global(.structure-card) {
        border-color: var(--border-strong);
      }
    }
  }
  
  .card-build-section {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    
    .in-progress-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: var(--font-sm);
      color: var(--info-text);
      background: var(--info-background);
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--info-border);
      
      i {
        font-size: var(--font-sm);
      }
    }
    
    .build-queue {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: var(--font-sm);
      color: var(--color-amber);
      
      i {
        font-size: var(--font-sm);
      }
    }
    
    .card-cancel-button {
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: var(--border-strong);
        color: var(--text-primary);
        transform: translateY(-1px);
      }
    }
    
    .card-build-button {
      padding: 0.5rem 1rem;
      background: var(--color-amber);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-sm);
      color: var(--color-gray-900);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      i {
        font-size: var(--font-sm);
      }
      
      &:hover:not(:disabled) {
        background: var(--color-amber-light);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
</style>
