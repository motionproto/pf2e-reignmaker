<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';

  export let show: boolean = false;

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

  // Get all eligible settlements (level 2+) with calculated income
  $: eligibleSettlements = ($kingdomData?.settlements || [])
    .filter(s => s.level >= 2)
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

  function handleSelect(settlementId: string) {
    dispatch('settlementSelected', { settlementId });
    show = false;
  }

  function handleCancel() {
    show = false;
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={handleCancel}>
    <div class="dialog-content" on:click|stopPropagation>
      <div class="dialog-header">
        <h2>Select Settlement</h2>
        <button class="close-btn" on:click={handleCancel}>
          <i class="fas fa-times"></i>
        </button>
      </div>

      {#if taxationInfo}
        <div class="taxation-info">
          <i class="fas fa-coins"></i>
          <span>Kingdom Taxation: T{taxationInfo.tier} ({taxationInfo.name})</span>
        </div>
      {/if}

      <div class="guidance">
        <i class="fas fa-info-circle"></i>
        <p>Choose the settlement you are currently acting in to collect your personal stipend.</p>
      </div>

      <div class="settlements-list">
        {#each eligibleSettlements as settlement}
          <button class="settlement-item" on:click={() => handleSelect(settlement.id)}>
            <div class="settlement-header">
              <span class="settlement-name">{settlement.name}</span>
              <span class="settlement-level">Level {settlement.level}</span>
            </div>
            <div class="settlement-income">
              <i class="fas fa-coins"></i>
              <span>{settlement.income} gp base income</span>
            </div>
          </button>
        {/each}

        {#if eligibleSettlements.length === 0}
          <div class="no-settlements">
            <i class="fas fa-exclamation-triangle"></i>
            <p>No eligible settlements found. Settlements must be level 2 or higher.</p>
          </div>
        {/if}
      </div>

      {#if !taxationInfo}
        <div class="warning">
          <i class="fas fa-exclamation-triangle"></i>
          <p>No taxation structures found. Build a Counting House (T2), Treasury (T3), or Exchequer (T4) to collect stipends.</p>
        </div>
      {/if}

      <div class="dialog-footer">
        <button class="cancel-btn" on:click={handleCancel}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-higher);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog-content {
    background: var(--color-gray-900, #1f1f23);
    border: 1px solid var(--border-strong, var(--border-default));
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-medium, var(--border-subtle));

    h2 {
      margin: 0;
      font-size: var(--font-2xl);
      color: var(--text-primary, #e0e0e0);
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary, #a0a0a0);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.2s;

    &:hover {
      color: var(--text-primary, #e0e0e0);
    }
  }

  .taxation-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--surface-accent-low);
    border-bottom: 1px solid var(--border-accent-subtle);
    font-size: var(--font-md);
    color: var(--color-amber, #fbbf24);

    i {
      font-size: 14px;
    }
  }

  .guidance {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 20px;
    background: var(--surface-info-low);
    border-bottom: 1px solid var(--border-info-subtle);

    i {
      color: var(--color-blue, #3b82f6);
      margin-top: 2px;
    }

    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
      line-height: 1.5;
    }
  }

  .settlements-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .settlement-item {
    background: var(--hover-low);
    border: 1px solid var(--border-medium, var(--border-subtle));
    border-radius: 6px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--color-amber, #fbbf24);
      transform: translateY(-1px);
    }
  }

  .settlement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .settlement-name {
    font-size: var(--font-lg);
    font-weight: 600;
    color: var(--text-primary, #e0e0e0);
  }

  .settlement-level {
    font-size: var(--font-sm);
    color: var(--text-secondary, #a0a0a0);
  }

  .settlement-income {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--font-md);
    color: var(--color-amber, #fbbf24);

    i {
      font-size: 14px;
    }
  }

  .no-settlements {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    background: rgba(249, 115, 22, 0.1);
    border: 1px solid var(--border-accent-subtle);
    border-radius: 6px;
    color: var(--text-secondary, #a0a0a0);

    i {
      color: var(--color-orange, #f97316);
      font-size: 20px;
    }

    p {
      margin: 0;
      font-size: var(--font-md);
    }
  }

  .warning {
    padding: 16px 20px;
    background: rgba(249, 115, 22, 0.1);
    border-top: 1px solid var(--border-accent-subtle);
    display: flex;
    align-items: flex-start;
    gap: 10px;

    i {
      color: var(--color-orange, #f97316);
      margin-top: 2px;
    }

    p {
      margin: 0;
      font-size: var(--font-sm);
      color: var(--text-secondary, #a0a0a0);
      line-height: 1.5;
    }
  }

  .dialog-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border-medium, var(--border-subtle));
    display: flex;
    justify-content: flex-end;
  }

  .cancel-btn {
    background: var(--color-gray-700, #3f3f46);
    color: var(--text-primary, #e0e0e0);
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: var(--font-md);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-gray-600, #52525b);
    }
  }
</style>
