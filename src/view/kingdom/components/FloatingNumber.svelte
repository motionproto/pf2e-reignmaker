<script lang="ts">
  import { onMount } from 'svelte';
  import { removeAnimation } from '../../../stores/ValueChangeStore';
  
  // Props
  export let animationId: string;
  export let resource: string;
  export let delta: number;
  export let startX: number = 0;
  export let startY: number = 0;
  
  // Inverted color logic for unrest/imprisoned (negative is good, positive is bad)
  $: isUnrestRelated = resource === 'unrest' || resource === 'prison';
  
  // Color based on delta (inverted for unrest)
  $: color = isUnrestRelated
    ? (delta > 0 ? 'var(--color-danger)' : 'var(--color-success)')
    : (delta > 0 ? 'var(--color-success)' : 'var(--color-danger)');
  
  $: displayText = delta > 0 ? `+${delta}` : `${delta}`;
  
  // Auto-remove after animation completes (4.6s)
  onMount(() => {

    const timeout = setTimeout(() => {

      removeAnimation(animationId);
    }, 4600);
    
    return () => clearTimeout(timeout);
  });
</script>

<div 
  class="floating-number" 
  style="--start-x: {startX}px; --start-y: {startY}px; --delta-color: {color};"
>
  {displayText}
</div>

<style>
  .floating-number {
    position: absolute;
    left: var(--start-x);
    top: var(--start-y);
    transform: translate(-50%, -50%); /* Center the number on its position */
    font-size: var(--font-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--delta-color);
    pointer-events: none;
    z-index: 1000;
    /* Outside stroke effect using 8-directional shadows */
    text-shadow: /* Stroke outline (8 directions) */ -0.125rem -0.125rem 0 var(--overlay-higher), 0 -0.125rem 0 var(--overlay-higher), 0.125rem -0.125rem 0 var(--overlay-higher), 0.125rem 0 0 var(--overlay-higher), 0.125rem 0.125rem 0 var(--overlay-higher), 0 0.125rem 0 var(--overlay-higher), -0.125rem 0.125rem 0 var(--overlay-higher), -0.125rem 0 0 var(--overlay-higher), /* Glow layers for extra visibility */ 0 0 0.25rem var(--overlay-higher), 0 0 0.5rem var(--overlay-higher), 0 0 0.75rem var(--overlay-high);
    
    /* Combined animation */
    animation: 
      pulse 0.5s ease-out,
      fade-out 0.5s ease-out 5s forwards;
  }
  
  /* Pulse animation: fade in + scale 1→1.2→1 (0-0.6s) */
  @keyframes pulse {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.2);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  
  /* Fade out: opacity 1→0 (4.1-4.6s = 0.5s duration) */
  @keyframes fade-out {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
