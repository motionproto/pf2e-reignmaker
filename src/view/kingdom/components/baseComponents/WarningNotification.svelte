<script lang="ts">
   export let title: string;
   export let description: string;
   export let impact: string = '';
</script>

<div class="warning-notification">
   <div class="warning-header">
      <i class="fas fa-exclamation-triangle"></i>
      <span class="warning-title">{title}</span>
   </div>
   <div class="warning-description">{description}</div>
   {#if impact}
      <div class="warning-impact">{impact}</div>
   {/if}
</div>

<style lang="scss">
   .warning-notification {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-sm);
      color: var(--color-amber-light);
      font-size: var(--font-base);
   }
   
   .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      
      i {
         font-size: 18px;
         flex-shrink: 0;
         color: var(--color-amber);
      }
      
      .warning-title {
         font-weight: var(--font-weight-bold);
         font-size: var(--font-lg);
         color: var(--color-amber-light);
      }
   }
   
   .warning-description {
      opacity: 0.9;
      line-height: 1.5;
   }
   
   .warning-impact {
      font-weight: var(--font-weight-semibold);
      color: var(--color-amber-light);
      padding-top: 4px;
      border-top: 1px solid rgba(245, 158, 11, 0.3);
   }
</style>
