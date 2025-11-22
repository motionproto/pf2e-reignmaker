<!--
  WorksiteTypeSelector - Custom selector component for worksite type selection
  
  Used by hex-selector when creating worksites. Shows valid worksite types
  for the selected hex and allows user to pick one.
-->

<script lang="ts">
  import { getValidWorksiteTypes, WORKSITE_TYPES, type WorksiteType } from '../../pipelines/shared/worksiteValidator';
  import { getKingdomData } from '../../stores/KingdomStore';
  
  // Props passed by hex-selector
  export let selectedHex: string;
  export let onSelect: (metadata: { worksiteType: WorksiteType }) => void;
  
  let selectedType: WorksiteType | null = null;
  let lastSelectedHex: string = selectedHex; // ← Initialize with current value
  
  // Get valid types for this hex
  $: validTypes = selectedHex ? getValidWorksiteTypes(selectedHex) : [];
  
  // Get hex terrain for revenue calculation
  $: hexTerrain = selectedHex ? getHexTerrain(selectedHex) : null;
  
  // Reset selection only when hex prop actually changes (not on initial mount)
  $: if (selectedHex !== lastSelectedHex && lastSelectedHex !== '') {
    console.log('[WorksiteTypeSelector] Hex changed from', lastSelectedHex, 'to', selectedHex);
    console.log('[WorksiteTypeSelector] Resetting selectedType from', selectedType);
    selectedType = null;
    lastSelectedHex = selectedHex;
  } else if (lastSelectedHex === '') {
    // Initial mount - just update lastSelectedHex without resetting
    lastSelectedHex = selectedHex;
  }
  
  // Call onSelect when type is selected (but don't auto-trigger on hex change)
  function handleTypeClick(type: WorksiteType) {
    console.log('[WorksiteTypeSelector] Button clicked:', type);
    console.log('[WorksiteTypeSelector] Current selectedType:', selectedType);
    console.log('[WorksiteTypeSelector] Valid types:', validTypes);
    
    const isValid = validTypes.includes(type);
    if (isValid) {
      selectedType = type;
      console.log('[WorksiteTypeSelector] Set selectedType to:', selectedType);
      // Explicitly call onSelect instead of reactive statement
      onSelect({ worksiteType: selectedType });
    } else {
      console.warn('[WorksiteTypeSelector] Type not valid:', type);
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
    border-top: var(--border-width) solid var(--border-low);
  }
  
  .selector-header {
    font-size: var(--font-lg);
    color: var(--text-primary);
    margin-bottom: var(--space-12);
    font-weight: var(--font-weight-semibold);
  }
  
  .type-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-10);
    margin-bottom: var(--space-12);
  }
  
  .type-button {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--space-10) var(--space-16);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
    box-sizing: border-box;
    min-width: 0;
    min-height: max-content;
    
    /* Outline variant (deselected state) */
    background: var(--surface-low);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
    
    /* Hover state (only for valid, unselected) */
    &.valid:hover:not(.selected) {
       background: var(--surface-low);
      border-color: var(--border-strong);
      transform: translateY(-0.0625rem);
      box-shadow: var(--shadow-md);
    }
    
    /* Success variant (selected state) */
    &.valid.selected {
      background: var(--surface-success-lower);
      border: 1px solid var(--border-strong);
      outline: 2px solid var(--border-success);
      outline-offset: 0;
      color: var(--text-success);
      
      &:hover {
        background: var(--surface-success-low);
        outline-color: var(--border-success-medium);
        color: var(--text-primary);
      }
    }
    
    /* Disabled state */
    &.invalid {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
      background: transparent;
      border-color: var(--border-faint);
      color: var(--text-tertiary);
    }
  }
  
  .button-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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
    color: var(--text-secondary);
    flex-shrink: 0;
    width: var(--space-16);
    text-align: center;
  }
  
  .type-name {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-md);
    color: var(--text-primary);
    flex: 1;
    text-align: left;
  }
  
  .revenue-text {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    padding-left: calc(var(--space-20) + var(--space-8)); /* Align with type name (icon width + gap) */
    text-align: left;
  }
  
</style>
