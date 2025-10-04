<script lang="ts">
  import type { Structure } from '../../../../../models/Structure';
  
  export let structure: Structure;
</script>

<div class="structure-built">
  <span class="structure-built-name">{structure.name}</span>
  <span class="structure-built-status">
    <i class="fas fa-check"></i>
    Built
  </span>
</div>

<style lang="scss">
  .structure-built {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    opacity: 0.7;
    
    .structure-built-name {
      font-size: var(--font-md);
      color: var(--text-secondary);
    }
    
    .structure-built-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--font-sm);
      color: var(--color-green);
      opacity: 0.8;
      
      i {
        font-size: var(--font-sm);
      }
    }
  }
</style>
