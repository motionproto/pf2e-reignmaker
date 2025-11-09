<script lang="ts">
  import { PLAYER_KINGDOM } from '../../../types/ownership';
  import { createEventDispatcher, onMount } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { SettlementTierConfig } from '../../../models/Settlement';
  
// Import army token images
  import cavalryImg from '../../../img/army_tokens/army-calvary.webp';
  import engineersImg from '../../../img/army_tokens/army-engineers.webp';
  import infantryImg from '../../../img/army_tokens/army-infantry.webp';
  import koboldImg from '../../../img/army_tokens/army-kobold.webp';
  import wolvesImg from '../../../img/army_tokens/army-wolves.webp';
  
  // Army type definitions
  const ARMY_TYPES = {
    cavalry: { name: 'Cavalry', image: cavalryImg },
    engineers: { name: 'Engineers', image: engineersImg },
    infantry: { name: 'Infantry', image: infantryImg },
    kobold: { name: 'Kobold', image: koboldImg },
    wolves: { name: 'Wolves', image: wolvesImg }
  } as const;
  
  type ArmyType = keyof typeof ARMY_TYPES;
  
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher<{
    confirm: { name: string; settlementId: string | null; armyType: ArmyType };
    cancel: void;
  }>();
  
  let armyName: string = '';
  let selectedSettlementId: string = '';
  let selectedArmyType: ArmyType = 'infantry';
  
  // Reactive validation: prevent confirming with an at-capacity settlement
  $: {
    const selectedSettlement = allSettlements.find(s => s.id === selectedSettlementId);
    const isSelectedAtCapacity = selectedSettlement?.isAtCapacity ?? false;
    confirmDisabled = !armyName.trim() || isSelectedAtCapacity;
  }
  
  // Reactively calculate ALL claimed settlements (including at-capacity)
  $: allSettlements = $kingdomData.settlements
      .filter(s => {
        // Must have a valid map location
        const hasLocation = s.location.x !== 0 || s.location.y !== 0;
        if (!hasLocation) return false;
        
        // Check if the settlement's hex is claimed by the kingdom
        const hexId = s.kingmakerLocation 
          ? `${s.kingmakerLocation.x}.${String(s.kingmakerLocation.y).padStart(2, '0')}`
          : `${s.location.x}.${String(s.location.y).padStart(2, '0')}`;
        
        const hex = $kingdomData.hexes?.find((h: any) => h.id === hexId) as any;
        const isClaimed = hex && hex.claimedBy === PLAYER_KINGDOM;
        
        return isClaimed;
      })
      .map(s => {
        const capacity = SettlementTierConfig[s.tier]?.armySupport || 0;
        const current = s.supportedUnits?.length || 0;
        return {
          id: s.id,
          name: s.name,
          tier: s.tier,
          current: current,
          capacity: capacity,
          isAtCapacity: current >= capacity
        };
      });
  
  // Available settlements (not at capacity) - for warning check
  $: availableSettlements = allSettlements.filter(s => !s.isAtCapacity);
  
  // Confirm disabled state
  let confirmDisabled = true;
  
  onMount(() => {
    // Generate default army name
    const armyNumber = ($kingdomData.armies?.length || 0) + 1;
    armyName = `Army ${armyNumber}`;
  });
  
  function handleConfirm() {
    // Called by base Dialog component when confirm button clicked
    if (armyName.trim()) {
      dispatch('confirm', {
        name: armyName.trim(),
        settlementId: selectedSettlementId || null,
        armyType: selectedArmyType
      });
    } else {
      // Cancel if name is empty (shouldn't happen due to confirmDisabled)
      dispatch('cancel');
    }
    show = false;
  }
  
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
  
  function handleInputKeydown(event: KeyboardEvent) {
    // Standard input behavior: Enter blurs the input without closing dialog
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLInputElement).blur();
    }
  }
</script>

