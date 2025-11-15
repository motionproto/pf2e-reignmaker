<!--
  WorksiteTypeSelector - Custom selector component for worksite type selection
  
  Used by hex-selector when creating worksites. Shows valid worksite types
  for the selected hex and allows user to pick one.
-->

<script lang="ts">
  import { getValidWorksiteTypes, WORKSITE_TYPES, type WorksiteType } from '../../actions/create-worksite/worksiteValidator';
  import { getKingdomData } from '../../stores/KingdomStore';
  
  // Props passed by hex-selector
  export let selectedHex: string;
  export let onSelect: (metadata: { worksiteType: WorksiteType }) => void;
  
  let selectedType: WorksiteType | null = null;
  
  // Get valid types for this hex
  $: validTypes = selectedHex ? getValidWorksiteTypes(selectedHex) : [];
  
  // Get hex terrain for revenue calculation
  $: hexTerrain = selectedHex ? getHexTerrain(selectedHex) : null;
  
  // Auto-call onSelect when type is selected
  $: if (selectedType) {
    onSelect({ worksiteType: selectedType });
  }
  
  function handleTypeClick(type: WorksiteType) {
    const isValid = validTypes.includes(type);
    if (isValid) {
      selectedType = type;
    }
  }
  
  function getTypeIcon(type: WorksiteType): string {
    // Use resource icons from presentation.ts
    switch (type) {
      case 'Farmstead': return 'fa-wheat-awn';     // Food
      case 'Logging Camp': return 'fa-tree';       // Lumber
      case 'Mine': return 'fa-mountain';           // Ore
      case 'Quarry': return 'fa-cube';             // Stone
      default: return 'fa-industry';
    }
  }
  
  function getHexTerrain(hexId: string): string | null {
    const kingdom = getKingdomData();
    const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
    return hex?.terrain || null;
  }
  
  /**
   * Calculate revenue for a worksite type based on terrain
   * Replicates logic from production.ts
   */
  function getWorksiteRevenue(type: WorksiteType, terrain: string | null): string {
    if (!terrain) return '';
    
    const normalizedTerrain = terrain.toLowerCase();
    
    switch (type) {
      case 'Farmstead':
        if (normalizedTerrain === 'plains') {
          return '+2 Food';
        } else {
          return '+1 Food';
        }
        
      case 'Logging Camp':
        if (normalizedTerrain === 'forest') {
          return '+2 Lumber';
        }
        return '';
        
      case 'Quarry':
        if (normalizedTerrain === 'hills' || normalizedTerrain === 'mountains') {
          return '+1 Stone';
        }
        return '';
        
      case 'Mine':
        if (normalizedTerrain === 'mountains' || normalizedTerrain === 'swamp') {
          return '+1 Ore';
        }
        return '';
        
      default:
        return '';
    }
  }
</script>

<div class="worksite-type-selector">
  <div class="selector-header">
    <i class="fas fa-industry"></i>
    Select Worksite Type
  </div>
  
  <div class="type-grid">
    {#each WORKSITE_TYPES as type}
      {@const isValid = validTypes.includes(type)}
      {@const isSelected = selectedType === type}
      
      <button
        class="type-button"
        class:valid={isValid}
        class:invalid={!isValid}
        class:selected={isSelected}
        on:click={() => handleTypeClick(type)}
        disabled={!isValid}
      >
        <div class="button-content">
          <div class="button-main">
            <i class="fas {getTypeIcon(type)} type-icon"></i>
            <span class="type-name">{type}</span>
            {#if isSelected}
              <i class="fas fa-check-circle selected-indicator"></i>
            {/if}
          </div>
          {#if isValid && hexTerrain}
            {@const revenue = getWorksiteRevenue(type, hexTerrain)}
            {#if revenue}
              <div class="revenue-text">{revenue}</div>
            {/if}
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .worksite-type-selector {
    padding: var(--space-12) 0;
    border-top: 1px solid var(--color-border-low);
  }
  
  .selector-header {
    font-size: var(--font-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-8);
    display: flex;
    align-items: center;
    gap: var(--space-6);
    
    i {
      color: var(--color-accent);
    }
  }
  
  .type-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }
  
  .type-button {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--space-10) var(--space-12);
    background: var(--hover-low);
    border: 2px solid var(--color-border-low);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
    
    &.valid {
      border-color: var(--color-accent);
      
      &:hover {
        background: var(--hover-mid);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px var(--overlay-mid);
      }
      
      &.selected {
        background: rgba(210, 105, 30, 0.2);
        border-color: var(--color-accent);
        box-shadow: 0 0 12px rgba(210, 105, 30, 0.4);
      }
    }
    
    &.invalid {
      opacity: 0.4;
      cursor: not-allowed;
      filter: grayscale(0.8);
      
      &:hover {
        transform: none;
      }
    }
  }
  
  .button-content {
    width: 100%;
  }
  
  .button-main {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-8);
  }
  
  .type-icon {
    font-size: var(--font-lg);
    color: var(--color-accent);
    flex-shrink: 0;
    width: 20px;
    text-align: center;
    
    .invalid & {
      color: var(--text-muted);
    }
  }
  
  .type-name {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-sm);
    color: var(--text-primary);
    flex: 1;
    text-align: left;
    
    .invalid & {
      color: var(--text-muted);
    }
  }
  
  .selected-indicator {
    color: var(--color-success);
    font-size: var(--font-md);
    flex-shrink: 0;
    animation: checkmark-appear 0.3s ease;
  }
  
  .revenue-text {
    font-size: var(--font-xs);
    color: var(--text-muted);
    margin-top: var(--space-4);
    padding-left: 28px; /* Align with type name (icon 20px + gap 8px) */
    text-align: left;
  }
  
  @keyframes checkmark-appear {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
