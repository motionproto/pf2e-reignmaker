<script lang="ts">
  export let outcome: string;
  export let actorName: string;
  export let skillName: string | undefined = undefined;
  
  interface OutcomeProps {
    label: string;
    icon: string;
    colorClass: string;
  }
  
  function getOutcomeDisplayProps(outcome: string): OutcomeProps {
    switch (outcome) {
      case 'criticalSuccess':
        return { 
          label: 'Critical Success', 
          icon: 'fas fa-trophy', 
          colorClass: 'critical-success' 
        };
      case 'success':
        return { 
          label: 'Success', 
          icon: 'fas fa-check-circle', 
          colorClass: 'success' 
        };
      case 'failure':
        return { 
          label: 'Failure', 
          icon: 'fas fa-exclamation-triangle', 
          colorClass: 'failure' 
        };
      case 'criticalFailure':
        return { 
          label: 'Critical Failure', 
          icon: 'fas fa-skull-crossbones', 
          colorClass: 'critical-failure' 
        };
      default:
        return { 
          label: outcome, 
          icon: 'fas fa-question-circle', 
          colorClass: 'neutral' 
        };
    }
  }
  
  $: outcomeProps = getOutcomeDisplayProps(outcome);
</script>

<div class="resolution-header">
  <div class="resolution-header-left">
    <i class={outcomeProps.icon}></i>
    <span>{outcomeProps.label}</span>
  </div>
  {#if actorName}
    <div class="resolution-header-right">
      {actorName}{#if skillName}&nbsp;used {skillName}{/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .resolution-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid var(--border-subtle);
    
    .resolution-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      
      i {
        font-size: 20px;
      }
      
      > span:first-of-type {
        text-transform: capitalize;
      }
    }
    
    .resolution-header-right {
      color: var(--text-secondary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
    }
  }
</style>
