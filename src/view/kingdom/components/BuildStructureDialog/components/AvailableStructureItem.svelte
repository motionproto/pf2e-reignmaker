<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StructureCard from '../../structures/StructureCard.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import { generateEffectMessages } from '../../../../../models/Structure';
  import { getResourceIcon, getResourceColor } from '../../../utils/presentation';
  
  export let structure: Structure;
  export let locked: boolean = false;
  export let selectedStructureId: string;
  export let selectedSettlement: any;
  export let atCapacity: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Generate effect messages for benefits
  $: effectMessages = generateEffectMessages(structure);
  
  // Check if structure is in build queue for this settlement
  $: isInBuildQueue = $kingdomData.buildQueue?.some(project => 
    project.structureId === structure.id && 
    project.settlementName === selectedSettlement?.name
  ) || false;
  
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
</script>

<div 
  class="structure-card-with-build {selectedStructureId === structure.id ? 'selected' : ''} {isInBuildQueue ? 'in-progress' : ''} {locked ? 'locked' : ''}"
  on:click={selectStructure}
>
  <!-- Header Row -->
  <div class="structure-header">
    <div class="header-left">
      <h4>{structure.name}</h4>
    </div>
    
    <div class="badges">
      <!-- Cost display -->
      <div class="cost-display">
        <span class="cost-label">Cost:</span>
        {#each Object.entries(structure.constructionCost || {}) as [resource, amount]}
          {#if amount && amount > 0}
            <div class="cost-item">
              <i class="fas {getResourceIcon(resource)}" style="color: {getResourceColor(resource)}"></i>
              <span>{amount}</span>
            </div>
          {/if}
        {/each}
        {#if !structure.constructionCost || Object.values(structure.constructionCost).every(v => !v || v === 0)}
          <span class="free-badge">Free</span>
        {/if}
      </div>
      
      <span class="tier-badge">Tier {structure.tier || 1}</span>
      
      {#if atCapacity && !isInBuildQueue}
        <span class="capacity-badge">
          <i class="fas fa-exclamation-triangle"></i>
          At Capacity
        </span>
      {:else if isInBuildQueue}
        <span class="in-progress-badge">
          In Progress
        </span>
      {/if}
    </div>
  </div>
  
  <!-- Content Row -->
  <div class="structure-content">
    <StructureCard 
      {structure} 
      tier={structure.tier}
    />
  </div>
</div>

<style lang="scss">
  .structure-card-with-build {
    display: flex;
    flex-direction: column;
    background: var(--surface-low);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.selected {
      border-color: var(--color-amber);
      background: var(--surface-accent-low);
      box-shadow: 0 0 0 0.125rem var(--surface-accent-higher);
    }
    
    &.in-progress {
      pointer-events: none;
      background: var(--hover-low);
      border-color: var(--border-faint);
    }
    
    &.locked {
      opacity: 0.5;
      background: var(--surface-lowest);
      border-color: var(--border-faint);
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
    align-items: flex-start;
    gap: var(--space-12);
    padding: var(--space-16);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--border-faint);
    transition: background 0.2s ease;
    
    .header-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }
    
    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-family: var(--font-sans-rm);
      font-weight: var(--font-weight-semibold);
    }
    
    .badges {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      .cost-display {
        display: flex;
        gap: var(--space-8);
        flex-wrap: wrap;
        align-items: center;
        margin-right: var(--space-16);
        
        .cost-label {
          font-size: var(--font-md);
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
        }
        
        .cost-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          font-size: var(--font-md);
          color: var(--text-primary);
          
          i {
            font-size: var(--font-md);
          }
        }
        
        .free-badge {
          font-size: var(--font-md);
          color: var(--text-secondary);
        }
      }
      
      .tier-badge,
      .capacity-badge,
      .in-progress-badge {
        font-size: var(--font-md);
        font-weight: var(--font-weight-semibold);
        padding: var(--space-4) var(--space-8);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-medium);
        display: flex;
        align-items: center;
        gap: var(--space-6);
        white-space: nowrap;
        
        i {
          font-size: var(--font-md);
        }
      }
      
      .tier-badge {
        color: var(--text-secondary);
        background: var(--surface-high);
        
      }
      
      .capacity-badge {
        color: var(--text-secondary);
        background: var(--surface-high);
      }
      
      .in-progress-badge {
        color: var(--text-success);
        background: var(--surface-success-low);
        border-color: var(--border-success-medium);
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
    
    :global(.structure-card-cost) {
      display: none;
    }
  }
  
  // Disable hover effects on nested StructureCard when locked or in-progress
  .structure-card-with-build.locked .structure-content :global(.structure-card:hover),
  .structure-card-with-build.in-progress .structure-content :global(.structure-card:hover) {
    box-shadow: none;
    background: transparent;
  }
</style>
