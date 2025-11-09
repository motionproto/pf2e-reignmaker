<script lang="ts">
   export let icon: string;
   export let value: string | number;
   export let label: string;
   export let variant: 'required' | 'available' | 'storage' | 'default' = 'default';
   export let status: 'normal' | 'danger' | 'warning' = 'normal';
   
   // Determine icon color class based on variant and icon type
   $: iconColorClass = icon.includes('resource-food') ? 'resource-food' : 
                       icon.includes('resource-gold') ? 'resource-gold' :
                       variant === 'required' ? 'color-secondary' :
                       variant === 'storage' ? 'color-blue' :
                       'color-amber';
</script>

<div class="resource-stat" class:danger={status === 'danger'} class:warning={status === 'warning'}>
   <i class="{icon} {iconColorClass}"></i>
   <div class="stat-value">{value}</div>
   <div class="stat-label">{label}</div>
</div>

<style lang="scss">
   .resource-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      flex: 1;
      min-width: 5rem;
      
      i {
         font-size: var(--font-3xl);
         margin-bottom: var(--space-4);
         
         &.resource-food {
            color: var(--color-green);
         }
         
         &.resource-gold {
            color: var(--color-gold);
         }
         
         &.color-secondary {
            color: var(--text-secondary);
         }
         
         &.color-amber {
            color: var(--color-amber);
         }
         
         &.color-blue {
            color: var(--color-blue);
         }
      }
      
      .stat-value {
         font-size: var(--font-lg);
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
         margin: var(--space-2) 0;
      }
      
      .stat-label {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         letter-spacing: 0.025rem;
         color: var(--text-secondary);
         text-transform: uppercase;
      }
      
      &.danger {
         i {
            color: var(--color-red);
         }
         
         .stat-value {
            color: var(--color-red);
         }
      }
      
      &.warning {
         i:not(.resource-food):not(.resource-gold) {
            color: var(--color-amber);
         }
         
         .stat-value {
            color: var(--color-amber-light);
         }
      }
   }
</style>
