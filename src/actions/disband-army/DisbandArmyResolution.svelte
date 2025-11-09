<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import type { ActiveCheckInstance } from '../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../controllers/shared/ResolutionStateHelpers';

  // Props
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  export let applied: boolean = false;  // Track if result has been applied

  const dispatch = createEventDispatcher();

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: deleteActor = resolutionState.customComponentData?.deleteActor ?? true;
  
  // Initialize default state on mount so Apply Result button is immediately active
  onMount(async () => {
    if (!instance || applied) return;
    
    // Only initialize if state is not already set
    if (!resolutionState.customComponentData?.hasOwnProperty('deleteActor')) {
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: { deleteActor: true }
      });
      
      // Emit initial selection event
      dispatch('selection', { deleteActor: true });
    }
  });

  // Get army details from global state (set during pre-roll dialog)
  $: armyId = (globalThis as any).__pendingDisbandArmyArmy;
  $: army = $kingdomData?.armies?.find(a => a.id === armyId);
  
  // Get army details
  $: armyName = army?.name || 'Unknown Army';
  $: armyLevel = army?.level || 0;
  $: hasLinkedActor = !!army?.actorId;
  $: isSupported = army?.isSupported || false;
  $: supportedBySettlement = army?.supportedBySettlementId 
    ? $kingdomData?.settlements?.find(s => s.id === army?.supportedBySettlementId)?.name || ''
    : '';

  async function handleToggleDeleteActor() {
    if (!instance) return;

    const newValue = !deleteActor;

    // Update instance resolution state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { deleteActor: newValue }
    });

    // Emit selection event
    dispatch('selection', { deleteActor: newValue });
  }
</script>

<div class="disband-army-resolution">
  <div class="header">
    <h4>Disband Army</h4>
  </div>

  <div class="army-info">
    <div class="info-row">
      <span class="label">Army:</span>
      <span class="value">{armyName}</span>
    </div>
    <div class="info-row">
      <span class="label">Level:</span>
      <span class="value">{armyLevel}</span>
    </div>
    <div class="info-row">
      <span class="label">Support:</span>
      <span class="value {isSupported ? 'supported' : 'unsupported'}">
        {#if isSupported && supportedBySettlement}
          Supported by {supportedBySettlement}
        {:else}
          Unsupported
        {/if}
      </span>
    </div>
  </div>

  {#if hasLinkedActor}
    <div class="actor-option">
      <label class="actor-choice">
        <input 
          type="checkbox" 
          checked={deleteActor}
          on:change={handleToggleDeleteActor}
          disabled={applied}
        />
        <span>Delete NPC Actor</span>
      </label>
      <p class="actor-note">
        If unchecked, the NPC actor will be unlinked but not deleted from Foundry.
      </p>
    </div>
  {:else}
    <div class="no-actor">
      <i class="fas fa-info-circle"></i>
      <span>No linked NPC actor to delete</span>
    </div>
  {/if}

  <div class="warning">
    <i class="fas fa-exclamation-triangle"></i>
    <span>This action cannot be undone.</span>
  </div>
</div>

<style lang="scss">
  .disband-army-resolution {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 16px;
    margin: 12px 0;
  }

  .header {
    margin-bottom: 12px;
    
    h4 {
      margin: 0;
      font-size: var(--font-md);
      font-weight: 600;
      color: var(--text-primary, #e0e0e0);
    }
  }

  .army-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .info-row {
    display: flex;
    gap: 8px;
    font-size: var(--font-md);
    
    .label {
      color: var(--text-secondary, #a0a0a0);
      font-weight: 500;
      min-width: 70px;
    }
    
    .value {
      color: var(--text-primary, #e0e0e0);
      font-weight: 600;
      
      &.supported {
        color: var(--color-green, #22c55e);
      }
      
      &.unsupported {
        color: var(--color-orange, #f97316);
      }
    }
  }

  .actor-option {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 1px solid var(--border-subtle);
    margin-bottom: 12px;
  }

  .actor-choice {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 600;
    color: var(--text-primary, #e0e0e0);
    font-size: var(--font-md);
    
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      
      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
  }

  .actor-note {
    margin: 8px 0 0 26px;
    font-size: var(--font-sm);
    color: var(--text-secondary, #a0a0a0);
    font-style: italic;
  }

  .no-actor {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--text-secondary, #a0a0a0);
    font-size: var(--font-md);
    margin-bottom: 12px;
    
    i {
      color: var(--color-blue, #3b82f6);
    }
  }

  .warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 4px;
    border: 1px solid var(--border-primary-medium);
    color: #ff6b6b;
    font-size: var(--font-sm);
    
    i {
      font-size: 14px;
    }
  }
</style>
