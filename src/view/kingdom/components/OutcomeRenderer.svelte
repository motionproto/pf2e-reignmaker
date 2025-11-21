<!--
  OutcomeRenderer - Unified wrapper for outcome display
  
  Handles both standard and custom outcome components using a unified interface.
  
  Pattern:
  - Standard outcomes: Use StandardOutcomeDisplay (default)
  - Custom outcomes: Use component specified in preview.appliedOutcome.component
  
  All components receive the same minimal interface:
  - preview: OutcomePreview (all data)
  - instance: ActiveCheckInstance (state management)
  - ...componentProps: Component-specific extras
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { OutcomePreview } from '../../../models/OutcomePreview';
  // StandardOutcomeDisplay will be created in next step - for now fallback to current OutcomeDisplay
  import OutcomeDisplay from './OutcomeDisplay/OutcomeDisplay.svelte';
  
  export let preview: OutcomePreview;
  export let instance: OutcomePreview | null = null;
  
  const dispatch = createEventDispatcher();
  
  // Pick component: custom or standard
  // Support both new (component) and legacy (customComponent) fields
  // Note: Will use StandardOutcomeDisplay once it's created (next step)
  $: component = preview.appliedOutcome?.component || 
                 preview.appliedOutcome?.customComponent || 
                 OutcomeDisplay;
  
  // Get component-specific props
  // Support both new (componentProps) and legacy (customResolutionProps) fields
  $: props = preview.appliedOutcome?.componentProps || 
             preview.appliedOutcome?.customResolutionProps || 
             {};
  
  // Forward all events from child component
  function forwardEvent(event: CustomEvent) {
    dispatch(event.type, event.detail);
  }
</script>

<svelte:component 
  this={component} 
  {preview} 
  {instance}
  {...props}
  on:primary={forwardEvent}
  on:cancel={forwardEvent}
  on:performReroll={forwardEvent}
  on:customSelection={forwardEvent}
  on:resourceSelected={forwardEvent}
  on:diceRolled={forwardEvent}
  on:choiceSelected={forwardEvent}
  on:ignore={forwardEvent}
/>
