<script lang="ts">
  import { onMount } from 'svelte';
  
  export let title: string;
  export let description: string = '';
  export let icon: string = '';
  
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
    <div class="phase-text">
      <h2>{title}</h2>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    {#if icon}
      <i class="{icon} phase-icon"></i>
    {/if}
  </div>
</div>

<style>
  .phase-header-wrapper {
    margin-bottom: 1.5rem;
  }

  .phase-header {
    padding: 1.25rem 1.5rem;
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay));
    border: 1px solid var(--border-subtle);
  }


  /* Add a fade-in effect when phase changes */
  .phase-header.phase-changed {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    0% {
      opacity: 0.7;
    }
    100% {
      opacity: 1;
    }
  }

  .phase-icon {
    font-size: 1.75rem;
    color: var(--text-primary);
    opacity: 0.95;
    z-index: 1;
    position: relative;
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
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--text-primary);
    text-shadow: var(--text-shadow-md);
    letter-spacing: 0.025em;
  }

  .phase-text p {
    margin: var(--space-2) 0 0;
    font-size: var(--font-md);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--text-primary);
    opacity: 0.85;
  }


  /* Responsive design */
  @media (max-width: 768px) {
    .phase-header {
      padding: 1rem 1.25rem;
    }
    
    .phase-icon {
      font-size: 1.5rem;
    }
    
    .phase-text h2 {
      font-size: var(--font-2xl);
    }
    
    .phase-text p {
      font-size: var(--font-sm);
    }
  }
</style>
