<!--
  SettlementCustomSelector - Combined component for settlement creation
  
  Shows:
  1. Settlement name input (always)
  2. Structure dropdown (only on critical success)
-->

<script lang="ts">
  // Props passed by hex-selector
  export let selectedHex: string;
  export let onSelect: (metadata: { settlementName?: string; structureId?: string | null }) => void;
  export let showStructureSelection: boolean = false; // Passed from pipeline
  
  let settlementName: string = '';
  let selectedStructureId: string | null = null;
  let tier1Structures: Array<{ id: string; name: string; skillInfo: string }> = [];
  
  // Load structures if needed
  $: if (showStructureSelection && tier1Structures.length === 0) {
    loadStructures();
  }
  
  function loadStructures() {
    import('../../services/structures').then(({ structuresService }) => {
      structuresService.initializeStructures();
      const allStructures = structuresService.getAllStructures();
      tier1Structures = allStructures
        .filter(s => s.tier === 1)
        .map(s => {
          const skillInfo = s.type === 'skill' && s.effects.skillsSupported
            ? ` (${s.effects.skillsSupported.map((sk: string) => sk.charAt(0).toUpperCase() + sk.slice(1)).join(', ')})`
            : '';
          return {
            id: s.id,
            name: s.name,
            skillInfo
          };
        });
    });
  }
  
  // Call onSelect when name input loses focus
  function handleNameBlur() {
    const trimmed = settlementName.trim();
    console.log('[SettlementCustomSelector] Name blur:', trimmed);
    onSelect({ 
      settlementName: trimmed,
      structureId: selectedStructureId 
    });
  }
  
  // Call onSelect when structure changes
  function handleStructureChange() {
    console.log('[SettlementCustomSelector] Structure changed:', selectedStructureId);
    onSelect({ 
      settlementName: settlementName.trim(),
      structureId: selectedStructureId 
    });
  }
</script>

<div class="settlement-custom-selector">
  <!-- Settlement Name Input (always visible) -->
  <div class="name-section">
    <div class="selector-header">
      <i class="fas fa-building"></i>
      Enter Settlement Name
    </div>
    
    <div class="rm-form-field-vertical">
      <input
        type="text"
        class="rm-input"
        bind:value={settlementName}
        on:blur={handleNameBlur}
        placeholder="Settlement"
      />
    </div>
  </div>
  
  <!-- Structure Selection (critical success only) -->
  {#if showStructureSelection}
    <div class="structure-section">
      <div class="selector-header critical">
        <i class="fas fa-star"></i>
        Critical Success! Choose Free Structure
      </div>
      
      <div class="rm-form-field-vertical">
        <select 
          class="rm-select" 
          bind:value={selectedStructureId}
          on:change={handleStructureChange}
        >
          <option value={null}>No structure (start with empty village)</option>
          {#each tier1Structures as structure}
            <option value={structure.id}>{structure.name}{structure.skillInfo}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .settlement-custom-selector {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  
  .name-section,
  .structure-section {
    padding: var(--space-12) 0;
    border-top: var(--border-width) solid var(--border-low);
  }
  
  .selector-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-lg);
    color: var(--text-primary);
    margin-bottom: var(--space-12);
    font-weight: var(--font-weight-semibold);
    
    i {
      color: var(--text-secondary);
      font-size: var(--font-md);
    }
    
    &.critical {
      color: var(--color-green);
      
      i {
        color: var(--color-green);
      }
    }
  }
</style>
