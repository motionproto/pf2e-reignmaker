<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getValidWorksiteTypes, type WorksiteType } from '../../../pipelines/shared/worksiteValidator';
  import { rollDiceFormula } from '../../../services/resolution';
  import { getResourceIcon } from '../utils/presentation';
  import Dialog from './baseComponents/Dialog.svelte';

  export let show: boolean = true;
  export let hexId: string;
  export let terrain: string;

  const dispatch = createEventDispatcher();

  // Get valid worksite types for this hex
  $: validWorksiteTypes = getValidWorksiteTypes(hexId);
  
  // Selected worksite
  let selectedWorksite: WorksiteType | null = null;

  // Dice roll state - interactive rolling
  let goldRolled = false;
  let unrestRolled = false;
  let goldValue: number | null = null;
  let unrestValue: number | null = null;

  function rollGold() {
    if (goldRolled) return;
    goldValue = rollDiceFormula('2d3');
    goldRolled = true;
  }

  function rollUnrest() {
    if (unrestRolled) return;
    unrestValue = rollDiceFormula('1d3');
    unrestRolled = true;
  }

  // Worksite metadata for display - use resource icons from presentation.ts
  function getWorksiteIcon(type: WorksiteType): string {
    switch (type) {
      case 'Farmstead': return getResourceIcon('food');
      case 'Logging Camp': return getResourceIcon('lumber');
      case 'Mine': return getResourceIcon('ore');
      case 'Quarry': return getResourceIcon('stone');
      default: return 'fa-box';
    }
  }

  function getWorksiteRevenue(type: WorksiteType): string {
    const normalizedTerrain = terrain.toLowerCase();
    switch (type) {
      case 'Farmstead':
        return normalizedTerrain === 'plains' ? '+2 Food' : '+1 Food';
      case 'Logging Camp':
        return normalizedTerrain === 'forest' ? '+2 Lumber' : '+1 Lumber';
      case 'Quarry':
        return normalizedTerrain === 'hills' || normalizedTerrain === 'mountains' ? '+1 Stone' : '';
      case 'Mine':
        return normalizedTerrain === 'mountains' || normalizedTerrain === 'swamp' ? '+1 Ore' : '';
      default:
        return '';
    }
  }

  // Confirm only enabled when all dice rolled AND worksite selected (if any available)
  $: allDiceRolled = goldRolled && unrestRolled;
  $: worksiteRequired = validWorksiteTypes.length > 0;
  $: worksiteSelected = selectedWorksite !== null;
  $: confirmDisabled = !allDiceRolled || (worksiteRequired && !worksiteSelected);

  function handleConfirm() {
    if (confirmDisabled) return;
    dispatch('selection', {
      goldBonus: goldValue,
      unrestReduction: unrestValue,
      worksiteType: selectedWorksite
    });
    show = false;
  }

  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
</script>

