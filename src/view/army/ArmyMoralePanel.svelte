<script lang="ts">
  import type { ArmyMoraleStatus, MoraleSkill, MoralePanelState } from '../../types/MoraleCheck';
  import type { Army } from '../../models/Army';
  import { MORALE_OUTCOMES } from '../../types/MoraleCheck';
  import DisbandArmyDialog from '../kingdom/components/DisbandArmyDialog.svelte';

  // Props
  export let title: string = 'Morale Check';
  export let skill: MoraleSkill = 'diplomacy';
  export let armies: ArmyMoraleStatus[] = [];
  export let panelState: MoralePanelState = 'selection';
  export let currentArmyId: string | null = null;
  
  // Disband dialog state
  export let pendingDisbandArmy: Army | null = null;
  
  // Best character info (auto-selected based on skill)
  export let bestCharacterName: string | null = null;
  export let bestCharacterBonus: number | null = null;
  
  // Callbacks
  export let onCheckMorale: (armyId: string) => void;
  export let onDone: () => void;
  export let onDisbandConfirm: (armyId: string, deleteActor: boolean) => void;
  export let onDisbandCancel: (armyId: string) => void;
  
  // Disband dialog visibility
  $: showDisbandDialog = pendingDisbandArmy !== null;
  
  // Derived state
  $: pendingArmies = armies.filter(a => a.status === 'pending');
  $: completedArmies = armies.filter(a => a.status === 'completed');
  $: checkingArmy = armies.find(a => a.status === 'checking');
  $: allComplete = armies.length > 0 && armies.every(a => a.status === 'completed');
  $: canDone = allComplete;
  
  // Format skill name for display
  $: skillLabel = skill === 'diplomacy' ? 'Diplomacy' : 'Intimidation';
  
  // Outcome styling
  const outcomeColors: Record<string, string> = {
    criticalSuccess: '#4CAF50',
    success: '#8BC34A',
    failure: '#ff9800',
    criticalFailure: '#f44336'
  };
  
  const outcomeLabels: Record<string, string> = {
    criticalSuccess: 'Critical Success',
    success: 'Success',
    failure: 'Failure',
    criticalFailure: 'Critical Failure'
  };
  
  // Handle check morale button click
  function handleCheckMorale(armyId: string) {
    onCheckMorale(armyId);
  }
  
  // Handle disband dialog confirm
  function handleDisbandConfirm(event: CustomEvent<{ deleteActor: boolean }>) {
    if (pendingDisbandArmy) {
      onDisbandConfirm(pendingDisbandArmy.id, event.detail.deleteActor);
    }
  }
  
  // Handle disband dialog cancel
  function handleDisbandCancel() {
    if (pendingDisbandArmy) {
      onDisbandCancel(pendingDisbandArmy.id);
    }
  }
</script>

<!-- Disband Army Dialog -->
<DisbandArmyDialog
  show={showDisbandDialog}
  armyName={pendingDisbandArmy?.name || ''}
  armyLevel={pendingDisbandArmy?.level || 0}
  hasLinkedActor={!!pendingDisbandArmy?.actorId}
  isSupported={false}
  supportedBySettlement=""
  on:confirm={handleDisbandConfirm}
  on:cancel={handleDisbandCancel}
/>

