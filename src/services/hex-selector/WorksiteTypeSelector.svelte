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

  {#if selectedType && hexTerrain}
    {@const revenue = getWorksiteRevenue(selectedType, hexTerrain)}
    <div class="selection-info">
      <i class="fas fa-check-circle"></i>
      <span>Selected: <strong>{selectedType}</strong>{#if revenue} ({revenue}){/if}</span>
    </div>
  {/if}
</div>

<style lang="scss">
  .worksite-type-selector {
    padding: var(--space-12) 0;
    border-top: 1px solid var(--color-border-low);
  }
  
  .selector-header {
    font-size: var(--font-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-12);
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
    gap: var(--space-10);
    margin-bottom: var(--space-12);
  }
  
  .type-button {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--space-10) var(--space-16);
    
    /* Choice-set pattern: Background */
    background: var(--hover-low);
    
    /* Choice-set pattern: Border (visible on all states) */
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    
    /* Choice-set pattern: Outline (overlay, doesn't affect size) */
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    cursor: pointer;
    transition: all 0.2s;
    min-height: 52px;
    
    /* Choice-set pattern: Hover state (only for valid, unselected) */
    &.valid:hover:not(.selected) {
      background: var(--hover);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    /* Choice-set pattern: Selected state */
    &.valid.selected {
      background: var(--surface-success-high);
      outline-color: var(--border-success);
    }
    
    /* Choice-set pattern: Disabled state */
    &.invalid {
      opacity: 0.4;
      cursor: not-allowed;
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
    color: var(--text-secondary);
    flex-shrink: 0;
    width: 20px;
    text-align: center;
    transition: color 0.2s;
  }
  
  .type-name {
    font-weight: 500;
    font-size: var(--font-md);
    color: var(--text-primary);
    flex: 1;
    text-align: left;
  }
  
  .revenue-text {
    font-size: var(--font-xs);
    color: var(--text-muted);
    margin-top: var(--space-4);
    padding-left: 28px; /* Align with type name (icon 20px + gap 8px) */
    text-align: left;
  }
  
  .selection-info {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    padding: var(--space-12);
    background: var(--surface-success-low);
    border-left: 3px solid var(--color-green, #22c55e);
    border-radius: var(--radius-md);
    color: var(--text-primary, #e0e0e0);
    
    i {
      color: var(--color-green, #22c55e);
      font-size: var(--font-lg);
    }
    
    strong {
      color: var(--color-green, #22c55e);
    }
  }
</style>
