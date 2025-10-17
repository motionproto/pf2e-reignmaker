<script lang="ts">
  import { onMount } from 'svelte';
  import type { ActiveCheckInstance } from '../../../models/CheckInstance';
  import { updateInstanceResolutionState } from '../../../controllers/shared/ResolutionStateHelpers';
  import { structuresService } from '../../../services/structures';
  import type { Structure } from '../../../models/Structure';
  
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  
  let settlementName = '';
  let selectedStructureId = '';
  let tier1Structures: Structure[] = [];
  
  // Show structure selection only on critical success
  $: showStructureChoice = outcome === 'criticalSuccess';
  
  // Get tier 1 structures
  onMount(() => {
    structuresService.initializeStructures();
    const allStructures = structuresService.getAllStructures();
    tier1Structures = allStructures.filter(s => s.tier === 1);
    console.log('📋 [EstablishSettlementDialog] Loaded tier 1 structures:', tier1Structures.length);
  });
  
  // Reactively store data whenever inputs change
  $: if (instance && settlementName) {
    updateInstanceResolutionState(instance.instanceId, {
      customComponentData: {
        settlementName: settlementName.trim(),
        structureId: selectedStructureId || null,
        outcome
      }
    });
  }
</script>

<div class="establish-settlement-dialog">
  <div class="dialog-header">
    <h3>
      <i class="fas fa-city"></i>
      Name Your New Village
    </h3>
  </div>
  
  <div class="dialog-content">
    <!-- Settlement Name Input -->
    <div class="input-group">
      <label for="settlement-name">Settlement Name *</label>
      <input
        id="settlement-name"
        type="text"
        bind:value={settlementName}
        placeholder="Enter settlement name..."
        class="settlement-name-input"
        autofocus
      />
    </div>
    
    <!-- Structure Selection (Critical Success Only) -->
    {#if showStructureChoice}
      <div class="input-group">
        <label for="structure-select">
          Choose a Free Tier 1 Structure
          <span class="optional">(Critical Success Bonus)</span>
        </label>
        <select
          id="structure-select"
          bind:value={selectedStructureId}
          class="structure-select"
        >
          <option value="">No structure (start with empty village)</option>
          {#each tier1Structures as structure}
            <option value={structure.id}>
              {structure.name}
              {#if structure.type === 'skill' && structure.effects.skillsSupported}
                ({structure.effects.skillsSupported.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')})
              {/if}
            </option>
          {/each}
        </select>
      </div>
    {/if}
    
    <!-- Information Notice -->
    <div class="notice">
      <i class="fas fa-info-circle"></i>
      <div class="notice-content">
        <strong>After applying:</strong> You'll need to place a Village on the Kingmaker hex map using the hex editing tools.
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .establish-settlement-dialog {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
  }
  
  .dialog-header {
    h3 {
      margin: 0;
      color: var(--color-amber, #f59e0b);
      font-size: var(--font-xl);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      i {
        font-size: 1.25rem;
      }
    }
  }
  
  .dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
      color: var(--text-secondary);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      
      .optional {
        color: var(--text-tertiary);
        font-weight: var(--font-weight-normal);
        font-size: var(--font-xs);
        margin-left: 0.5rem;
      }
    }
  }
  
  .settlement-name-input {
    padding: 0.75rem;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
      background: var(--bg-overlay);
    }
    
    &::placeholder {
      color: var(--text-tertiary);
    }
  }
  
  .structure-select {
    padding: 0.75rem;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
      background: var(--bg-overlay);
    }
    
    option {
      background: var(--bg-base);
      color: var(--text-primary);
    }
  }
  
  .notice {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--radius-md);
    color: #93c5fd;
    
    i {
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    
    .notice-content {
      flex: 1;
      font-size: var(--font-sm);
      line-height: 1.5;
      
      strong {
        color: #60a5fa;
      }
    }
  }
  
  .confirm-button {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary, #3b82f6);
    border: 1px solid var(--color-primary, #3b82f6);
    border-radius: var(--radius-md);
    color: white;
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background: var(--color-primary-dark, #2563eb);
      border-color: var(--color-primary-dark, #2563eb);
      transform: translateY(-1px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    i {
      font-size: 1rem;
    }
  }
</style>