<div class="army-morale-panel">
  {#if panelState === 'waiting-for-roll' && checkingArmy}
    <!-- Waiting for roll state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-dice-d20"></i>
        {title} - Rolling
      </h3>
    </div>
    <div class="waiting-content">
      <div class="checking-army">
        {#if checkingArmy.tokenImage}
          <img src={checkingArmy.tokenImage} alt={checkingArmy.army.name} class="army-token-image" />
        {:else}
          <i class="fas fa-users army-placeholder-icon"></i>
        {/if}
        <span class="army-name">{checkingArmy.army.name}</span>
      </div>
      <i class="fas fa-spinner fa-spin waiting-spinner"></i>
      <p>Waiting for roll to complete...</p>
      <p class="waiting-subtitle">Complete the Foundry roll dialog</p>
    </div>
    
  {:else if panelState === 'completed'}
    <!-- All complete state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-check-circle"></i>
        {title} Complete
      </h3>
    </div>
    <div class="result-content">
      <div class="results-summary">
        {#each completedArmies as armyStatus}
          {@const result = armyStatus.result}
          {@const outcomeColor = result ? outcomeColors[result.outcome] : '#999'}
          {@const outcomeLabel = result ? outcomeLabels[result.outcome] : 'Unknown'}
          {@const outcomeData = result ? MORALE_OUTCOMES[result.outcome] : null}
          <div class="result-card" class:result-disbanded={result?.disbanded}>
            <div class="result-header">
              {#if armyStatus.tokenImage}
                <img src={armyStatus.tokenImage} alt={armyStatus.army.name} class="army-token-image-sm" />
              {:else}
                <i class="fas fa-users army-placeholder-icon-sm"></i>
              {/if}
              <div class="result-info">
                <span class="army-name">{armyStatus.army.name}</span>
                <span class="result-outcome" style="color: {outcomeColor};">{outcomeLabel}</span>
              </div>
            </div>
            {#if outcomeData}
              <div class="result-effects">
                {#if outcomeData.disband}
                  <span class="effect effect-negative">
                    <i class="fas fa-times-circle"></i> Disbanded
                  </span>
                {/if}
                {#if outcomeData.unrest > 0}
                  <span class="effect effect-negative">
                    <i class="fas fa-exclamation-triangle"></i> +{outcomeData.unrest} Unrest
                  </span>
                {/if}
                {#if outcomeData.resetUnsupported}
                  <span class="effect effect-positive">
                    <i class="fas fa-heart"></i> Morale Restored
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <button class="btn-done" on:click={onDone}>
        <i class="fas fa-check"></i> Done
      </button>
    </div>
    
  {:else}
    <!-- Selection/showing-result state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-flag"></i>
        {title}
      </h3>
      {#if bestCharacterName}
        <div class="best-character">
          <i class="fas fa-user"></i>
          <span class="character-name">{bestCharacterName}</span>
          <span class="character-skill">{skillLabel}</span>
          <span class="character-bonus">+{bestCharacterBonus}</span>
        </div>
      {:else}
        <div class="no-character">
          <i class="fas fa-exclamation-triangle"></i>
          <span>No character available</span>
        </div>
      {/if}
    </div>
    
    <div class="army-list">
      {#if armies.length === 0}
        <p class="empty-message">No armies require morale checks</p>
      {:else}
        <!-- Pending armies -->
        {#each pendingArmies as armyStatus}
          <div class="army-item">
            <div class="army-header">
              {#if armyStatus.tokenImage}
                <img src={armyStatus.tokenImage} alt={armyStatus.army.name} class="army-token-image" />
              {:else}
                <i class="fas fa-users army-placeholder-icon"></i>
              {/if}
              <div class="army-info">
                <span class="army-name">{armyStatus.army.name}</span>
                <span class="army-details">Level {armyStatus.army.level}</span>
                {#if armyStatus.hexId}
                  <span class="army-hex">Hex: {armyStatus.hexId}</span>
                {/if}
              </div>
            </div>
            <button 
              class="btn-check-morale" 
              on:click={() => handleCheckMorale(armyStatus.army.id)}
              disabled={checkingArmy !== undefined}
            >
              <i class="fas fa-dice-d20"></i> Check Morale
            </button>
          </div>
        {/each}
        
        <!-- Completed armies -->
        {#if completedArmies.length > 0}
          <div class="completed-divider">
            <p class="completed-label">Completed</p>
          </div>
          {#each completedArmies as armyStatus}
            {@const result = armyStatus.result}
            {@const outcomeColor = result ? outcomeColors[result.outcome] : '#999'}
            {@const outcomeLabel = result ? outcomeLabels[result.outcome] : 'Unknown'}
            {@const outcomeData = result ? MORALE_OUTCOMES[result.outcome] : null}
            <div class="army-item completed" class:disbanded={result?.disbanded}>
              <div class="army-header">
                {#if armyStatus.tokenImage}
                  <img src={armyStatus.tokenImage} alt={armyStatus.army.name} class="army-token-image" />
                {:else}
                  <i class="fas fa-users army-placeholder-icon"></i>
                {/if}
                <div class="army-info">
                  <span class="army-name">{armyStatus.army.name}</span>
                  <span class="army-result" style="color: {outcomeColor};">{outcomeLabel}</span>
                </div>
              </div>
              <div class="army-effects">
                {#if outcomeData?.disband}
                  <span class="effect-badge effect-negative">Disbanded</span>
                {:else if outcomeData?.resetUnsupported}
                  <span class="effect-badge effect-positive">Rallied</span>
                {:else}
                  <span class="effect-badge">Holds</span>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>
    
    <div class="panel-actions">
      <button 
        class="btn-done" 
        on:click={onDone}
        disabled={!canDone}
      >
        <i class="fas fa-check"></i> Done
      </button>
    </div>
  {/if}
</div>

<style>
  .army-morale-panel {
    position: fixed;
    top: 50%;
    right: var(--space-20);
    transform: translateY(-50%);
    z-index: var(--z-overlay);
    background: var(--surface-lowest);
    border: 2px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-overlay);
    color: var(--text-primary);
    font-family: var(--font-sans-rm);
    min-width: 320px;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    animation: dialogSlideIn var(--transition-base);
  }
  
  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: translateY(calc(-50% - 1.25rem));
    }
    to {
      opacity: 1;
      transform: translateY(-50%);
    }
  }
  
  .panel-header {
    padding: var(--space-12) var(--space-24);
    border-bottom: 1px solid var(--border-subtle);
    background: var(--empty);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    cursor: move;
    user-select: none;
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }
  
  .best-character {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-8) var(--space-12);
    background: var(--surface-lower);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .best-character i {
    color: var(--color-amber);
  }
  
  .best-character .character-name {
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
  }
  
  .best-character .character-skill {
    color: var(--text-tertiary);
    font-size: var(--font-md);
  }
  
  .best-character .character-skill::before {
    content: "•";
    margin-right: var(--space-8);
  }
  
  .best-character .character-bonus {
    color: var(--text-success);
    font-weight: var(--font-weight-semibold);
    font-family: monospace;
  }
  
  .no-character {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-8) var(--space-12);
    background: var(--surface-danger-low);
    border: 1px solid var(--border-danger);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    color: var(--text-danger);
  }
  
  .army-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-16) var(--space-24);
    min-height: 0;
    max-height: 400px;
  }
  
  .empty-message {
    color: var(--text-muted);
    font-size: var(--font-md);
    text-align: center;
    padding: var(--space-16);
  }
  
  .army-item {
    padding: var(--space-12) var(--space-16);
    margin-bottom: var(--space-8);
    background: var(--hover-low);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .army-item.completed {
    opacity: 0.8;
  }
  
  .army-item.disbanded {
    opacity: 0.5;
    background: var(--surface-danger-low);
  }
  
  .army-header {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
  
  .army-token-image {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    object-fit: cover;
    border: 2px solid var(--border-medium);
  }
  
  .army-token-image-sm {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    object-fit: cover;
    border: 1px solid var(--border-medium);
  }
  
  .army-placeholder-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-2xl);
    color: var(--text-muted);
    background: var(--surface-lower);
    border-radius: var(--radius-md);
    border: 2px solid var(--border-medium);
  }
  
  .army-placeholder-icon-sm {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-lg);
    color: var(--text-muted);
    background: var(--surface-lower);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-medium);
  }
  
  .army-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .army-name {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-md);
  }
  
  .army-details {
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .army-hex {
    font-size: var(--font-md);
    color: var(--text-tertiary);
    font-family: monospace;
  }
  
  .army-result {
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
  }
  
  .army-effects {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }
  
  .effect-badge {
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    background: var(--surface-lower);
    color: var(--text-secondary);
  }
  
  .effect-badge.effect-positive {
    background: var(--surface-success-low);
    color: var(--text-success);
  }
  
  .effect-badge.effect-negative {
    background: var(--surface-danger-low);
    color: var(--text-danger);
  }
  
  .btn-check-morale {
    padding: var(--space-8) var(--space-16);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-medium);
    background: var(--btn-secondary-bg);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
  }
  
  .btn-check-morale:hover:not(:disabled) {
    background: var(--btn-secondary-hover);
    border-color: var(--border-strong);
  }
  
  .btn-check-morale:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .completed-divider {
    margin: var(--space-16) 0;
    border-top: 1px solid var(--border-subtle);
    padding-top: var(--space-12);
  }
  
  .completed-label {
    font-size: var(--font-md);
    color: var(--text-muted);
    margin: 0 0 var(--space-8) 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .panel-actions {
    padding: var(--space-16);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    gap: var(--space-8);
  }
  
  .btn-done {
    flex: 1;
    padding: var(--space-8) var(--space-16);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    transition: all var(--transition-base);
    min-width: 5rem;
    background: var(--btn-secondary-bg);
    color: var(--text-primary);
    border-color: var(--border-medium);
  }
  
  .btn-done:hover:not(:disabled) {
    background: var(--btn-secondary-hover);
    border-color: var(--border-strong);
  }
  
  .btn-done:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }
  
  .waiting-content,
  .result-content {
    padding: var(--space-16) var(--space-24);
  }
  
  .waiting-content {
    text-align: center;
  }
  
  .checking-army {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
    margin-bottom: var(--space-16);
  }
  
  .waiting-spinner {
    font-size: var(--font-5xl);
    color: var(--color-amber);
    margin-bottom: var(--space-16);
  }
  
  .waiting-content p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-md);
  }
  
  .waiting-subtitle {
    margin: var(--space-8) 0 0 0;
    color: var(--text-tertiary);
    font-size: var(--font-md);
  }
  
  .results-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    margin-bottom: var(--space-16);
    max-height: 300px;
    overflow-y: auto;
  }
  
  .result-card {
    background: var(--surface-lower);
    border-radius: var(--radius-md);
    padding: var(--space-12);
  }
  
  .result-card.result-disbanded {
    background: var(--surface-danger-low);
    opacity: 0.8;
  }
  
  .result-header {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
  
  .result-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .result-outcome {
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
  }
  
  .result-effects {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
    margin-top: var(--space-8);
  }
  
  .effect {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .effect.effect-positive {
    color: var(--text-success);
  }
  
  .effect.effect-negative {
    color: var(--text-danger);
  }
</style>

