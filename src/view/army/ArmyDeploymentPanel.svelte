<script lang="ts">
  import type { Army } from '../../models/Army';
  import { getKingdomData } from '../../stores/KingdomStore';
  import { armyMovementMode } from '../../services/army/movementMode';

  // Props
  export let skill: string;
  export let selectedArmyId: string | null = null;
  export let plottedPath: string[] = [];
  export let panelState: 'selection' | 'waiting-for-roll' | 'showing-result' | 'animating' | 'completed' = 'selection';
  export let rollResult: {
    outcome: string;
    actorName: string;
    skillName?: string;
    rollBreakdown?: any;
  } | null = null;
  export let armiesOnMap: Array<{army: Army, hexId: string | null, deployed: boolean}> = [];
  export let currentFame: number = 0;
  
  // Callbacks
  export let onCancel: () => void;
  export let onDone: () => void;
  export let onConfirm: () => void;
  export let onOk: () => void;
  export let onSelectArmy: (armyId: string) => void;
  export let onReroll: () => void;
  
  // Derived state
  $: availableArmies = armiesOnMap.filter(a => !a.deployed);
  $: deployedArmies = armiesOnMap.filter(a => a.deployed);
  $: canComplete = selectedArmyId && plottedPath.length > 1;
  
  // Get army name for display
  $: kingdom = getKingdomData();
  $: selectedArmy = kingdom?.armies?.find((a: any) => a.id === selectedArmyId);
  $: armyName = selectedArmy?.name || 'Unknown Army';
  
  // Get max movement for display
  $: maxMovement = armyMovementMode.isActive() ? (armyMovementMode as any).maxMovement : 20;
  $: movementUsed = plottedPath.length > 0 ? plottedPath.length - 1 : 0;
  
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
  
  $: outcomeColor = rollResult ? (outcomeColors[rollResult.outcome] || '#999') : '#999';
  $: outcomeLabel = rollResult ? (outcomeLabels[rollResult.outcome] || rollResult.outcome) : '';
  
  // Get conditions/effects that will be applied based on outcome
  $: conditionsToApply = rollResult?.outcome === 'criticalSuccess' ?
    ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)'] :
    rollResult?.outcome === 'failure' ?
    ['-1 initiative (status penalty)', 'fatigued'] :
    rollResult?.outcome === 'criticalFailure' ?
    ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued'] :
    [];
  
  // Handle army click
  function handleArmyClick(armyId: string, deployed: boolean) {
    if (deployed) {
      const army = armiesOnMap.find(a => a.army.id === armyId);
      if (army) {
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn(`${army.army.name} has already moved this turn`);
      }
      return;
    }
    onSelectArmy(armyId);
  }
</script>

