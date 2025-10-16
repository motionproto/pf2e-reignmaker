<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StructureCard from '../../structures/StructureCard.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  
  export let structure: Structure;
  export let locked: boolean = false;
  export let selectedStructureId: string;
  export let successMessage: string;
  export let selectedSettlement: any;
  export let atCapacity: boolean = false;
  
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

<div 
  class="structure-card-with-build {selectedStructureId === structure.id ? 'selected' : ''} {isInBuildQueue ? 'in-progress' : ''} {locked ? 'locked' : ''}"
  on:click={locked ? undefined : selectStructure}
>
  <!-- Header Row (spans full width) -->
  <div class="structure-header">
    <h4>{structure.name}</h4>
    <span class="tier-badge">Tier {structure.tier || 1}</span>
  </div>
  
  <!-- Content Row (two columns) -->
  <div class="structure-content">
    <StructureCard 
      {structure} 
      tier={structure.tier}
    />
  </div>
  
  <!-- Actions Column -->
  <div class="actions-column">
    {#if locked && !atCapacity}
      <span class="locked-badge">
        <i class="fas fa-lock"></i>
        Tier {structure.tier || 1}
      </span>
    {:else if atCapacity && !isInBuildQueue}
      <span class="capacity-badge">
        <i class="fas fa-exclamation-triangle"></i>
        At Capacity
      </span>
    {:else if isInBuildQueue}
      <span class="in-progress-badge">
        In Progress
      </span>
    {:else if !structureCanAfford}
      <span class="build-queue">
        <i class="fas fa-hourglass-half"></i>
        Queue
      </span>
    {/if}
    
    {#if !isInBuildQueue && (!locked || atCapacity)}
      <div class="button-group">
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
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .structure-card-with-build {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto 1fr;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.selected {
      border-color: var(--color-amber);
      background: rgba(251, 191, 36, 0.1);
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
    }
    
    &.in-progress {
      pointer-events: none;
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-subtle);
    }
    
    &.locked {
      opacity: 0.5;
      pointer-events: none;
      background: rgba(255, 255, 255, 0.03);
      border-color: var(--border-subtle);
      filter: grayscale(0.4);
    }
    
    &:hover:not(.selected):not(.in-progress):not(.locked) {
      transform: translateY(-2px);
      border-color: var(--border-strong);
    }
  }
  
  .structure-header {
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-subtle);
    
    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      flex: 1;
    }
    
    .tier-badge {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      background: rgba(251, 191, 36, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }
  }
  
  .structure-content {
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
  
  .actions-column {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
    padding: 1rem;
    min-width: 140px;
    gap: 0.5rem;
    
    .button-group {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
    }
    
    .in-progress-badge,
    .locked-badge,
    .capacity-badge,
    .build-queue {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: var(--font-xs);
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      text-align: center;
      margin-top: auto;
      
      i {
        font-size: var(--font-xs);
      }
    }
    
    .in-progress-badge {
      color: var(--info-text);
      background: var(--info-background);
      border: 1px solid var(--info-border);
    }
    
    .locked-badge {
      color: var(--text-tertiary);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
    }
    
    .capacity-badge {
      color: var(--warning-text);
      background: rgba(255, 191, 0, 0.1);
      border: 1px solid rgba(255, 191, 0, 0.3);
    }
    
    .build-queue {
      color: var(--color-amber);
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
      text-align: center;
      flex: 1;
      
      &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: var(--border-strong);
        color: var(--text-primary);
      }
    }
    
    .card-build-button {
      padding: 0.75rem 1rem;
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
      justify-content: center;
      gap: 0.5rem;
      flex: 1;
      
      i {
        font-size: var(--font-sm);
      }
      
      &:hover:not(:disabled) {
        background: var(--color-amber-light);
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
</style>
