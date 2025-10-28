<script lang="ts">
   export let title: string;
   export let description: string;
   export let impact: string = '';
   export let variant: 'info' | 'warning' | 'danger' | 'success' = 'info';
   export let icon: string = '';
   
   // Default icons based on variant
   const defaultIcons = {
      info: 'fas fa-info-circle',
      warning: 'fas fa-exclamation-triangle',
      danger: 'fas fa-times-circle',
      success: 'fas fa-check-circle'
   };
   
   $: displayIcon = icon || defaultIcons[variant];
</script>

<div class="notification" class:info={variant === 'info'} class:warning={variant === 'warning'} class:danger={variant === 'danger'} class:success={variant === 'success'}>
   <div class="notification-header">
      <i class={displayIcon}></i>
      <span class="notification-title">{title}</span>
   </div>
   <div class="notification-description">{description}</div>
   {#if impact}
      <div class="notification-impact">{impact}</div>
   {/if}
</div>

<style lang="scss">
   .notification {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 8px;
      padding: 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      border: 1px solid;
      transition: all var(--transition-fast);
      position: relative;
      
      // Prevent any inherited ::before or ::after pseudo-elements
      &::before,
      &::after {
         content: none;
         display: none;
      }
      
      // Info variant (blue)
      &.info {
         background: rgba(59, 130, 246, 0.1);
         border-color: var(--color-blue);
         color: var(--color-blue-light, #93c5fd);
         
         .notification-header i {
            color: var(--color-blue);
         }
      }
      
      // Warning variant (amber/yellow)
      &.warning {
         background: rgba(245, 158, 11, 0.1);
         border-color: var(--color-amber);
         color: var(--color-amber-light);
         
         .notification-header i {
            color: var(--color-amber);
         }
      }
      
      // Danger variant (red)
      &.danger {
         background: rgba(239, 68, 68, 0.1);
         border-color: var(--color-red);
         color: var(--color-red-light, #fca5a5);
         
         .notification-header i {
            color: var(--color-red);
         }
      }
      
      // Success variant (green)
      &.success {
         background: rgba(34, 197, 94, 0.1);
         border-color: var(--color-green);
         color: var(--color-green-light, #86efac);
         
         .notification-header i {
            color: var(--color-green);
         }
      }
   }
   
   .notification-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      text-align: left;
      
      i {
         font-size: 16px;
         flex-shrink: 0;
      }
      
      .notification-title {
         font-weight: var(--font-weight-semibold);
         font-size: var(--font-sm);
         text-align: left;
      }
   }
   
   .notification-description {
      opacity: 0.85;
      line-height: 1.4;
      font-size: var(--font-sm);
      text-align: left;
   }
   
   .notification-impact {
      font-weight: var(--font-weight-semibold);
      padding-top: 6px;
      margin-top: 2px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      font-size: var(--font-sm);
      text-align: left;
   }
</style>
