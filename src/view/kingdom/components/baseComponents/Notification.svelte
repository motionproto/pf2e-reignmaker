<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import Button from './Button.svelte';
   
   export let title: string;
   export let description: string;
   export let impact: string = '';
   export let variant: 'info' | 'warning' | 'danger' | 'success' = 'info';
   export let icon: string = '';
   export let dismissible: boolean = false;
   export let emphasis: boolean = false;
   
   // Action button props
   export let actionText: string = '';
   export let actionIcon: string = '';
   export let onAction: (() => void) | undefined = undefined;
   export let actionInline: boolean = false;
   export let actionHeader: boolean = false; // NEW: Show action button in header row
   
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
   <div class="notification-rm-header" class:has-action={actionHeader && onAction}>
      <i class={displayIcon}></i>
      <span class="notification-rm-title">{title}</span>
      {#if actionHeader && onAction}
         <Button variant="outline" icon={actionIcon} on:click={onAction}>
            {actionText}
         </Button>
      {/if}
      {#if dismissible}
         <button class="notification-rm-close" on:click={handleDismiss} type="button" aria-label="Dismiss">
            <i class="fas fa-times"></i>
         </button>
      {/if}
   </div>
   {#if description && !actionInline}
      <div class="notification-rm-description">{description}</div>
   {/if}
   {#if impact}
      <div class="notification-rm-impact">{impact}</div>
   {/if}
   {#if onAction && !actionHeader}
      {#if actionInline}
         <div class="notification-rm-actions-inline">
            {#if description}
               <span class="description-text">{description}</span>
            {/if}
            <Button variant="outline" icon={actionIcon} on:click={onAction}>
               {actionText}
            </Button>
         </div>
      {:else}
         <div class="notification-rm-actions">
            <Button variant="outline" icon={actionIcon} on:click={onAction}>
               {actionText}
            </Button>
         </div>
      {/if}
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
         border-color: var(--info-border);
         color: var(--info-text);
         
         .notification-rm-header {
            background: var(--info-background);
            
            i {
               color: var(--info-icon);
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
      
      // When action button is in header, add spacing
      &.has-action {
         gap: 12px;
      }
      
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
      
      // Action button in header
      :global(button) {
         flex-shrink: 0;
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
   
   // Action buttons - inline variant
   .notification-rm-actions-inline {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      
      .description-text {
         flex: 1;
         line-height: 1.4;
         font-size: var(--font-md);
         font-weight: var(--font-weight-light);
      }
      
      // Button stays on the right (doesn't shrink or grow)
      :global(button) {
         flex-shrink: 0;
         margin-left: auto;
      }
   }
   
   // Action buttons - standard (below description)
   .notification-rm-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
   }
</style>
