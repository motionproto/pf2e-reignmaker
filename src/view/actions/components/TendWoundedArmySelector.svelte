<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { PLAYER_KINGDOM } from '../../../types/ownership';
  import Dialog from '../../kingdom/components/baseComponents/Dialog.svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let show = true;

  interface WoundedArmy {
    id: string;
    name: string;
    currentHP: number;
    maxHP: number;
    conditions: string[];
    isDamaged: boolean;
    hasConditions: boolean;
  }

  let selectedArmyId: string | null = null;
  let woundedArmies: WoundedArmy[] = [];
  let errorMessage = '';

  // Load wounded armies when component mounts
  $: if (show) {
    loadWoundedArmies();
  }

  function loadWoundedArmies() {
    const game = (globalThis as any).game;
    if (!game?.actors || !$kingdomData?.armies) {
      console.log('🔍 [TendWoundedArmySelector] No game.actors or kingdom armies');
      errorMessage = 'No armies available';
      woundedArmies = [];
      return;
    }

    console.log('🔍 [TendWoundedArmySelector] Kingdom armies:', $kingdomData.armies);

    const armies = $kingdomData.armies
      .filter((army: any) => army.ledBy === PLAYER_KINGDOM && army.actorId)
      .map((army: any) => {
        const actor = game.actors.get(army.actorId);
        console.log(`🔍 [TendWoundedArmySelector] Army ${army.name}:`, {
          armyId: army.id,
          actorId: army.actorId,
          actor: actor,
          hp: actor?.system?.attributes?.hp,
          items: actor ? Array.from(actor.items.values()).map((i: any) => ({ name: i.name, type: i.type })) : []
        });

        if (!actor) {
          console.warn(`⚠️ [TendWoundedArmySelector] No actor found for army ${army.name} (actorId: ${army.actorId})`);
          return null;
        }

        const currentHP = actor.system?.attributes?.hp?.value || 0;
        const maxHP = actor.system?.attributes?.hp?.max || 0;
        const isDamaged = currentHP < maxHP;

        // Get conditions/effects (filter out beneficial effects)
        const items = Array.from(actor.items.values()) as any[];
        const conditions = items
          .filter((i: any) => {
            if (i.type !== 'condition' && i.type !== 'effect') return false;
            
            // Filter out beneficial effects by checking for positive keywords
            const name = i.name?.toLowerCase() || '';
            const isBeneficial = name.includes('bonus') || 
                                name.includes('+') ||
                                name.includes('deploy') ||
                                name.includes('stance') ||
                                name.includes('inspire');
            
            return !isBeneficial;
          })
          .map((i: any) => i.name);

        const hasConditions = conditions.length > 0;

        console.log(`🔍 [TendWoundedArmySelector] Army ${army.name} status:`, {
          currentHP,
          maxHP,
          isDamaged,
          hasConditions,
          conditions
        });

        // Only include if damaged or has conditions
        if (!isDamaged && !hasConditions) {
          console.log(`⚠️ [TendWoundedArmySelector] Skipping ${army.name} - not wounded/afflicted`);
          return null;
        }

        return {
          id: army.id,
          name: army.name,
          currentHP,
          maxHP,
          conditions,
          isDamaged,
          hasConditions
        };
      })
      .filter(Boolean) as WoundedArmy[];

    console.log('🔍 [TendWoundedArmySelector] Wounded armies found:', armies);

    if (armies.length === 0) {
      errorMessage = 'No wounded or afflicted armies available';
      woundedArmies = [];
    } else {
      errorMessage = '';
      woundedArmies = armies;
      // Auto-select first army
      selectedArmyId = armies[0].id;
    }
  }

  function handleConfirm() {
    if (!selectedArmyId) return;
    
    const selected = woundedArmies.find(a => a.id === selectedArmyId);
    if (!selected) return;

    dispatch('confirm', {
      armyId: selected.id,
      armyName: selected.name
    });
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<Dialog
  bind:show
  title="Select Army to Treat"
  confirmLabel="Treat Army"
  confirmDisabled={!selectedArmyId || errorMessage !== ''}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="700px"
>
  {#if errorMessage}
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{errorMessage}</span>
    </div>
  {:else}
    <div class="army-list">
      {#each woundedArmies as army (army.id)}
        <div 
          class="army-item" 
          class:selected={selectedArmyId === army.id}
          on:click={() => selectedArmyId = army.id}
        >
          <div class="army-info">
            <div class="army-header">
              <div class="army-name">{army.name}</div>
              {#if army.isDamaged}
                <span class="hp-status">
                  {army.currentHP}/{army.maxHP} HP
                </span>
              {/if}
            </div>
            {#if army.hasConditions}
              <div class="conditions">
                {army.conditions.join(', ')}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Dialog>

<style lang="scss">
  .error-message {
    padding: var(--space-md);
    background: var(--surface-warning);
    border: 1px solid var(--border-warning);
    border-radius: var(--radius-sm);
    color: var(--text-warning);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .army-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 600px;
  }

  .army-item {
    padding: var(--space-16);
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--border-medium);
  }

  .army-item:last-child {
    border-bottom: none;
  }

  .army-item:hover {
    background: rgba(100, 116, 139, 0.15);
  }

  .army-item.selected {
    background: var(--surface-info);
    border-left: 3px solid var(--color-primary);
    padding-left: calc(var(--space-16) - 3px);
  }

  .army-info {
    flex: 1;
  }

  .army-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-16);
    margin-bottom: var(--space-8);
  }

  .army-name {
    font-size: var(--font-xl);
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  .hp-status {
    color: var(--text-secondary);
    font-size: var(--font-xl);
    font-weight: 600;
    white-space: nowrap;
  }

  .conditions {
    color: var(--text-secondary);
    font-size: var(--font-md);
    line-height: 1.4;
  }
</style>
