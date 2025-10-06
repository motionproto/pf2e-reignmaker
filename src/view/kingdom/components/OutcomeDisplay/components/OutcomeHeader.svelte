<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let outcome: string;
  export let actorName: string;
  export let skillName: string | undefined = undefined;
  export let showIgnoreButton: boolean = false;
  export let ignoreButtonDisabled: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  interface OutcomeProps {
    label: string;
    icon: string;
    colorClass: string;
  }
  
  function getOutcomeDisplayProps(outcome: string): OutcomeProps {
    switch (outcome) {
      case 'criticalSuccess':
        return { 
          label: 'Critical Success', 
          icon: 'fas fa-trophy', 
          colorClass: 'critical-success' 
        };
      case 'success':
        return { 
          label: 'Success', 
          icon: 'fas fa-check-circle', 
          colorClass: 'success' 
        };
      case 'failure':
        return { 
          label: 'Failure', 
          icon: 'fas fa-exclamation-triangle', 
          colorClass: 'failure' 
        };
      case 'criticalFailure':
        return { 
          label: 'Critical Failure', 
          icon: 'fas fa-skull-crossbones', 
          colorClass: 'critical-failure' 
        };
      default:
        return { 
          label: outcome, 
          icon: 'fas fa-question-circle', 
          colorClass: 'neutral' 
        };
    }
  }
  
  $: outcomeProps = getOutcomeDisplayProps(outcome);
  
  function handleIgnore() {
    dispatch('ignore');
  }
</script>

<div class="resolution-header">
  <div class="resolution-header-left">
    <i class={outcomeProps.icon}></i>
    <span>{outcomeProps.label}</span>
  </div>
  <div class="resolution-header-right">
    {#if actorName}
      <div class="actor-info">
        {actorName}{#if skillName}&nbsp;used {skillName}{/if}
      </div>
    {/if}
    {#if showIgnoreButton}
      <button
        class="ignore-button"
        disabled={ignoreButtonDisabled}
        on:click={handleIgnore}
        title="Ignore this event and apply failure effects"
      >
        <i class="fas fa-times-circle"></i>
        Ignore Event
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  .resolution-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid var(--border-subtle);
    
    .resolution-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      
      i {
        font-size: 20px;
      }
      
      > span:first-of-type {
        text-transform: capitalize;
      }
    }
    
    .resolution-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .actor-info {
        color: var(--text-secondary);
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
      }
      
      .ignore-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: var(--radius-md);
        color: var(--color-red);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        
        i {
          font-size: var(--font-md);
        }
        
        &:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.6);
          transform: translateY(-1px);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
</style>
