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
  export let exemptFromUpkeep: boolean = false; // For allied armies (no settlement support needed)
  
  const dispatch = createEventDispatcher<{
    confirm: { name: string; settlementId: string | null; armyType: ArmyType };
    cancel: void;
  }>();
  
  let armyName: string = '';
  let selectedSettlementId: string = '';
  let selectedArmyType: ArmyType = 'infantry';
  let confirmDisabled = true; // Confirm disabled state
  let userHasEnteredName = false; // Track if user manually entered a name

  // Reactive validation: only require a name (allow exceeding capacity)
  $: confirmDisabled = !armyName.trim();
  
  // Generate a unique default name based on army type
  function generateDefaultName(armyType: ArmyType): string {
    const typeName = ARMY_TYPES[armyType].name;
    const existingArmies = $kingdomData.armies || [];
    
    // Find existing armies with the same type
    const sameTypeArmies = existingArmies.filter((army: any) => {
      // Extract base name pattern (e.g., "Infantry 1" -> "Infantry")
      const nameMatch = army.name.match(/^(.+?)\s+(\d+)$/);
      if (nameMatch) {
        const baseName = nameMatch[1];
        return baseName === typeName;
      }
      // Also check exact match
      return army.name === typeName;
    });
    
    // Find the highest number used
    let maxNumber = 0;
    sameTypeArmies.forEach((army: any) => {
      const match = army.name.match(/\s+(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      } else if (army.name === typeName) {
        // If there's an exact match, we'll use number 2
        maxNumber = Math.max(maxNumber, 1);
      }
    });
    
    // Generate next number (at least 1)
    const nextNumber = maxNumber + 1;
    const defaultName = `${typeName} ${nextNumber}`;
    
    // Ensure uniqueness (check if this exact name exists)
    const isUnique = !existingArmies.some((army: any) => army.name === defaultName);
    
    return isUnique ? defaultName : `${typeName} ${nextNumber + 1}`;
  }
  
  // Track the last generated default name to detect if user has changed it
  let lastDefaultName: string = '';
  
  // Update default name when army type changes (if user hasn't manually entered a name)
  $: {
    if (!userHasEnteredName) {
      const newDefaultName = generateDefaultName(selectedArmyType);
      lastDefaultName = newDefaultName;
      armyName = newDefaultName;
    }
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
  
  // Find capital settlement (lowest ID = first settlement founded)
  $: capitalSettlement = allSettlements.length > 0 
    ? allSettlements.reduce((oldest, current) => 
        oldest.id < current.id ? oldest : current
      )
    : null;
  
  onMount(() => {
    // Generate default army name based on selected type
    const defaultName = generateDefaultName(selectedArmyType);
    armyName = defaultName;
    lastDefaultName = defaultName;
    userHasEnteredName = false;
    
    // For allied armies, auto-select capital
    if (exemptFromUpkeep && capitalSettlement) {
      selectedSettlementId = capitalSettlement.id;
    }
  });
  
  // Update capital selection when exemptFromUpkeep or capitalSettlement changes
  $: {
    if (exemptFromUpkeep && capitalSettlement && !selectedSettlementId) {
      selectedSettlementId = capitalSettlement.id;
    }
  }
  
  function handleConfirm() {
    // Called by base Dialog component when confirm button clicked
    if (!armyName.trim()) {
      // Cancel if name is empty (shouldn't happen due to confirmDisabled)
      dispatch('cancel');
      show = false;
      return;
    }
    
    let finalName = armyName.trim();
    const existingArmies = $kingdomData.armies || [];
    
    // If user hasn't entered a custom name, ensure the default name is unique
    if (!userHasEnteredName || finalName === lastDefaultName) {
      // Regenerate to ensure uniqueness (in case armies were added since last generation)
      finalName = generateDefaultName(selectedArmyType);
    }
    
    // Ensure final name is unique (whether default or user-entered)
    let uniqueName = finalName;
    let counter = 1;
    
    while (existingArmies.some((army: any) => army.name === uniqueName)) {
      const typeName = ARMY_TYPES[selectedArmyType].name;
      // Extract number if exists, otherwise start from 1
      const match = finalName.match(/^(.+?)\s+(\d+)$/);
      if (match) {
        const baseName = match[1];
        const num = parseInt(match[2], 10);
        uniqueName = `${baseName} ${num + counter}`;
      } else {
        // Try to use the existing name as base, or fall back to type name
        const baseName = finalName || typeName;
        uniqueName = `${baseName} ${counter}`;
      }
      counter++;
      
      // Safety check to prevent infinite loop
      if (counter > 1000) {
        uniqueName = `${finalName || typeName} ${Date.now()}`;
        break;
      }
    }
    
    finalName = uniqueName;
    
    dispatch('confirm', {
      name: finalName,
      settlementId: selectedSettlementId || null,
      armyType: selectedArmyType
    });
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
  
  function handleInputChange(event: Event) {
    // Mark that user has manually entered a name when they type
    // Only track if they've actually typed something (not just the default)
    const target = event.target as HTMLInputElement;
    const currentValue = target.value;
    const currentDefault = generateDefaultName(selectedArmyType);
    
    if (currentValue.trim() === '' || currentValue.trim() === currentDefault) {
      // Empty or matches default - allow default to be updated when type changes
      userHasEnteredName = false;
    } else {
      // User has typed something different - preserve their input
      userHasEnteredName = true;
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
      on:input={handleInputChange}
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
    {#if exemptFromUpkeep}
      <!-- Allied army - show info message instead of dropdown -->
      <div class="allied-army-info">
        <i class="fas fa-handshake"></i>
        <span>This is an allied army provided by a friendly faction. No settlement support required.</span>
      </div>
      <small class="help-text">
        This army will be stationed at {capitalSettlement?.name || 'your capital'}.
      </small>
    {:else if allSettlements.length > 0}
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
    color: var(--text-secondary);
    font-size: var(--font-md);
  }
  
  .form-group input[type="text"],
  .form-group select {
    width: 100%;
    padding: var(--space-10);
    background: var(--overlay);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-md);
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
    background: var(--overlay-high);
  }
  
  .help-text {
    display: block;
    margin-top: var(--space-8);
    font-size: var(--font-sm);
    color: var(--text-secondary);
    font-style: normal;
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
  
  .allied-army-info {
    padding: var(--space-16);
    background: var(--surface-success-low);
    border: 1px solid var(--border-success-subtle);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
  
  .allied-army-info i {
    color: var(--color-green);
    font-size: var(--font-lg);
  }
  
  .allied-army-info span {
    color: var(--text-primary);
    font-size: var(--font-md);
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
    background: var(--overlay);
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
    background: var(--overlay-high);
    border-color: var(--border-highlight);
  }
  
  .army-type-option input[type="radio"]:checked + .army-type-card {
    background: var(--surface-accent-low);
    border-color: var(--color-amber);
    box-shadow: 0 0 0 1px var(--color-amber);
  }
  
  .army-type-card img {
    width: 4rem;
    height: 4rem;
    object-fit: contain;
  }
  
  .army-type-card span {
    font-size: var(--font-md);
    color: var(--text-primary);
    font-weight: 600;
  }
</style>
