<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
  import { structureSelectionDialog } from '../../../stores/StructureSelectionDialogStore';
  import { structuresService } from '../../../services/structures';
  
  let show = false;
  let selectedStructureId: string | null = null;
  let tier1Structures: Array<{ id: string; name: string; skillInfo: string }> = [];
  
  // Subscribe to store
  structureSelectionDialog.subscribe(state => {
    show = state.show;
    if (state.show) {
      selectedStructureId = null; // Reset on open
      loadStructures();
    }
  });
  
  function loadStructures() {
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
  }
  
  function handleConfirm() {
    structureSelectionDialog.confirm(selectedStructureId);
  }
  
  function handleCancel() {
    structureSelectionDialog.cancel();
  }
</script>

<Dialog
  bind:show
  title="Critical Success! Choose a Free Structure"
  confirmLabel="Continue"
  cancelLabel="Skip"
  width="500px"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>
  <div class="structure-selection-dialog">
    <div class="success-banner">
      <i class="fas fa-star"></i>
      <span>Critical Success Bonus: Choose a free Tier 1 structure!</span>
    </div>
    
    <div class="form-group">
      <label for="structure-select">Select Structure:</label>
      <select id="structure-select" bind:value={selectedStructureId}>
        <option value={null}>No structure (start with empty village)</option>
        {#each tier1Structures as structure}
          <option value={structure.id}>{structure.name}{structure.skillInfo}</option>
        {/each}
      </select>
    </div>
  </div>
</Dialog>

<style>
  .structure-selection-dialog {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .success-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-green-subtle);
    border-left: 3px solid var(--color-green);
    border-radius: var(--radius-md);
    color: var(--color-green);
    font-weight: 600;
  }
  
  .success-banner i {
    font-size: 1.25rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-base);
  }
  
  select {
    padding: 0.5rem 0.75rem;
    background: var(--bg-base);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-base);
    line-height: 1.5;
    min-height: 2.5rem;
    transition: all var(--transition-base);
    cursor: pointer;
  }
  
  select:focus {
    outline: none;
    border-color: var(--border-strong);
    background: var(--bg-elevated);
  }
  
  select option {
    background: var(--bg-base);
    color: var(--text-primary);
    padding: 0.5rem;
  }
</style>
