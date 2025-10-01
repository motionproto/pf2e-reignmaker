<script lang="ts">
  import { onMount } from 'svelte';
  import { currentPhase, currentTurn, isCurrentPhaseComplete, kingdomData } from '../../../stores/KingdomStore';
  import { TurnPhase } from '../../../models/KingdomState';
  import Button from './baseComponents/Button.svelte';
  
  export let title: string;
  export let description: string = '';
  export let icon: string = '';
  export let onNextPhase: (() => void) | undefined = undefined;
  export let isUpkeepPhase: boolean = false;
  // currentTurn is now imported from stores, remove the export
  
  let currentPhaseComplete = false;
  
  // Check if the current phase is complete - use the new kingdom actor check
  // For Upkeep phase specifically, check if UPKEEP is in phasesCompleted
  $: currentPhaseComplete = isUpkeepPhase 
    ? ($kingdomData.phasesCompleted?.includes(TurnPhase.UPKEEP) || false)
    : isCurrentPhaseComplete();

  // Debug phase completion detection
  $: if (isUpkeepPhase) {
    console.log('🔍 [PhaseHeader DEBUG] Upkeep phase completion check:', {
      isUpkeepPhase,
      phasesCompleted: $kingdomData.phasesCompleted,
      includesUpkeep: $kingdomData.phasesCompleted?.includes(TurnPhase.UPKEEP),
      currentPhaseComplete,
      buttonDisabled: !currentPhaseComplete
    });
  }
  
  let headerElement: HTMLElement;
  let previousTitle = '';
  
  // Trigger fade animation when phase changes
  $: if (title !== previousTitle && headerElement) {
    previousTitle = title;
    // Remove and re-add the animation class to restart it
    headerElement.classList.remove('phase-changed');
    void headerElement.offsetWidth; // Force reflow
    headerElement.classList.add('phase-changed');
    
    // Remove the class after animation completes
    setTimeout(() => {
      if (headerElement) {
        headerElement.classList.remove('phase-changed');
      }
    }, 500);
  }
  
  onMount(() => {
    previousTitle = title;
  });
</script>

<div class="phase-header-wrapper">
  <div 
    bind:this={headerElement}
    class="phase-header"
  >
    {#if icon}
      <i class="{icon} phase-icon"></i>
    {/if}
    <div class="phase-text">
      <h2>{title}</h2>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    {#if onNextPhase}
      <Button 
        variant="primary"
        icon={isUpkeepPhase ? 'fas fa-calendar-check' : 'fas fa-arrow-right'}
        iconPosition="right"
        on:click={onNextPhase}
        disabled={!currentPhaseComplete}
        tooltip={!currentPhaseComplete ? 'Complete all required steps in this phase first' : undefined}
      >
        {#if isUpkeepPhase}
          End Turn {$currentTurn}
        {:else}
          Next Phase
        {/if}
      </Button>
    {/if}
  </div>
</div>

<style>
  .phase-header-wrapper {
    margin-bottom: 0.25rem; /* Small bottom margin for compact spacing */
  }

  .phase-header {
    padding: 1rem 1rem;
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    display: flex;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay));
    border: 1px solid var(--border-m);
    font-family: var(--base-font);
  }


  /* Add a fade-in effect when phase changes */
  .phase-header.phase-changed {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    0% {
      transform: translateY(-2px);
    }
    100% {

      transform: translateY(0);
    }
  }

  .phase-icon {
    font-size: 1.5rem;
    color: var(--text-primary);
    opacity: 0.95;
    z-index: 1;
    position: relative;
    padding-top: .2rem;
    margin-right: .75rem;
  }


  .phase-text {
    flex: 1;
    z-index: 1;
    position: relative;
  }

  .phase-text h2 {
    margin: 0;
    font-size: var(--font-3xl);
    font-weight: var(--font-weight-bold);
    font-family: var(--base-font);
    color: var(--text-primary);
    text-shadow: var(--text-shadow-md);
    letter-spacing: 0.025em;
  }

  .phase-text p {
    margin: var(--space-2) 0 0;
    font-size: var(--font-md);
    font-family: var(--base-font);
    color: var(--text-secondary
    );
    opacity: 0.85;
  }


  /* Responsive design */
  @media (max-width: 768px) {
    .phase-header {
      padding: 1rem 1.25rem;
    }
    
    .phase-icon {
      font-size: 1.5rem;
      margin-right: 0.75rem;
    }
    
    .phase-text h2 {
      font-size: var(--font-2xl);
    }
    
    .phase-text p {
      font-size: var(--font-sm);
    }

  }
</style>