<div class="army-deployment-panel">
  {#if panelState === 'waiting-for-roll'}
    <!-- Waiting for roll state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-dice-d20"></i>
        Deploy Army - Rolling
      </h3>
    </div>
    <div class="waiting-content">
      <i class="fas fa-spinner fa-spin waiting-spinner"></i>
      <p>Waiting for roll to complete...</p>
      <p class="waiting-subtitle">Complete the Foundry roll dialog</p>
    </div>
    
  {:else if panelState === 'showing-result'}
    <!-- Showing result state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-check-circle"></i>
        Deployment Complete
      </h3>
    </div>
    <div class="result-content">
      <div class="result-card">
        <div class="result-header">
          <div class="result-outcome">
            <div class="result-label">Outcome</div>
            <div class="result-value" style="color: {outcomeColor};">{outcomeLabel}</div>
          </div>
          <i class="fas fa-chess-knight result-icon"></i>
        </div>
        <div class="result-detail">
          <div class="result-label">Rolled by</div>
          <div class="result-text">{rollResult?.actorName || 'Unknown'}</div>
        </div>
        <div class="result-detail">
          <div class="result-label">Army</div>
          <div class="result-text">{armyName}</div>
        </div>
        <div class="result-detail">
          <div class="result-label">Destination</div>
          <div class="result-text">Hex: {plottedPath.length > 0 ? plottedPath[plottedPath.length - 1] : 'Unknown'}</div>
        </div>
        <div class="result-detail">
          <div class="result-label">Path Length</div>
          <div class="result-text">{plottedPath.length} hexes ({plottedPath.length - 1} movement)</div>
        </div>
        {#if conditionsToApply.length > 0}
          <div class="effects-section">
            <div class="effects-label">Effects Applied:</div>
            <div class="effects-list">
              {#each conditionsToApply as condition}
                {@const isNegative = condition.includes('penalty') || condition.includes('fatigued') || condition.includes('enfeebled')}
                {@const icon = isNegative ? 'fa-exclamation-triangle' : 'fa-check-circle'}
                <div class="effect-item" class:effect-negative={isNegative}>
                  <i class="fas {icon}"></i>
                  <span>{condition}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <div class="result-actions">
        <button class="btn-cancel" on:click={onCancel}>
          <i class="fas fa-times"></i> Cancel
        </button>
        <button 
          class="btn-reroll" 
          on:click={onReroll}
          disabled={currentFame === 0}
        >
          <i class="fas fa-star"></i> Reroll with Fame
          <span class="fame-count">({currentFame} left)</span>
        </button>
        <button class="btn-confirm" on:click={onConfirm}>
          <i class="fas fa-check"></i> Confirm
        </button>
      </div>
    </div>
    
  {:else if panelState === 'animating'}
    <!-- Animating state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-route"></i>
        Deploying Army
      </h3>
    </div>
    <div class="waiting-content">
      <i class="fas fa-spinner fa-spin animating-spinner"></i>
      <p>Army is moving into position...</p>
      <p class="waiting-subtitle">Watch the map for animation</p>
    </div>
    
  {:else if panelState === 'completed'}
    <!-- Completed state -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-check-circle"></i>
        Deployment Complete
      </h3>
    </div>
    <div class="result-content">
      <div class="result-card">
        <div class="result-header">
          <div class="result-outcome">
            <div class="result-label">Outcome</div>
            <div class="result-value" style="color: {outcomeColor};">
              <i class="fas fa-trophy"></i> {outcomeLabel}
            </div>
          </div>
          <i class="fas fa-chess-knight result-icon"></i>
        </div>
        <div class="result-detail">
          <div class="result-label">Army</div>
          <div class="result-text">{armyName}</div>
        </div>
        <div class="result-detail">
          <div class="result-label">Destination</div>
          <div class="result-text result-hex">{plottedPath.length > 0 ? plottedPath[plottedPath.length - 1] : 'Unknown'}</div>
        </div>
        <div class="result-detail">
          <div class="result-label">Movement</div>
          <div class="result-text">{movementUsed} hexes</div>
        </div>
        {#if conditionsToApply.length > 0}
          <div class="effects-section">
            <div class="effects-label">Effects Applied:</div>
            <div class="effects-list">
              {#each conditionsToApply as condition}
                {@const isNegative = condition.includes('penalty') || condition.includes('fatigued') || condition.includes('enfeebled')}
                {@const icon = isNegative ? 'fa-exclamation-triangle' : 'fa-check-circle'}
                <div class="effect-item" class:effect-negative={isNegative}>
                  <i class="fas {icon}"></i>
                  <span>{condition}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <button class="btn-ok" on:click={onOk}>
        <i class="fas fa-check"></i> OK
      </button>
    </div>
    
  {:else}
    <!-- Selection state (default) -->
    <div class="panel-header">
      <h3>
        <i class="fas fa-chess-knight"></i>
        Deploy Army
      </h3>
      <p class="skill-info">
        Skill: <span class="skill-name">{skill}</span>
      </p>
    </div>
    
    <div class="army-list">
      {#if armiesOnMap.length === 0}
        <p class="empty-message">No armies found on current scene</p>
      {:else if availableArmies.length === 0}
        <p class="error-message">
          <i class="fas fa-exclamation-triangle"></i> All armies have already moved this turn
        </p>
      {:else}
        {#each availableArmies as {army, hexId, deployed}}
          {@const isSelected = army.id === selectedArmyId}
          <div 
            class="army-item" 
            class:selected={isSelected}
            on:click={() => handleArmyClick(army.id, deployed)}
            role="button"
            tabindex="0"
          >
            <div class="army-header">
              <span class="army-name">{army.name}</span>
              {#if isSelected}
                <i class="fas fa-check-circle army-selected-icon"></i>
              {/if}
            </div>
            <div class="army-details">
              Level {army.level} • {#if army.isSupported}
                <span class="supported">Supported</span>
              {:else}
                <span class="unsupported">Unsupported</span>
              {/if}
            </div>
            <div class="army-hex">Hex: {hexId || 'Unknown'}</div>
          </div>
        {/each}
        
        {#if deployedArmies.length > 0}
          <div class="deployed-divider">
            <p class="deployed-label">Already Deployed</p>
          </div>
          {#each deployedArmies as {army, hexId}}
            <div 
              class="army-item deployed"
              on:click={() => handleArmyClick(army.id, true)}
              role="button"
              tabindex="0"
            >
              <div class="army-header">
                <span class="army-name">{army.name}</span>
                <i class="fas fa-check deployed-icon"></i>
              </div>
              <div class="army-details">
                Level {army.level} • Already moved this turn
              </div>
              <div class="army-hex">Hex: {hexId || 'Unknown'}</div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>
    
    {#if selectedArmyId && plottedPath.length > 0}
      <div class="movement-info">
        <div class="movement-row">
          <span>Path Length:</span>
          <span class="movement-value">{plottedPath.length} hexes</span>
        </div>
        <div class="movement-row">
          <span>Movement Used:</span>
          <span class="movement-value" class:movement-max={movementUsed >= maxMovement}>
            {movementUsed} / {maxMovement}
          </span>
        </div>
      </div>
    {/if}
    
    <div class="panel-actions">
      <button class="btn-cancel" on:click={onCancel}>
        <i class="fas fa-times"></i> Cancel
      </button>
      <button 
        class="btn-done" 
        on:click={onDone}
        disabled={!canComplete}
      >
        <i class="fas fa-check"></i> Done
      </button>
    </div>
  {/if}
</div>

<style>
  .army-deployment-panel {
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
    padding: 0.5rem var(--space-24);
    border-bottom: 1px solid var(--border-subtle);
    background: var(--empty);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
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
  
  .skill-info {
    margin: 0;
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .skill-name {
    color: var(--color-amber);
    font-weight: var(--font-weight-semibold);
  }
  
  .army-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-16) var(--space-24);
    min-height: 0;
    max-height: none;
  }
  
  .empty-message,
  .error-message {
    color: var(--text-muted);
    font-size: var(--font-md);
    text-align: center;
    padding: var(--space-16);
  }
  
  .error-message {
    color: var(--text-danger);
  }
  
  .army-item {
    padding: var(--space-10) var(--space-16);
    margin-bottom: var(--space-8);
    
    /* Background */
    background: var(--hover-low);
    
    /* Border (visible on all states) */
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    
    /* Outline (overlay, doesn't affect size) */
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    /* Interaction */
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .army-item:hover:not(.deployed):not(.selected) {
    background: var(--hover);
    transform: translateY(-0.0625rem);
    box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
  }
  
  .army-item.selected {
    background: var(--surface-success-low);
    outline-color: var(--border-success);
  }
  
  .army-item.deployed {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .army-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }
  
  .army-name {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-md);
  }
  
  .army-selected-icon {
    color: var(--text-success);
  }
  
  .deployed-icon {
    color: var(--text-success);
  }
  
  .army-details {
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .army-details :global(.supported) {
    color: var(--text-success);
  }
  
  .army-details :global(.unsupported) {
    color: var(--text-danger);
  }
  
  .army-hex {
    font-size: var(--font-md);
    color: var(--text-tertiary);
    font-family: monospace;
    margin-top: var(--space-4);
  }
  
  .deployed-divider {
    margin: var(--space-16) 0;
    border-top: 1px solid var(--border-subtle);
    padding-top: var(--space-12);
  }
  
  .deployed-label {
    font-size: var(--font-md);
    color: var(--text-muted);
    margin: 0 0 var(--space-8) 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .movement-info {
    padding: var(--space-12) var(--space-24);
    background: var(--surface-lower);
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .movement-row {
    display: flex;
    justify-content: space-between;
  }
  
  .movement-row:not(:first-child) {
    margin-top: var(--space-4);
  }
  
  .movement-value {
    color: var(--color-amber);
    font-weight: var(--font-weight-semibold);
  }
  
  .movement-value.movement-max {
    color: var(--text-success);
  }
  
  .panel-actions {
    padding: var(--space-16);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    gap: var(--space-8);
  }
  
  .btn-cancel,
  .btn-done,
  .btn-confirm,
  .btn-ok,
  .btn-reroll {
    flex: 1;
    padding: var(--space-8) var(--space-16);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    transition: all var(--transition-base);
    min-width: 5rem;
  }
  
  .btn-cancel {
    background: transparent;
    color: var(--text-primary);
    border-color: var(--border-medium);
  }
  
  .btn-cancel:hover {
    background: var(--hover-low);
    border-color: var(--border-strong);
  }
  
  .btn-done {
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
  
  .btn-confirm {
    background: var(--btn-secondary-bg);
    color: var(--text-primary);
    border-color: var(--border-medium);
  }
  
  .btn-confirm:hover {
    background: var(--btn-secondary-hover);
    border-color: var(--border-strong);
  }
  
  .btn-reroll {
    background: var(--btn-secondary-bg);
    color: var(--text-primary);
    border-color: var(--border-medium);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
  }
  
  .btn-reroll:hover:not(:disabled) {
    background: var(--btn-secondary-hover);
    border-color: var(--border-strong);
  }
  
  .btn-reroll:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }
  
  .fame-count {
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .btn-ok {
    width: 100%;
    padding: var(--space-12) var(--space-16);
    background: var(--btn-secondary-bg);
    color: var(--text-primary);
    border-color: var(--border-medium);
    font-weight: var(--font-weight-semibold);
  }
  
  .btn-ok:hover {
    background: var(--btn-secondary-hover);
    border-color: var(--border-strong);
  }
  
  .waiting-content,
  .result-content {
    padding: var(--space-16) var(--space-24);
  }
  
  .waiting-content {
    text-align: center;
  }
  
  .waiting-spinner,
  .animating-spinner {
    font-size: var(--font-5xl);
    color: var(--color-amber);
    margin-bottom: var(--space-16);
  }
  
  .animating-spinner {
    color: var(--text-success);
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
  
  .result-card {
    background: var(--surface-lower);
    border-radius: var(--radius-md);
    padding: var(--space-16);
    margin-bottom: var(--space-16);
  }
  
  .result-header {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    margin-bottom: var(--space-12);
  }
  
  .result-outcome {
    flex: 1;
  }
  
  .result-label {
    font-size: var(--font-md);
    color: var(--text-secondary);
    margin-bottom: var(--space-4);
  }
  
  .result-value {
    font-size: var(--font-xl);
    font-weight: var(--font-weight-semibold);
  }
  
  .result-icon {
    font-size: var(--font-3xl);
    color: var(--color-amber);
    opacity: 0.5;
  }
  
  .result-detail {
    margin-bottom: var(--space-12);
  }
  
  .result-detail:last-of-type {
    margin-bottom: 0;
  }
  
  .result-text {
    font-size: var(--font-md);
    color: var(--text-primary);
  }
  
  .result-hex {
    font-family: monospace;
  }
  
  .effects-section {
    margin-top: var(--space-12);
    padding-top: var(--space-12);
    border-top: 1px solid var(--border-subtle);
  }
  
  .effects-label {
    font-size: var(--font-md);
    color: var(--text-secondary);
    margin-bottom: var(--space-8);
  }
  
  .effects-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  
  .effect-item {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }
  
  .effect-item i {
    color: var(--text-success);
  }
  
  .effect-item.effect-negative i {
    color: var(--text-warning);
  }
  
  .effect-item span {
    font-size: var(--font-md);
    color: var(--text-primary);
  }
  
  .result-actions {
    display: flex;
    gap: var(--space-8);
  }
</style>

