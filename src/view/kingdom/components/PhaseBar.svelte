<script lang="ts">
  import { kingdomState, setCurrentPhase } from '../../../stores/kingdom';
  import { TurnPhase } from '../../../models/KingdomState';

  // Define the phases in order
  const phases = [
    { id: TurnPhase.PHASE_I, label: 'Status', fullName: 'Gain Fame and apply ongoing modifiers' },
    { id: TurnPhase.PHASE_II, label: 'Resources', fullName: 'Collect resources and manage consumption' },
    { id: TurnPhase.PHASE_III, label: 'Unrest', fullName: 'Calculate unrest and resolve incidents' },
    { id: TurnPhase.PHASE_IV, label: 'Events', fullName: 'Resolve kingdom events' },
    { id: TurnPhase.PHASE_V, label: 'Actions', fullName: 'Perform kingdom actions' },
    { id: TurnPhase.PHASE_VI, label: 'Resolution', fullName: 'End of turn cleanup' }
  ];

  $: currentPhase = $kingdomState.currentPhase;
  
  function getPhaseIndex(phase: TurnPhase): number {
    return phases.findIndex(p => p.id === phase);
  }
  
  $: currentPhaseIndex = getPhaseIndex(currentPhase);

  function handlePhaseClick(phase: TurnPhase) {
    // Allow switching to any phase (you can restrict this if needed)
    setCurrentPhase(phase);
  }

  function isPhaseActive(phase: TurnPhase): boolean {
    return phase === currentPhase;
  }
  
  function isPhaseCompleted(phaseIndex: number): boolean {
    return phaseIndex < currentPhaseIndex;
  }
</script>

<div class="phase-bar">
  <div class="phase-bar-inner">
    {#each phases as phase, index}
      <!-- Phase connector line (before phase except for first) -->
      {#if index > 0}
        <div class="phase-connector" class:completed={isPhaseCompleted(index)}></div>
      {/if}
      
      <!-- Phase button -->
      <button
        class="phase-item"
        class:active={isPhaseActive(phase.id)}
        class:completed={isPhaseCompleted(index)}
        on:click={() => handlePhaseClick(phase.id)}
        title={phase.fullName}
      >
        <span class="phase-label">{phase.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .phase-bar {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0 1rem;
  }

  .phase-bar-inner {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0;
    max-width: 900px;
    margin: 0 auto;
  }
  
  .phase-connector {
    width: 30px;
    height: 2px;
    background: rgba(180, 170, 150, 0.3);
    transition: background 0.3s ease;
  }
  
  .phase-connector.completed {
    background: var(--color-primary, #5e0000);
    box-shadow: 0 0 4px rgba(94, 0, 0, 0.4);
  }

  .phase-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(180, 170, 150, 0.3);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 100px;
    position: relative;
    color: var(--color-text-dark-secondary, #7a7971);
  }

  .phase-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-color: rgba(180, 170, 150, 0.5);
  }

  .phase-item.completed {
    background: rgba(94, 0, 0, 0.1);
    border-color: rgba(94, 0, 0, 0.3);
    color: var(--color-text-dark-primary, #b5b3a4);
  }

  .phase-item.active {
    background: var(--color-primary, #5e0000);
    color: #fff;
    border-color: var(--color-primary-dark, #3e0000);
    box-shadow: 0 4px 12px rgba(94, 0, 0, 0.4);
    transform: scale(1.05);
  }

  .phase-item.active .phase-label {
    color: #fff;
    font-weight: bold;
  }

  .phase-label {
    font-size: 0.75rem;
    font-weight: 500;
    font-family: var(--font-primary, system-ui);
    text-align: center;
    line-height: 1.2;
    opacity: 0.9;
  }

  /* Animation for active phase */
  @keyframes pulse {
    0% {
      box-shadow: 0 4px 12px rgba(94, 0, 0, 0.4);
    }
    50% {
      box-shadow: 0 4px 20px rgba(94, 0, 0, 0.6);
    }
    100% {
      box-shadow: 0 4px 12px rgba(94, 0, 0, 0.4);
    }
  }

  .phase-item.active {
    animation: pulse 2s infinite ease-in-out;
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
  }
</style>
