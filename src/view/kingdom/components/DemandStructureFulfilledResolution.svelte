<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { rollDiceFormula } from '../../../services/resolution';
  import { getResourceIcon } from '../utils/presentation';
  import Dialog from './baseComponents/Dialog.svelte';

  export let show: boolean = true;
  export let structureId: string;
  export let structureName: string;
  export let settlementName: string = '';

  const dispatch = createEventDispatcher();

  // Dice roll state - interactive rolling
  let unrestRolled = false;
  let unrestValue: number | null = null;
  let goldRolled = false;
  let goldValue: number | null = null;

  function rollUnrest() {
    if (unrestRolled) return;
    unrestValue = rollDiceFormula('1d4');
    unrestRolled = true;
  }

  function rollGold() {
    if (goldRolled) return;
    // 2-6 gold: 1d4+1 gives 2-5, so use 1d5+1 equivalent
    goldValue = Math.floor(Math.random() * 5) + 2; // 2-6
    goldRolled = true;
  }

  // Confirm only enabled when both dice rolled
  $: confirmDisabled = !unrestRolled || !goldRolled;

  function handleConfirm() {
    if (confirmDisabled) return;
    dispatch('selection', {
      unrestReduction: unrestValue,
      goldReward: goldValue
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
  title="Citizens Rejoice!"
  confirmLabel="Claim Rewards"
  cancelLabel="Cancel"
  {confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="450px"
>
  <div class="message">
    <div class="celebration-icon">
      <i class="fas fa-building"></i>
    </div>
    {#if settlementName}
      <p>The citizens of <strong>{settlementName}</strong> celebrate as <strong>{structureName}</strong> has been built!</p>
    {:else}
      <p>The citizens celebrate as <strong>{structureName}</strong> has been built!</p>
    {/if}
    <p class="subtext">Their demands have been met and unrest subsides.</p>
  </div>

  <!-- Rewards Section - Styled like OutcomeBadges -->
  <div class="dice-rollers-section">
    <div class="dice-rollers-header">Rewards:</div>
    <div class="outcome-badges">
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
              <span class="dice-button">1d4</span>
            {/if}
            Unrest
          </div>
        </div>
      </button>
      
      <!-- Gold Badge -->
      <button 
        class="outcome-badge variant-positive"
        class:clickable={!goldRolled}
        class:rolled={goldRolled}
        disabled={goldRolled}
        on:click={rollGold}
      >
        <div class="content">
          <i class="fas {getResourceIcon('gold')} resource-icon"></i>
          <div class="text">
            Gain 
            {#if goldRolled}
              <span class="value">{goldValue}</span>
            {:else}
              <span class="dice-button">2-6</span>
            {/if}
            Gold
          </div>
        </div>
      </button>
    </div>
  </div>

  <!-- Modifier Removal Notice -->
  <div class="modifier-notice">
    <i class="fas fa-times-circle"></i>
    {#if settlementName}
      <span>The ongoing "Citizens of {settlementName} demand a {structureName}" modifier will be removed.</span>
    {:else}
      <span>The ongoing "Citizens demand a {structureName}" modifier will be removed.</span>
    {/if}
  </div>
</Dialog>

<style lang="scss">
  .message {
    margin-bottom: var(--space-16);
    text-align: center;
    
    .celebration-icon {
      font-size: var(--font-4xl);
      color: var(--color-amber);
      margin-bottom: var(--space-12);
      
      i {
        animation: bounce 0.6s ease-in-out;
      }
    }
    
    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
    }
    
    .subtext {
      margin-top: var(--space-8);
      font-size: var(--font-sm);
      color: var(--text-tertiary);
    }

    strong {
      color: var(--color-amber);
    }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-0.5rem); }
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
    justify-content: center;
  }

  .outcome-badge {
    display: flex;
    flex-direction: column;
    padding: var(--space-12);
    background: var(--surface-low);
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    min-width: 14rem;
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
        font-size: var(--font-xl);
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

  .modifier-notice {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    padding: var(--space-12) var(--space-16);
    background: var(--surface-success-lowest);
    border: 1px solid var(--border-success-subtle);
    border-radius: var(--radius-md);
    color: var(--color-green);
    font-size: var(--font-sm);
    
    i {
      flex-shrink: 0;
    }
  }
</style>

