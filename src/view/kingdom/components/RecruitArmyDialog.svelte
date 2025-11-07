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
  
  $: confirmDisabled = !armyName.trim();
  
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
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
  }
  
  .form-group input[type="text"],
  .form-group select {
    width: 100%;
    padding: 0.625rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.9rem;
    font-family: inherit;
    height: auto;
    line-height: 1.75;
  }
  
  .form-group select {
    padding: 0.5rem 0.625rem;
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
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-style: italic;
  }
  
  .warning-box {
    padding: 1rem;
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
  }
  
  .warning-box i {
    color: orange;
    margin-right: 0.5rem;
  }
  
  .warning-box strong {
    color: orange;
  }
  
  .army-type-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .army-type-option {
    cursor: pointer;
    display: block;
  }
  
  .army-type-option input[type="radio"] {
    display: none;
  }
  
  .army-type-card {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-sm);
    text-align: center;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
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
    width: 64px;
    height: 64px;
    object-fit: contain;
  }
  
  .army-type-card span {
    font-size: 0.85rem;
    color: var(--text-primary);
    font-weight: 600;
  }
</style>
