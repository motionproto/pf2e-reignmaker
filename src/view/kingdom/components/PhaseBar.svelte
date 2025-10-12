<script lang="ts">
  import { currentPhase, setViewingPhase, viewingPhase, phaseViewLocked, togglePhaseViewLock } from '../../../stores/KingdomStore';
  import { TurnPhase, PHASE_ORDER } from '../../../actors/KingdomActor';
  import { onMount } from 'svelte';

  // Define the phases in order - pure display data
  const phases = [
    { id: TurnPhase.STATUS, label: 'Status', fullName: 'Gain Fame and apply ongoing modifiers' },
    { id: TurnPhase.RESOURCES, label: 'Resources', fullName: 'Collect resources and manage consumption' },
    { id: TurnPhase.UNREST, label: 'Unrest', fullName: 'Calculate unrest and resolve incidents' },
    { id: TurnPhase.EVENTS, label: 'Events', fullName: 'Resolve kingdom events' },
    { id: TurnPhase.ACTIONS, label: 'Actions', fullName: 'Perform kingdom actions' },
    { id: TurnPhase.UPKEEP, label: 'Upkeep', fullName: 'End of turn' }
  ];

  // Pure UI state - no business logic  
  $: selectedPhase = $viewingPhase || $currentPhase;
  
  // Lock warning state
  let lockWarningActive = false;
  let lockWarningTimeout: number | null = null;
  
  // Helper function to determine if a phase is completed
  // A phase is completed if the current phase comes after it in the sequence
  function isPhaseCompleted(phase: TurnPhase, current: TurnPhase): boolean {
    const phaseIndex = PHASE_ORDER.indexOf(phase);
    const currentIndex = PHASE_ORDER.indexOf(current);
    return currentIndex > phaseIndex;
  }
  
  // Initialize viewing phase on mount
  onMount(() => {
    if (!$viewingPhase) {
      setViewingPhase($currentPhase);
    }
  });

  // Pure UI actions - just update viewing state
  function handlePhaseClick(phase: TurnPhase) {
    // If locked and clicking different phase than current
    if ($phaseViewLocked && phase !== $currentPhase) {
      if (!lockWarningActive) {
        // First click - show warning
        lockWarningActive = true;
        console.log('[PhaseBar] Lock warning activated - click again to unlock');
        
        // Clear warning after 5 seconds
        lockWarningTimeout = window.setTimeout(() => {
          lockWarningActive = false;
          lockWarningTimeout = null;
          console.log('[PhaseBar] Lock warning timeout - reset to locked state');
        }, 5000);
        
        return; // Don't change phase yet
      } else {
        // Second click - unlock and proceed
        console.log('[PhaseBar] Unlocking phase view - confirmed by second click');
        lockWarningActive = false;
        if (lockWarningTimeout) {
          clearTimeout(lockWarningTimeout);
          lockWarningTimeout = null;
        }
        phaseViewLocked.set(false);
      }
    }
    
    setViewingPhase(phase);
  }
  
  // Lock toggle handler
  function handleLockToggle() {
    togglePhaseViewLock();
  }
</script>

<div class="phase-bar">
  <div class="phase-bar-inner">
    {#each phases as phase, index (phase.id)}
      <!-- Phase connector line (before phase except for first) -->
      {#if index > 0}
        <div class="phase-connector"></div>
      {/if}
      
      <!-- Phase button -->
      <button
        class="phase-item"
        class:active={phase.id === $currentPhase}
        class:selected={phase.id === selectedPhase}
        class:completed={isPhaseCompleted(phase.id, $currentPhase)}
        on:click={() => handlePhaseClick(phase.id)}
        title={phase.fullName}
      >
        <!-- Active indicator dot -->
        {#if phase.id === $currentPhase && phase.id !== selectedPhase}
          <span class="active-indicator"></span>
        {/if}
        <span class="phase-label">{phase.label}</span>
      </button>
    {/each}
    
    <!-- Lock icon button -->
    <button
      class="lock-button"
      class:locked={$phaseViewLocked}
      class:warning={lockWarningActive}
      on:click={handleLockToggle}
      title={$phaseViewLocked ? 'View locked to current phase - click to unlock' : 'View unlocked - click to lock to current phase'}
    >
      <i class="fas {$phaseViewLocked ? 'fa-lock' : 'fa-unlock'}"></i>
    </button>
    
    <!-- Lock warning message -->
    {#if lockWarningActive}
      <div class="lock-warning-message">
        Click again to unlock
      </div>
    {/if}
  </div>
</div>

<style>
  .phase-bar {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
    border-radius: 6px;
    padding: 1.5rem 1rem; /* Symmetrical top/bottom padding for even spacing */
    font-family: var(--base-font);
    margin-top: -0.4rem;
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
    background: var(--btn-secondary-bg);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 100px;
    position: relative;
    color: var(--text-primary);
    font-family: var(--base-font);
  }

  .phase-item:hover {
    background: var(--btn-secondary-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-color: var(--border-strong);
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

  .lock-button {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-secondary);
    font-size: 1.2rem;
    padding: 0;
  }

  .lock-button:hover {
    transform: scale(1.1);
  }

  .lock-button.locked {
    color: var(--color-secondary);
  }

  .lock-button.locked:hover {
    color: var(--color-secondary-light);
  }
  
  .lock-button:not(.locked) i {
    transform: rotate(-30deg);
  }
  
  /* Lock warning state - red pulse animation */
  .lock-button.warning {
    color: var(--color-danger, #ff4444) !important;
    animation: lock-warning-pulse 0.5s ease-in-out infinite;
  }
  
  @keyframes lock-warning-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.3);
      opacity: 0.8;
    }
  }
  
  /* Lock warning message */
  .lock-warning-message {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-danger, #ff4444);
    color: white;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    animation: fade-in-out 5s ease-in-out forwards;
    z-index: 100;
  }
  
  @keyframes fade-in-out {
    0% {
      opacity: 0;
      transform: translateY(-5px);
    }
    10% {
      opacity: 1;
      transform: translateY(0);
    }
    90% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-5px);
    }
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
    
    .lock-button {
      font-size: 1rem;
    }
  }
</style>
