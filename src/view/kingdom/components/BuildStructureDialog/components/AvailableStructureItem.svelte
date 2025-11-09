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
  
  let expanded = true; // Default to expanded for available structures
  
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
    // If locked, only allow deselection
    if (locked) {
      dispatch('select', '');
      return;
    }
    
    // If already selected, deselect
    if (selectedStructureId === structure.id) {
      dispatch('select', '');
    } else {
      dispatch('select', structure.id);
    }
  }
  
  function toggleExpanded(event: MouseEvent) {
    event.stopPropagation(); // Prevent selecting when toggling
    expanded = !expanded;
  }
</script>

<div 
  class="structure-card-with-build {selectedStructureId === structure.id ? 'selected' : ''} {isInBuildQueue ? 'in-progress' : ''} {locked ? 'locked' : ''}"
  class:expanded
  on:click={selectStructure}
>
  <!-- Header Row -->
  <div class="structure-header">
    <h4>{structure.name}</h4>
    <div class="badges">
      <span class="tier-badge">Tier {structure.tier || 1}</span>
      
      {#if locked && !atCapacity}
        <span class="locked-badge">
          <i class="fas fa-lock"></i>
          Locked
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
    </div>
  </div>
  
  <!-- Content Row -->
  {#if expanded}
    <div class="structure-content">
      <StructureCard 
        {structure} 
        tier={structure.tier}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .structure-card-with-build {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.selected {
      border-color: var(--color-amber);
      background: rgba(251, 191, 36, 0.1);
      box-shadow: 0 0 0 0.125rem rgba(251, 191, 36, 0.3);
    }
    
    &.in-progress {
      pointer-events: none;
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-subtle);
    }
    
    &.locked {
      opacity: 0.5;
      background: rgba(255, 255, 255, 0.03);
      border-color: var(--border-subtle);
      filter: grayscale(0.4);
      cursor: pointer; // Allow clicking to deselect
    }
    
    &:hover:not(.selected):not(.in-progress):not(.locked) {
      transform: translateY(-0.125rem);
      border-color: var(--border-strong);
    }
  }
  
  .structure-header {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    padding: var(--space-16);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--border-subtle);
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      flex: 1;
    }
    
    .badges {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      .tier-badge,
      .locked-badge,
      .capacity-badge,
      .in-progress-badge,
      .build-queue {
        font-size: var(--font-xs);
        font-weight: var(--font-weight-semibold);
        padding: var(--space-4) var(--space-8);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        gap: var(--space-6);
        white-space: nowrap;
        
        i {
          font-size: var(--font-xs);
        }
      }
      
      .tier-badge {
        color: var(--text-secondary);
        background: rgba(251, 191, 36, 0.1);
      }
      
      .locked-badge {
        color: var(--text-tertiary);
        background: rgba(255, 255, 255, 0.05);
      }
      
      .capacity-badge {
        color: var(--warning-text);
        background: rgba(255, 191, 0, 0.1);
        border-color: rgba(255, 191, 0, 0.3);
      }
      
      .in-progress-badge {
        color: var(--info-text);
        background: var(--info-background);
        border-color: var(--info-border);
      }
      
      .build-queue {
        color: var(--color-amber);
        background: rgba(251, 191, 36, 0.05);
      }
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
</style>
