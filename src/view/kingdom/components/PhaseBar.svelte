<script lang="ts">
  import { kingdomData, setViewingPhase, viewingPhase } from '../../../stores/kingdomActor';
  import { TurnPhase } from '../../../models/KingdomState';
  import { onMount } from 'svelte';

  // Define the phases in order
  const phases = [
    { id: TurnPhase.PHASE_I, label: 'Status', fullName: 'Gain Fame and apply ongoing modifiers' },
    { id: TurnPhase.PHASE_II, label: 'Resources', fullName: 'Collect resources and manage consumption' },
    { id: TurnPhase.PHASE_III, label: 'Unrest', fullName: 'Calculate unrest and resolve incidents' },
    { id: TurnPhase.PHASE_IV, label: 'Events', fullName: 'Resolve kingdom events' },
    { id: TurnPhase.PHASE_V, label: 'Actions', fullName: 'Perform kingdom actions' },
    { id: TurnPhase.PHASE_VI, label: 'Upkeep', fullName: 'End of turn' }
  ];

  $: currentPhase = $kingdomData.currentPhase;
  $: currentTurn = $kingdomData.currentTurn;
  $: selectedPhase = $viewingPhase || currentPhase;
  $: phasesCompleted = $kingdomData.phasesCompleted || [];
  
  // Initialize viewing phase on mount
  onMount(() => {
    if (!$viewingPhase) {
      setViewingPhase(currentPhase);
    }
  });
  
  function getPhaseIndex(phase: TurnPhase): number {
    return phases.findIndex(p => p.id === phase);
  }
  
  $: currentPhaseIndex = getPhaseIndex(currentPhase);
  
  // Make phase completion status reactive - recalculates whenever currentPhaseIndex changes
  $: phaseCompletions = phases.map((_, index) => index < currentPhaseIndex);
  

  function handlePhaseClick(phase: TurnPhase) {
    // Only allow clicking on the current phase
    if (!isPhaseClickable(phase)) {
      return;
    }
    // Update the viewing phase when user clicks
    setViewingPhase(phase);
  }

  function isPhaseActive(phase: TurnPhase): boolean {
    return phase === currentPhase;
  }
  
  function isPhaseSelected(phase: TurnPhase): boolean {
    return phase === selectedPhase;
  }
  
  function isPhaseClickable(phase: TurnPhase): boolean {
    // Allow clicking on all phases for viewing purposes
    return true;
  }
  
  function isPhaseCompleted(phase: TurnPhase): boolean {
    return phasesCompleted.includes(phase);
  }
  
  function isPhaseFuture(phase: TurnPhase): boolean {
    const phaseIndex = getPhaseIndex(phase);
    return phaseIndex > currentPhaseIndex;
  }
  
  // Helper to build tooltip text
  function getTooltip(phase: typeof phases[0]): string {
    const isActive = isPhaseActive(phase.id);
    const isCompleted = isPhaseCompleted(phase.id);
    const isFuture = isPhaseFuture(phase.id);
    
    let tooltip = phase.fullName;
    
    if (isActive) {
      tooltip += ' (Currently Active - Click to view)';
    } else if (isCompleted) {
      tooltip += ' (Completed - Click to review)';
    } else if (isFuture) {
      tooltip += ' (Future phase - Click to preview)';
    } else {
      tooltip += ' (Click to view)';
    }
    
    return tooltip;
  }
</script>

