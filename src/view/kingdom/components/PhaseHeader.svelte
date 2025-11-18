<script lang="ts">
  import { onMount } from 'svelte';
  import { currentPhase, currentTurn, isCurrentPhaseComplete, kingdomData, advancePhase } from '../../../stores/KingdomStore';
  import { TurnPhase } from '../../../actors/KingdomActor';
  import Button from './baseComponents/Button.svelte';
  
  export let title: string;
  export let description: string = '';
  export let icon: string = '';
  export let onNextPhase: (() => void) | undefined = undefined;
  export let isUpkeepPhase: boolean = false;
  export let isViewingActualPhase: boolean = true;
  export let showUntrainedToggle: boolean = false;
  export let hideUntrained: boolean = true;
  export let onToggleUntrained: ((value: boolean) => void) | undefined = undefined;
  // currentTurn is now imported from stores, remove the export
  
  // Use the reactive phaseComplete property from KingdomActor
  // But only enable the button if we're viewing the actual current phase
  $: currentPhaseComplete = ($kingdomData.phaseComplete || false) && isViewingActualPhase;

  // Check if current user is GM
  $: isGM = (globalThis as any).game?.user?.isGM || false;

  // Debug phase completion detection

  let headerElement: HTMLElement;
  let previousTitle = '';
  
  // GM force advance - mark all steps complete and advance
  async function forceAdvanceToNextPhase() {
    const { PhaseHandler } = await import('../../../models/turn-manager/phase-handler');
    const totalSteps = $kingdomData.currentPhaseSteps?.length || 0;
    
    // Complete all incomplete steps
    for (let i = 0; i < totalSteps; i++) {
      if ($kingdomData.currentPhaseSteps[i]?.completed !== 1) {
        await PhaseHandler.completePhaseStepByIndex(i);
      }
    }
    
    // Then advance to next phase
    advancePhase();
  }
  
  // GM-only shift-click handler to bypass disabled state
  function handleNextPhaseClick(event: CustomEvent) {
    // Extract the MouseEvent from the CustomEvent detail
    const mouseEvent = event.detail as MouseEvent;
    
    // If shift is held and user is GM, force progression even if disabled
    if (mouseEvent?.shiftKey && isGM) {

      if (onNextPhase) {
        onNextPhase();
      }
      return;
    }
    
    // Normal click - only proceed if not disabled
    if (currentPhaseComplete && onNextPhase) {
      onNextPhase();
    }
  }
  
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
    <div class="controls-wrapper">
      {#if showUntrainedToggle}
        <div class="untrained-toggle-wrapper">
          <label class="untrained-toggle">
            <input 
              type="checkbox" 
              checked={hideUntrained}
              on:change={(e) => onToggleUntrained?.(e.currentTarget.checked)}
            />
            <span>Hide Untrained Skills</span>
          </label>
        </div>
      {/if}
      {#if isGM && onNextPhase}
        <Button 
          variant="tertiary"
          icon="fas fa-forward"
          iconPosition="right"
          on:click={() => forceAdvanceToNextPhase()}
          tooltip="GM: Force advance to next phase (bypasses all checks)"
          class="gm-force-advance"
        >
          Force Next
        </Button>
      {/if}
      {#if onNextPhase}
        <Button 
          variant="primary"
          icon={isUpkeepPhase ? 'fas fa-calendar-check' : 'fas fa-arrow-right'}
          iconPosition="right"
          on:click={handleNextPhaseClick}
          disabled={!currentPhaseComplete}
          tooltip={!currentPhaseComplete ? (isGM ? 'Complete all required steps in this phase first (GM: Shift-click to force)' : 'Complete all required steps in this phase first') : undefined}
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
</div>

<style>
  .phase-header-wrapper {
    margin-bottom: var(--space-4); /* Small bottom margin for compact spacing */
  }

  .phase-header {
    padding: var(--space-16) var(--space-16);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    display: flex;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--surface-lower), var(--surface-low));
    border: 1px solid var(--border-medium);
  }


  /* Add a fade-in effect when phase changes */
  .phase-header.phase-changed {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    0% {
      transform: translateY(-0.125rem);
    }
    100% {

      transform: translateY(0);
    }
  }

  .phase-icon {
    font-size: var(--font-2xl);
    color: var(--text-primary);
    opacity: 0.95;
    z-index: 1;
    position: relative;
    padding-top: var(--space-4);
    margin-right: var(--space-16);
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
    color: var(--text-primary);
    text-shadow: var(--text-shadow-md);
    letter-spacing: 0.025rem;
  }

  .phase-text p {
    margin: var(--space-2) 0 0;
    font-size: var(--font-md);
    color: var(--text-secondary);
    opacity: 0.85;
  }

  .controls-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    z-index: 1;
    position: relative;
  }

  .untrained-toggle-wrapper {
    display: flex;
    align-items: center;
    padding: var(--space-12) var(--space-16);
    min-height: 2.5rem;
  }

  .untrained-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    white-space: nowrap;
  }

  .untrained-toggle input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
    margin: 0;
  }

  .untrained-toggle span {
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    user-select: none;
    line-height: 1.5;
  }

  /* GM Force Advance Button Styling */
  :global(.gm-force-advance) {
    border-color: var(--border-special) !important;
    background: var(--surface-special-low) !important;
    color: var(--border-special) !important;
  }

  :global(.gm-force-advance:hover) {
    background: var(--surface-special) !important;
    border-color: var(--border-special-medium) !important;
  }

  /* Responsive design */
  @media (max-width: 48rem) {
    .phase-header {
      padding: var(--space-16) var(--space-20);
    }
    
    .phase-icon {
      font-size: var(--font-2xl);
      margin-right: var(--space-12);
    }
    
    .phase-text h2 {
      font-size: var(--font-2xl);
    }
    
    .phase-text p {
      font-size: var(--font-sm);
    }

  }
</style>