<Dialog 
  bind:show 
  title="Recruit Army" 
  confirmLabel="Recruit Army"
  {confirmDisabled}
  width="600px"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>
  <div class="form-group">
    <label for="army-name">Army Name:</label>
    <input 
      type="text" 
      id="army-name" 
      bind:value={armyName}
      placeholder="Enter army name..." 
      autofocus
      on:keydown={handleInputKeydown}
    />
  </div>
  
  <div class="form-group">
    <label>Army Type:</label>
    <div class="army-type-grid">
      {#each Object.entries(ARMY_TYPES) as [type, config]}
        <label class="army-type-option">
          <input 
            type="radio" 
            name="army-type" 
            value={type}
            bind:group={selectedArmyType}
          />
          <div class="army-type-card">
            <img src={config.image} alt={config.name} />
            <span>{config.name}</span>
          </div>
        </label>
      {/each}
    </div>
  </div>
  
  <div class="form-group">
    <label for="settlement-select">Supported By Settlement:</label>
    {#if allSettlements.length > 0}
      <select id="settlement-select" bind:value={selectedSettlementId}>
        <option value="">Unsupported (No Settlement)</option>
        {#each allSettlements as settlement}
          <option value={settlement.id} disabled={settlement.isAtCapacity}>
            {settlement.name} ({settlement.tier} - {settlement.current}/{settlement.capacity})
          </option>
        {/each}
      </select>
      {#if availableSettlements.length > 0}
        <small class="help-text">
          Armies must be supported by settlements or they will cause unrest.
        </small>
      {:else}
        <div class="warning-box" style="margin-top: 0.5rem;">
          <div>
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Warning:</strong> No claimed settlements have available army support capacity.
          </div>
          <small>This army will be unsupported and may cause unrest.</small>
        </div>
      {/if}
    {:else}
      <div class="warning-box">
        <div>
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Warning:</strong> No claimed settlements available.
        </div>
        <small>This army will be unsupported and may cause unrest.</small>
      </div>
    {/if}
  </div>
</Dialog>

<style>
  .form-group {
    margin-bottom: var(--space-24);
  }
  
  .form-group label {
    display: block;
    margin-bottom: var(--space-8);
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-sm);
  }
  
  .form-group input[type="text"],
  .form-group select {
    width: 100%;
    padding: var(--space-10);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-sm);
    font-family: inherit;
    height: auto;
    line-height: 1.75;
  }
  
  .form-group select {
    padding: var(--space-8) var(--space-10);
  }
  
  .form-group select {
    cursor: pointer;
  }
  
  .form-group select option:disabled {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }
  
  .form-group input[type="text"]:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-amber);
    background: rgba(0, 0, 0, 0.5);
  }
  
  .help-text {
    display: block;
    margin-top: var(--space-8);
    font-size: var(--font-xs);
    color: var(--text-secondary);
    font-style: italic;
  }
  
  .warning-box {
    padding: var(--space-16);
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
  }
  
  .warning-box i {
    color: orange;
    margin-right: var(--space-8);
  }
  
  .warning-box strong {
    color: orange;
  }
  
  .army-type-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-12);
    margin-top: var(--space-8);
  }
  
  .army-type-option {
    cursor: pointer;
    display: block;
  }
  
  .army-type-option input[type="radio"] {
    display: none;
  }
  
  .army-type-card {
    padding: var(--space-12);
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    text-align: center;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
  }
  
  .army-type-card:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: var(--border-highlight);
  }
  
  .army-type-option input[type="radio"]:checked + .army-type-card {
    background: rgba(251, 191, 36, 0.1);
    border-color: var(--color-amber);
    box-shadow: 0 0 0 1px var(--color-amber);
  }
  
  .army-type-card img {
    width: 4rem;
    height: 4rem;
    object-fit: contain;
  }
  
  .army-type-card span {
    font-size: var(--font-sm);
    color: var(--text-primary);
    font-weight: 600;
  }
</style>
