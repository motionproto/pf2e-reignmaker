<script lang="ts">
  /**
   * CitizensDemandStructure - Displays structures that citizens demand be built
   * 
   * Shows when demand-structure events have created ongoing modifiers.
   * Each unfulfilled demand generates +1 Unrest per turn.
   * 
   * Uses the reactive structureDemands store from settlement service.
   */
  import { structureDemands } from '../../../../services/settlements';
  import AdjustmentBadges from '../../components/AdjustmentBadges.svelte';

  // Reactive: use the centralized structureDemands store
  $: demandedStructures = $structureDemands;

  // Calculate total unrest: 1 per demanded structure
  $: totalUnrest = demandedStructures.length;
  
  // Create modifier array for AdjustmentBadges
  $: unrestModifiers = totalUnrest > 0 ? [{
    type: 'static' as const,
    resource: 'unrest' as const,
    value: totalUnrest,
    duration: 'permanent' as const
  }] : [];
</script>

{#if demandedStructures.length > 0}
  <div class="demand-structure-card">
    <div class="card-header">
      <span class="card-title">Citizen Demand Structure</span>
      <AdjustmentBadges modifiers={unrestModifiers} />
    </div>
    
    <div class="card-content">
      <div class="structure-tokens">
        {#each demandedStructures as demand}
          <span 
            class="structure-token"
            title="Build {demand.structureName} in {demand.settlementName}"
          >
            <i class="fas fa-building"></i>
            <span class="structure-text">{demand.structureName} in {demand.settlementName}</span>
          </span>
        {/each}
      </div>
      
      <p class="hint-text">
        Build these structures to satisfy citizens and reduce unrest.
      </p>
    </div>
  </div>
{/if}

<style lang="scss">
  .demand-structure-card {
    background: linear-gradient(135deg, 
      rgba(100, 116, 139, 0.1),
      rgba(71, 85, 105, 0.05));
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
    padding: var(--space-12) var(--space-16);
    background: var(--surface-low);
    border-bottom: 1px solid var(--border-default);
  }
  
  .card-title {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
  }
  
  .card-content {
    padding: var(--space-12) var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .structure-tokens {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }
  
  .structure-token {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-10);
    background: var(--surface-higher);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    
    i {
      font-size: var(--font-sm);
      color: var(--text-secondary);
    }
  }
  
  .structure-text {
    white-space: nowrap;
  }
  
  .hint-text {
    margin: 0;
    font-size: var(--font-md);
    color: var(--text-tertiary);
    line-height: 1.4;
  }
</style>

