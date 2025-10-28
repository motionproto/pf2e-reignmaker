<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let title: string;
   export let description: string;
   export let impact: string = '';
   export let variant: 'info' | 'warning' | 'danger' | 'success' = 'info';
   export let icon: string = '';
   export let dismissible: boolean = false;
   export let emphasis: boolean = false;
   
   const dispatch = createEventDispatcher();
   
   // Default icons based on variant
   const defaultIcons = {
      info: 'fas fa-info-circle',
      warning: 'fas fa-exclamation-triangle',
      danger: 'fas fa-times-circle',
      success: 'fas fa-check-circle'
   };
   
   $: displayIcon = icon || defaultIcons[variant];
   
   function handleDismiss() {
      dispatch('dismiss');
   }
</script>

<div class="notification-rm" class:info={variant === 'info'} class:warning={variant === 'warning'} class:danger={variant === 'danger'} class:success={variant === 'success'} class:emphasis={emphasis}>
   <div class="notification-rm-header">
      <i class={displayIcon}></i>
      <span class="notification-rm-title">{title}</span>
      {#if dismissible}
         <button class="notification-rm-close" on:click={handleDismiss} type="button" aria-label="Dismiss">
            <i class="fas fa-times"></i>
         </button>
      {/if}
   </div>
   <div class="notification-rm-description">{description}</div>
   {#if impact}
      <div class="notification-rm-impact">{impact}</div>
   {/if}
</div>

<style lang="scss">
   .notification-rm {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      gap: 0;
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      border: 1px solid;
      transition: all var(--transition-fast);
      position: relative;
      text-align: left;
      overflow: hidden;
      
      &.emphasis {
         border-left-width: 6px;
      }
      
      // Info variant (blue)
      &.info {
         border-color: var(--color-blue);
         color: var(--color-blue-light, #93c5fd);
         
         .notification-rm-header {
            background: rgba(59, 130, 246, 0.15);
            
            i {
               color: var(--color-blue);
            }
         }
      }
      
      // Warning variant (amber/yellow)
      &.warning {
         border-color: var(--color-amber);
         color: var(--color-amber-light);
         
         .notification-rm-header {
            background: rgba(245, 158, 11, 0.15);
            
            i {
               color: var(--color-amber);
            }
         }
      }
      
      // Danger variant (red)
      &.danger {
         border-color: var(--color-red);
         color: var(--color-red-light, #fca5a5);
         
         .notification-rm-header {
            background: rgba(239, 68, 68, 0.15);
            
            i {
               color: var(--color-red);
            }
         }
      }
      
      // Success variant (green)
      &.success {
         border-color: var(--color-green);
         color: var(--color-green-light, #86efac);
         
         .notification-rm-header {
            background: rgba(34, 197, 94, 0.15);
            
            i {
               color: var(--color-green);
            }
         }
      }
   }
   
   .notification-rm-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      width: 100%;
      padding: .5rem 1rem;
      position: relative;
      
      i {
         font-size: 16px;
         flex-shrink: 0;
      }
      
      .notification-rm-title {
         font-weight: var(--font-weight-semibold);
         font-size: var(--font-lg);
         text-align: left;
         flex: 1;
      }
      
      .notification-rm-close {
         position: absolute;
         top: 50%;
         right: 0.5rem;
         transform: translateY(-50%);
         background: none;
         border: none;
         cursor: pointer;
         padding: 0.25rem;
         display: flex;
         align-items: center;
         justify-content: center;
         opacity: 0.7;
         transition: opacity var(--transition-fast);
         
         i {
            font-size: 14px;
            color: inherit;
         }
         
         &:hover {
            opacity: 1;
         }
         
         &:focus {
            outline: 2px solid currentColor;
            outline-offset: 2px;
            border-radius: 2px;
         }
      }
   }
   
   .notification-rm-description {
      line-height: 1.4;
      font-size: var(--font-md);
      font-weight: var(--font-weight-light);
      text-align: left;
      padding: .75rem 1rem;
   }
   
   .notification-rm-impact {
      font-weight: var(--font-weight-bold);
      padding: 12px;
      padding-top: 8px;
      margin-top: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: var(--font-md);
      text-align: left;
   }
</style>
