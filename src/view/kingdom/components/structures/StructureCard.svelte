<script lang="ts">
  import type { Structure } from '../../../../models/Structure';
  import StructureCardHeader from './StructureCardHeader.svelte';
  import StructureCardCost from './StructureCardCost.svelte';
  import StructureCardEffects from './StructureCardEffects.svelte';
  
  export let structure: Structure;
  export let tier: number;
</script>

<div class="structure-card">
  <StructureCardHeader {structure} {tier} />
  
  <!-- Split Layout: Thumbnail | Info -->
  <div class="structure-details">
    <!-- Thumbnail Placeholder -->
    <div class="structure-thumbnail">
      <div class="thumbnail-placeholder">
        <span>Image</span>
      </div>
    </div>
    
    <!-- Info Section -->
    <div class="structure-info">
      <StructureCardCost constructionCost={structure.constructionCost} />
      <StructureCardEffects {structure} />
    </div>
  </div>
</div>

<style lang="scss">
  .structure-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 1rem;
    transition: all 0.2s;
    
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      background: rgba(0, 0, 0, 0.3);
    }
  }
  
  .structure-details {
    display: flex;
    gap: 1rem;
  }
  
  .structure-thumbnail {
    flex: 0 0 100px;
    height: 100px;
    
    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      font-size: var(--font-s);
    }
  }
  
  .structure-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
