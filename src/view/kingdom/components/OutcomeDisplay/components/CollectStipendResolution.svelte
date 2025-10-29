<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';

  // Props
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  export let modifiers: any[] | undefined = undefined;
  export let stateChanges: Record<string, any> | undefined = undefined;

  const dispatch = createEventDispatcher();

  // Income table based on settlement level and taxation tier
  const INCOME_TABLE: { [level: number]: { t2?: number; t3?: number; t4?: number } } = {
    1: {},
    2: { t2: 3 },
    3: { t2: 5 },
    4: { t2: 7 },
    5: { t2: 9, t3: 18 },
    6: { t2: 15, t3: 30 },
    7: { t2: 20, t3: 40 },
    8: { t2: 25, t3: 50, t4: 100 },
    9: { t2: 30, t3: 60, t4: 120 },
    10: { t2: 40, t3: 80, t4: 160 },
    11: { t2: 50, t3: 100, t4: 200 },
    12: { t2: 60, t3: 120, t4: 240 },
    13: { t2: 70, t3: 140, t4: 280 },
    14: { t2: 80, t3: 160, t4: 320 },
    15: { t2: 100, t3: 200, t4: 400 },
    16: { t2: 130, t3: 260, t4: 520 },
    17: { t2: 150, t3: 300, t4: 600 },
    18: { t2: 200, t3: 400, t4: 800 },
    19: { t2: 300, t3: 600, t4: 1200 },
    20: { t2: 400, t3: 800, t4: 1600 },
  };

  const REVENUE_STRUCTURES = {
    'counting-house': { tier: 2, name: 'Counting House' },
    'treasury': { tier: 3, name: 'Treasury' },
    'exchequer': { tier: 4, name: 'Exchequer' }
  };

  // Get kingdom-wide taxation tier
  $: taxationInfo = getKingdomTaxationTier($kingdomData);

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedSettlementId = resolutionState.customComponentData?.selectedSettlementId || '';

  // Check if resolution is complete
  $: isResolved = !!selectedSettlementId;

  // Get all settlements sorted by level descending, then alphabetically
  $: sortedSettlements = ($kingdomData?.settlements || [])
    .map(settlement => {
      const income = calculateIncome(settlement.level, taxationInfo?.tier || 2);
      return { ...settlement, income };
    })
    .sort((a, b) => {
      // Sort by level descending
      if (b.level !== a.level) return b.level - a.level;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

  function getKingdomTaxationTier(kingdom: any): { tier: 2 | 3 | 4; name: string } | null {
    if (!kingdom?.settlements) return null;

    let highestTier: 2 | 3 | 4 = 2;
    let highestStructureName = '';

    for (const settlement of kingdom.settlements) {
      for (const structureId of settlement.structureIds || []) {
        const revenueInfo = REVENUE_STRUCTURES[structureId as keyof typeof REVENUE_STRUCTURES];
        if (revenueInfo && revenueInfo.tier >= highestTier) {
          highestTier = revenueInfo.tier as 2 | 3 | 4;
          highestStructureName = revenueInfo.name;
        }
      }
    }

    return highestStructureName ? { tier: highestTier, name: highestStructureName } : null;
  }

  function calculateIncome(level: number, tier: 2 | 3 | 4): number {
    const incomeRow = INCOME_TABLE[level];
    if (!incomeRow) return 0;

    const tierKey = `t${tier}` as 't2' | 't3' | 't4';
    return incomeRow[tierKey] || 0;
  }

  function formatOptionText(settlement: any): string {
    const nameWidth = 20;
    const name = settlement.name.padEnd(nameWidth);
    const level = `Lv${settlement.level}`.padEnd(4);
    const revenue = settlement.income > 0 ? `${settlement.income} gp` : 'Not Eligible';
    return `${name} ${level} ${revenue}`;
  }

  async function handleSettlementChange(event: Event) {
    if (!instance) return;

    const target = event.target as HTMLSelectElement;
    const settlementId = target.value;

    // Only update if a valid settlement is selected (not the default empty option)
    if (!settlementId || settlementId === '') {
      return;
    }

    // Update instance resolution state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { selectedSettlementId: settlementId }
    });

    // Emit selection event
    dispatch('selection', { selectedSettlementId: settlementId });
  }
</script>

<div class="collect-stipend-resolution">
  <div class="header">
    <h4>Collect Personal Stipend</h4>
    {#if taxationInfo}
      <div class="taxation-info">
        <i class="fas fa-coins"></i>
        <span>Kingdom Taxation: T{taxationInfo.tier} ({taxationInfo.name})</span>
      </div>
    {/if}
  </div>

  <div class="guidance">
    <i class="fas fa-info-circle"></i>
    <p>Choose the settlement you are currently acting in:</p>
  </div>

  <div class="settlement-selection">
    <select 
      class="settlement-dropdown"
      bind:value={selectedSettlementId}
      on:change={handleSettlementChange}
    >
      <option value="" disabled>Select Settlement...</option>
      {#each sortedSettlements as settlement}
        <option value={settlement.id}>
          {formatOptionText(settlement)}
        </option>
      {/each}
    </select>
  </div>

  {#if !taxationInfo}
    <div class="warning">
      <i class="fas fa-exclamation-triangle"></i>
      <p>No taxation structures found. Build a Counting House (T2), Treasury (T3), or Exchequer (T4) to collect stipends.</p>
    </div>
  {/if}
</div>

<style lang="scss">
  .collect-stipend-resolution {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 16px;
    margin: 12px 0;
  }

  .header {
    margin-bottom: 12px;
    
    h4 {
      margin: 0 0 8px 0;
      font-size: var(--font-md);
      font-weight: 600;
      color: var(--text-primary, #e0e0e0);
    }
  }

  .taxation-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--font-md);
    color: var(--color-amber, #fbbf24);
    
    i {
      font-size: 14px;
    }
  }

  .guidance {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    padding: 10px;
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid var(--color-blue, #3b82f6);
    border-radius: 4px;
    
    i {
      color: var(--color-blue, #3b82f6);
      margin-top: 2px;
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
    }
  }

  .settlement-selection {
    margin-bottom: 12px;
  }

  .settlement-dropdown {
    width: 100%;
    padding: 10px 14px;
    font-size: var(--font-md);
    font-family: 'Courier New', monospace;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.2));
    border-radius: 4px;
    color: var(--text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border-strong, rgba(255, 255, 255, 0.3));
    }
    
    &:focus {
      outline: none;
      border-color: var(--color-amber, #fbbf24);
      background: rgba(255, 255, 255, 0.1);
    }
    
    option {
      background: var(--color-gray-900, #1f1f23);
      padding: 8px;
    }
  }

  .warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px;
    background: rgba(249, 115, 22, 0.1);
    border-left: 3px solid var(--color-orange, #f97316);
    border-radius: 4px;
    
    i {
      color: var(--color-orange, #f97316);
      margin-top: 2px;
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
    }
  }
</style>
