<script lang="ts">
  export let outcome: string;
  export let actorName: string;
  export let skillName: string | undefined = undefined;
  
  interface OutcomeProps {
    label: string;
    icon: string;
    colorClass: string;
    surfaceClass: string;
  }
  
  function getOutcomeDisplayProps(outcome: string): OutcomeProps {
    switch (outcome) {
      case 'criticalSuccess':
        return { 
          label: 'Critical Success', 
          icon: 'fas fa-trophy', 
          colorClass: 'critical-success',
          surfaceClass: 'surface-success'
        };
      case 'success':
        return { 
          label: 'Success', 
          icon: 'fas fa-check-circle', 
          colorClass: 'success',
          surfaceClass: 'surface-success'
        };
      case 'failure':
        return { 
          label: 'Failure', 
          icon: 'fas fa-exclamation-triangle', 
          colorClass: 'failure',
          surfaceClass: 'surface-warning'
        };
      case 'criticalFailure':
        return { 
          label: 'Critical Failure', 
          icon: 'fas fa-skull-crossbones', 
          colorClass: 'critical-failure',
          surfaceClass: 'surface-primary'
        };
      default:
        return { 
          label: outcome, 
          icon: 'fas fa-question-circle', 
          colorClass: 'neutral',
          surfaceClass: 'surface-neutral'
        };
    }
  }
  
  $: outcomeProps = getOutcomeDisplayProps(outcome);
</script>

<div class="resolution-header {outcomeProps.surfaceClass}">
  <div class="resolution-header-left {outcomeProps.colorClass}">
    <i class={outcomeProps.icon}></i>
    <span>{outcomeProps.label}</span>
  </div>
  <div class="resolution-header-right">
    {#if actorName}
      <div class="actor-info">
        {actorName}{#if skillName}&nbsp;used {skillName}{/if}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .resolution-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-12) var(--space-16);
    border-bottom: 1px solid var(--border-faint);
    
    // Surface color variants
    &.surface-success {
      background: var(--surface-success-low);
    }
    
    &.surface-warning {
      background: var(--surface-warning-low);
    }
    
    &.surface-primary {
      background: var(--surface-primary-low);
    }
    
    &.surface-neutral {
      background: var(--overlay);
    }
    
    .resolution-header-left {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      
      i {
        font-size: var(--font-xl);
      }
      
      > span:first-of-type {
        text-transform: capitalize;
      }
      
      // Success colors
      &.critical-success {
        color: var(--color-green);
      }
      
      &.success {
        color: var(--color-green);
      }
      
      // Fail colors
      &.failure {
        color: var(--color-orange);
      }
      
      &.critical-failure {
        color: var(--color-red);
      }
    }
    
    .resolution-header-right {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      
      .actor-info {
        color: var(--text-secondary);
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
      }
    }
  }
</style>
