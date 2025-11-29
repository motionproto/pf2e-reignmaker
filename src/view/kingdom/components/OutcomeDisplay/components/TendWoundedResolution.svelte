<script lang="ts">
  /**
   * TendWoundedResolution - Post-roll interaction component
   * 
   * Allows player to choose between:
   * - Heal to full HP
   * - Remove one negative condition
   * 
   * Only shown on success outcome (critical success auto-applies both)
   * Army data is provided from context (pre-roll selection)
   */

  import { createEventDispatcher, onMount } from 'svelte';
  import type { ActiveCheckInstance } from '../../../models/CheckInstance';

  // Props (automatically passed by OutcomeDisplay)
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();

  let selectedOption: 'heal' | 'remove-condition' = 'heal';
  let selectedCondition: string = '';
  let initialized = false;
  let mounted = false;

  // Get army data from instance metadata (set during pre-roll)
  $: armyName = instance?.metadata?.armyName || 'Army';
  $: currentHP = instance?.metadata?.currentHP || 0;
  $: maxHP = instance?.metadata?.maxHP || 0;
  $: conditions = instance?.metadata?.conditions || [];
  
  // Check if we have saved state from persistence
  $: savedData = instance?.resolutionState?.customComponentData?.['tend-wounded-resolution'];

  // Initialize state (only after component is mounted)
  $: if (instance && mounted && !initialized) {
    initializeState();
  }

  function initializeState() {
    if (initialized) return;
    
    console.log('🩹 [TendWoundedResolution] Initializing state', { 
      savedData, 
      currentHP, 
      maxHP, 
      conditions 
    });

    if (savedData) {
      // Restore persisted state
      selectedOption = savedData.selectedOption;
      selectedCondition = savedData.conditionToRemove || '';
    } else {
      // Default logic: Prefer heal if damaged, else remove condition
      if (currentHP < maxHP) {
        selectedOption = 'heal';
      } else if (conditions.length > 0) {
        selectedOption = 'remove-condition';
        selectedCondition = conditions[0]?.slug || '';
      }
    }
    
    initialized = true;
    dispatchResolution();
  }

  function dispatchResolution() {
    console.log('🩹 [TendWoundedResolution] dispatchResolution called', { selectedOption, selectedCondition });
    
    if (selectedOption === 'heal') {
      console.log('🩹 [TendWoundedResolution] Dispatching heal resolution');
      dispatch('resolution', {
        isResolved: true,
        metadata: {
          selectedOption: 'heal',
          conditionToRemove: undefined
        }
      });
    } else if (selectedOption === 'remove-condition' && selectedCondition) {
      console.log('🩹 [TendWoundedResolution] Dispatching remove-condition resolution');
      dispatch('resolution', {
        isResolved: true,
        metadata: {
          selectedOption: 'remove-condition',
          conditionToRemove: selectedCondition
        }
      });
    } else {
      console.warn('🩹 [TendWoundedResolution] dispatchResolution skipped - invalid state', { selectedOption, selectedCondition });
    }
  }

  function selectHeal() {
    selectedOption = 'heal';
    dispatchResolution();
  }

  function selectCondition(slug: string) {
    selectedOption = 'remove-condition';
    selectedCondition = slug;
    dispatchResolution();
  }
  
  onMount(() => {
    console.log('🩹 [TendWoundedResolution] Mounted');
    mounted = true;
  });
</script>

<div class="tend-wounded-resolution">
    <h3>{armyName} recovers</h3>
    
    <div class="outcome-badges">
      <!-- Heal to Full HP option -->
      {#if currentHP < maxHP}
        <button 
          class="outcome-badge"
          class:static={selectedOption === 'heal'}
          class:variant-positive={selectedOption === 'heal'}
          class:variant-info={selectedOption !== 'heal'}
          on:click={selectHeal}
        >
          <div class="content">
            <i class="fa fa-heart resource-icon"></i>
            <div class="text">Heal to full hit points</div>
          </div>
        </button>
      {/if}
      
      <!-- Each condition as separate badge -->
      {#each conditions as condition}
        <button 
          class="outcome-badge"
          class:static={selectedOption === 'remove-condition' && selectedCondition === condition.slug}
          class:variant-positive={selectedOption === 'remove-condition' && selectedCondition === condition.slug}
          class:variant-info={selectedOption !== 'remove-condition' || selectedCondition !== condition.slug}
          on:click={() => selectCondition(condition.slug)}
        >
          <div class="content">
            {#if condition.img}
              <img src={condition.img} alt={condition.name} class="resource-icon" />
            {:else}
              <i class="fa fa-shield-alt resource-icon"></i>
            {/if}
            <div class="text">
              Remove {condition.name}{condition.badge ? ` ${condition.badge}` : ''}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

<style lang="scss">
  .tend-wounded-resolution {
    margin: var(--space-12) 0;
  }
  
  h3 {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-12);
  }
  
  .outcome-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
  }
  
  .outcome-badge {
    display: flex;
    flex-direction: column;
    padding: var(--space-8);
    background: var(--surface-low);
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    min-width: 12.5rem;
    width: auto;
    text-align: left;
    min-height: 2.25rem;
    cursor: pointer;
    
    &:hover {
      background: var(--surface-higher);
      border-color: var(--border-strong);
      transform: translateY(-0.125rem);
      box-shadow: 0 0.25rem 0.75rem var(--overlay-low);
    }
    
    &.static {
      cursor: default;
    }
    
    &.variant-positive {
      background: var(--surface-success-lower);
      border-color: var(--border-success);
      
      .resource-icon {
        color: var(--color-green);
      }
      
      &:hover {
        background: var(--surface-success);
        border-color: var(--border-success-strong);
      }
      
      &.static {
        background: var(--surface-success);
        border-color: var(--border-success-strong);
        box-shadow: 0 0 1rem var(--hover-high);
      }
    }
    
    &.variant-info {
      background: var(--surface-info-lower);
      border-color: var(--border-info);
      
      .resource-icon {
        color: var(--color-blue);
      }
      
      &:hover {
        background: var(--surface-info);
        border-color: var(--border-info-strong);
      }
    }
    
    .content {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      
      .resource-icon {
        font-size: var(--font-lg);
        flex-shrink: 0;
        
        // For img elements
        &[src] {
          width: 1.5rem;
          height: 1.5rem;
          object-fit: contain;
        }
      }
    }
    
    .text {
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
      line-height: 1.4;
      flex: 1;
    }
  }
</style>
