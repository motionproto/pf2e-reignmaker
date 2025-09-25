<script lang="ts">
  import { onMount } from 'svelte';
  
  export let title: string;
  export let description: string = '';
  export let icon: string = '';
  export let onNextPhase: (() => void) | undefined = undefined;
  export let isUpkeepPhase: boolean = false;
  export let currentTurn: number = 1;
  
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
      <button class="next-phase-button" on:click={onNextPhase}>
        {#if isUpkeepPhase}
          End Turn {currentTurn}
          <i class="fas fa-calendar-check"></i>
        {:else}
          Next Phase
          <i class="fas fa-arrow-right"></i>
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .phase-header-wrapper {
    margin-bottom: 0
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
    border: 1px solid var(--border-subtle);
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
    margin-right: 0rem;
  }

  .next-phase-button {
    padding: 10px 16px;
    background: var(--btn-primary-bg, #5e0000);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--type-button-size);
    font-weight: var(--type-button-weight);
    line-height: var(--type-button-line);
    letter-spacing: var(--type-button-spacing);
    font-family: var(--base-font);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .next-phase-button:hover {
    background: var(--btn-primary-hover, #3e0000);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .next-phase-button i {
    font-size: 0.85em;
  }

  .phase-text {
    flex: 1;
    z-index: 1;
    position: relative;
  }

  .phase-text h2 {
    margin: 0;
    font-size: var(--font-3xl);
    font-weight: 700;
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

    .next-phase-button {
      padding: 8px 16px;
      font-size: var(--font-sm);
    }
  }
</style>