<Dialog
  bind:show
  title="Demand Fulfilled"
  confirmLabel="Claim Rewards"
  cancelLabel="Cancel"
  {confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="500px"
>
  <div class="message">
    <p>Citizens celebrate as hex <strong>{hexId}</strong> has been claimed!</p>
  </div>

  <!-- Rewards Section - Styled like OutcomeBadges -->
  <div class="dice-rollers-section">
    <div class="dice-rollers-header">Rewards:</div>
    <div class="outcome-badges">
      <!-- Gold Badge -->
      <button 
        class="outcome-badge variant-positive"
        class:clickable={!goldRolled}
        class:rolled={goldRolled}
        disabled={goldRolled}
        on:click={rollGold}
      >
        <div class="content">
          <i class="fas {getResourceIcon('gold')} resource-icon gold-icon"></i>
          <div class="text">
            Gain 
            {#if goldRolled}
              <span class="value">{goldValue}</span>
            {:else}
              <span class="dice-button">2d3</span>
            {/if}
            Gold
          </div>
        </div>
      </button>

      <!-- Unrest Badge -->
      <button 
        class="outcome-badge variant-positive"
        class:clickable={!unrestRolled}
        class:rolled={unrestRolled}
        disabled={unrestRolled}
        on:click={rollUnrest}
      >
        <div class="content">
          <i class="fas {getResourceIcon('unrest')} resource-icon"></i>
          <div class="text">
            Lose 
            {#if unrestRolled}
              <span class="value">{unrestValue}</span>
            {:else}
              <span class="dice-button">1d3</span>
            {/if}
            Unrest
          </div>
        </div>
      </button>
    </div>
  </div>

  <!-- Free Worksite Section -->
  <div class="worksite-section">
    <p class="section-label">
      Choose a free worksite <span class="terrain-hint">({terrain})</span>
    </p>

    {#if validWorksiteTypes.length === 0}
      <p class="no-worksites">No worksites available for this terrain.</p>
    {:else}
      <div class="worksite-grid">
        {#each validWorksiteTypes as type}
          {@const isSelected = selectedWorksite === type}
          {@const icon = getWorksiteIcon(type)}
          {@const revenue = getWorksiteRevenue(type)}
          
          <button
            class="worksite-box"
            class:selected={isSelected}
            on:click={() => selectedWorksite = type}
          >
            <i class="fas {icon} worksite-icon"></i>
            <div class="worksite-name">{type}</div>
            {#if revenue}
              <div class="worksite-revenue">{revenue}</div>
            {/if}
            {#if isSelected}
              <div class="selected-badge">
                <i class="fa-solid fa-check"></i>
              </div>
            {/if}
          </button>
        {/each}
      </div>

      {#if selectedWorksite}
        <div class="selection-summary">
          Selected: {selectedWorksite}
        </div>
      {/if}
    {/if}
  </div>
</Dialog>

<style lang="scss">
  .message {
    margin-bottom: var(--space-16);
    text-align: center;
    
    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
    }

    strong {
      color: var(--text-primary);
    }
  }

  /* Exactly match OutcomeBadges styling */
  .dice-rollers-section {
    margin-bottom: var(--space-16);
    
    .dice-rollers-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-12);
    }
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

    &.clickable {
      cursor: pointer;
      background: var(--surface-higher);
      border-color: var(--border-strong);

      &:hover {
        background: var(--surface-highest);
        border-color: var(--border-strong);
        transform: translateY(-0.125rem);
        box-shadow: 0 0.25rem 0.75rem var(--overlay-low);
      }
    }

    &.rolled {
      background: var(--surface-higher);
      border-color: var(--border-strong);
      box-shadow: 0 0 1rem var(--hover-high);
      opacity: 1;
      cursor: default;
    }

    &.variant-positive {
      background: var(--surface-success-lower);
      border-color: var(--border-success);

      .resource-icon {
        color: var(--color-green);
      }
      
      // Gold icon override
      .gold-icon {
        color: var(--color-amber);
      }

      &.clickable {
        background: var(--surface-success);

        &:hover {
          background: var(--surface-success-high);
          border-color: var(--border-success-strong);
        }
      }
    }

    .content {
      display: flex;
      align-items: center;
      gap: var(--space-10);

      .resource-icon {
        font-size: var(--font-lg);
        color: var(--text-primary);
        flex-shrink: 0;
      }
    }

    .text {
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
      line-height: 1.4;
      flex: 1;

      .dice-button {
        display: inline-block;
        padding: 0.125rem 0.375rem;
        background: var(--overlay-low);
        border-radius: var(--radius-sm);
        font-family: var(--font-code, monospace);
        font-weight: var(--font-weight-bold);
        color: var(--text-primary);
      }

      .value {
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
      }
    }
  }

  /* Worksite section */
  .worksite-section {
    background: var(--hover-low);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-16);
  }

  .section-label {
    margin: 0 0 var(--space-12) 0;
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    font-size: var(--font-md);
  }

  .terrain-hint {
    font-weight: var(--font-weight-normal);
    color: var(--text-tertiary);
    font-size: var(--font-sm);
  }

  .no-worksites {
    color: var(--text-tertiary);
    font-style: italic;
    margin: 0;
  }

  .worksite-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
    margin-bottom: var(--space-12);
  }

  .worksite-box {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding: var(--space-12) var(--space-16);
    min-width: 110px;
    min-height: 100px;
    
    background: var(--surface-low);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(.selected) {
      background: var(--hover);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }

    &.selected {
      background: var(--surface-success-lower);
      outline-color: var(--border-success);
    }
  }

  .worksite-icon {
    font-size: 1.5rem;
    line-height: 1;
    color: var(--text-primary);
  }

  .worksite-name {
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    font-size: var(--font-sm);
    text-align: center;
  }

  .worksite-revenue {
    font-size: var(--font-xs);
    color: var(--text-secondary);
  }

  .selected-badge {
    position: absolute;
    top: var(--space-6);
    right: var(--space-6);
    color: var(--color-green);
    font-size: var(--font-sm);
  }

  .selection-summary {
    padding: var(--space-8) var(--space-12);
    background: var(--surface-success-lower);
    border: 1px solid var(--border-success-subtle);
    border-radius: var(--radius-md);
    color: var(--color-green);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    font-size: var(--font-sm);
  }
</style>