<div class="phase-bar">
  <div class="phase-bar-inner">
    {#each phases as phase, index (phase.id)}
      <!-- Phase connector line (before phase except for first) -->
      {#if index > 0}
        <div class="phase-connector" class:completed={isPhaseCompleted(phase.id)}></div>
      {/if}
      
      <!-- Phase button -->
        <button
          class="phase-item"
          class:active={phase.id === currentPhase}
          class:selected={phase.id === selectedPhase}
          class:completed={isPhaseCompleted(phase.id)}
          class:disabled={!isPhaseClickable(phase.id)}
          disabled={!isPhaseClickable(phase.id)}
          on:click={() => handlePhaseClick(phase.id)}
          title={getTooltip(phase)}
        >
        <!-- Active indicator dot -->
        {#if phase.id === currentPhase && phase.id !== selectedPhase}
          <span class="active-indicator"></span>
        {/if}
        <span class="phase-label">{phase.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .phase-bar {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
    border-radius: 6px;
    padding: 1.5rem 1rem; /* Symmetrical top/bottom padding for even spacing */
    font-family: var(--base-font);
    margin-top: -0.4rem;
    margin-bottom: 0.5rem; /* Add small bottom margin for separation from content */
  }

  .phase-bar-inner {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 0;
    max-width: 900px;
  }
  
  .phase-connector {
    width: 30px;
    height: 2px;
    background: rgba(180, 170, 150, 0.3);
    transition: background 0.3s ease;
  }
  
  .phase-connector.completed {
    background: #6e6e6e;
    box-shadow: 0 0 4px rgba(85, 85, 85, 0.4);
  }

  .phase-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1rem;
    background: var(--color-gray-600);
    border: 1px solid rgba(180, 170, 150, 0.3);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 100px;
    position: relative;
    color: var(--color-text-secondary);
    font-family: var(--base-font);
  }

  .phase-item:hover {
    background:  var(--color-gray-700);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-color: rgba(180, 170, 150, 0.5);
  }

  .phase-item.completed {
    background: var(--color-gray-900);
    border-color: var(--color-gray-700);
    color: var(--text-disabled);
  }

  /* Active phase - the actual game state */
  .phase-item.active {
     background: linear-gradient(to top, var(--color-primary-dark), var(--color-primary));
    color: #fff;
    border-color: var(--color-primary-light);
  }

  /* Selected phase - what the user is viewing */
  .phase-item.selected {
    position: relative;
  }
  
  .phase-item.selected::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 3px;
    background: #fff;  /* Always white underline for selection */
    border-radius: 2px;
    box-shadow: 0 2px 4px rgba(255, 255, 255, 0.4);
    transition: all 0.3s ease;
    z-index: 10; /* Ensure it's on top */
  }
  
  /* When phase is both active AND selected */
  .phase-item.active.selected {
    animation: none; /* Remove pulse animation when viewing active phase */
  }
  
  /* Active indicator dot for when active but not selected */
  .active-indicator {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 12px;
    height: 12px;
    background: #fff;
    border: 2px solid var(--color-dark-bg, #18181b);
    border-radius: 50%;
    animation: pulse-dot 2s infinite ease-in-out;
    z-index: 1;
  }

  @keyframes pulse-dot {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }

  .phase-item.active .phase-label {
    color: #fff;
    font-weight: var(--font-weight-bold);
  }

  .phase-item.completed .phase-label {
    color: var(--text-disabled);
  }

  /* Selected phase should always have readable text */
  .phase-item.selected .phase-label {
    color: var(--text-primary);
    opacity: 1;
  }

  /* When both active AND selected, keep white text */
  .phase-item.active.selected .phase-label {
    color: #fff;
    font-weight: var(--font-weight-bold);
  }

  .phase-label {
    font-size: 1rem;
    font-weight: var(--font-weight-medium);
    font-family: var(--base-font);
    text-align: center;
    line-height: 1.2;
    opacity: 0.9;
    position: relative;
    z-index: 2;
    color: var(--text-secondary);
  }

  /* Animation for active phase when not selected */
  @keyframes pulse {
    0% {
      box-shadow: 0 4px 4px rgba(255, 20, 20, 0.4);
    }
    50% {
      box-shadow: 0 4px 20px rgba(255, 20, 20, 0.8);
    }
    100% {
      box-shadow: 0 4px 4px rgba(255, 20, 20, 0.4);
    }
  }

  .phase-item.active:not(.selected) {
    animation: pulse 2s infinite ease-in-out;
  }

  /* Disabled phase buttons - cannot be clicked */
  .phase-item.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    background: var(--color-gray-800);
    color: var(--text-disabled);
    border-color: rgba(120, 120, 120, 0.2);
  }

  .phase-item.disabled:hover {
    transform: none; /* No hover transform for disabled buttons */
    box-shadow: none; /* No hover shadow for disabled buttons */
    background: var(--color-gray-800); /* Keep same background on hover */
    border-color: rgba(120, 120, 120, 0.2); /* Keep same border on hover */
  }

  .phase-item.disabled .phase-label {
    color: var(--text-disabled);
    opacity: 0.6;
  }

  /* Override disabled state for active phase (active phase should never be disabled) */
  .phase-item.active.disabled {
    cursor: pointer;
    opacity: 1;
    background: linear-gradient(to top, var(--color-primary-dark), var(--color-primary));
    color: #fff;
    border-color: var(--color-primary-light);
  }

  .phase-item.active.disabled .phase-label {
    color: #fff;
    opacity: 1;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .phase-bar {
      padding: 0.5rem;
    }
    
    .phase-bar-inner {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .phase-item {
      min-width: 80px;
      padding: 0.4rem 0.5rem;
    }

    .phase-label {
      font-size: 0.65rem;
    }
    
    .phase-connector {
      display: none;
    }
    
    .active-indicator {
      width: 8px;
      height: 8px;
      top: -2px;
      right: -2px;
    }
  }
</style>
