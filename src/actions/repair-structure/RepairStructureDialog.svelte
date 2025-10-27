<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import { structuresService } from '../../services/structures';
  import type { Settlement } from '../../models/Settlement';
  import Button from '../../view/kingdom/components/baseComponents/Button.svelte';
  
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // State
  let selectedStructureId: string = '';
  let selectedSettlementId: string = '';
  let errorMessage: string = '';
  let isLoading: boolean = true;
  
  // Repairable structures grouped by settlement
  let repairableBySettlement: Array<{
    settlement: Settlement;
    structures: Array<{
      id: string;
      name: string;
      category: string;
      tier: number;
    }>;
  }> = [];
  
  // Load repairable structures
  onMount(async () => {
    await loadRepairableStructures();
  });
  
  // Reload when dialog opens
  $: if (show) {
    selectedStructureId = '';
    selectedSettlementId = '';
    errorMessage = '';
    loadRepairableStructures();
  }
  
  async function loadRepairableStructures() {
    isLoading = true;
    errorMessage = '';
    
    try {
      const structures = structuresService.getRepairableStructures();
      
      // Group by settlement ID
      const grouped = new Map<string, Array<any>>();
      
      for (const struct of structures) {
        if (!grouped.has(struct.settlementId)) {
          grouped.set(struct.settlementId, []);
        }
        grouped.get(struct.settlementId)!.push({
          id: struct.structureId,
          name: struct.structureName,
          category: struct.structureCategory,
          tier: struct.structureTier
        });
      }
      
      // Convert to array with settlement data
      repairableBySettlement = [];
      for (const [settlementId, structs] of grouped) {
        // Get settlement name from first structure in group
        const settlementName = structures.find((s: any) => s.settlementId === settlementId)?.settlementName || settlementId;
        
        repairableBySettlement.push({
          settlement: { id: settlementId, name: settlementName } as Settlement,
          structures: structs
        });
      }
      
      // Sort by settlement name
      repairableBySettlement.sort((a, b) => a.settlement.name.localeCompare(b.settlement.name));
      
    } catch (error) {
      logger.error('Error loading repairable structures:', error);
      errorMessage = error instanceof Error ? error.message : 'Failed to load structures';
    } finally {
      isLoading = false;
    }
  }
  
  function handleClose() {
    show = false;
    dispatch('close');
  }
  
  function handleSelect(structureId: string, settlementId: string) {
    selectedStructureId = structureId;
    selectedSettlementId = settlementId;
  }
  
  function handleConfirm() {
    if (!selectedStructureId || !selectedSettlementId) {
      errorMessage = 'Please select a structure to repair';
      return;
    }
    
    dispatch('structureSelected', {
      structureId: selectedStructureId,
      settlementId: selectedSettlementId
    });
    
    show = false;
  }
  
  function getTierLabel(tier: number): string {
    return `Tier ${tier}`;
  }
  
  function formatCategory(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={handleClose}>
    <div class="dialog-container" on:click|stopPropagation>
      <!-- Header -->
      <div class="dialog-header">
        <h2>
          <i class="fas fa-tools"></i>
          Repair Damaged Structure
        </h2>
        <button class="close-button" on:click={handleClose}>
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- Messages -->
      {#if errorMessage}
        <div class="message error">
          <i class="fas fa-exclamation-circle"></i>
          {errorMessage}
        </div>
      {/if}
      
      <!-- Content -->
      <div class="dialog-content">
        {#if isLoading}
          <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading damaged structures...</span>
          </div>
        {:else if repairableBySettlement.length === 0}
          <div class="empty-state">
            <i class="fas fa-check-circle"></i>
            <div class="empty-message">
              <strong>No Damaged Structures</strong>
              <p>All structures are in good condition!</p>
            </div>
          </div>
        {:else}
          <div class="info-banner">
            <i class="fas fa-info-circle"></i>
            <span>Select a structure to repair. Only the lowest tier damaged structure per category can be repaired first.</span>
          </div>
          
          {#each repairableBySettlement as group}
            <div class="settlement-section">
              <div class="settlement-header">
                {group.settlement.name}
              </div>
              
              <div class="structures-list">
                {#each group.structures as structure}
                  {@const isSelected = selectedStructureId === structure.id && selectedSettlementId === group.settlement.id}
                  
                  <button
                    class="structure-item"
                    class:selected={isSelected}
                    on:click={() => handleSelect(structure.id, group.settlement.id)}
                  >
                    <div class="structure-info">
                      <span class="structure-name">{structure.name}</span>
                      <span class="structure-tier">{getTierLabel(structure.tier)}</span>
                    </div>
                    
                    {#if isSelected}
                      <div class="selected-indicator">
                        <i class="fas fa-check-circle"></i>
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      </div>
      
      <!-- Footer -->
      {#if !isLoading && repairableBySettlement.length > 0}
        <div class="dialog-footer">
          <Button variant="secondary" on:click={handleClose}>
            Cancel
          </Button>
          <Button
            variant="warning"
            icon="fas fa-tools"
            disabled={!selectedStructureId || !selectedSettlementId}
            on:click={handleConfirm}
          >
            Repair Structure
          </Button>
        </div>
      {/if}
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
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dialog-container {
    background: var(--bg-base);
    border-radius: var(--radius-lg, 0.5rem);
    border: 1px solid var(--border-strong);
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-elevated);
    
    h2 {
      margin: 0;
      color: var(--color-amber, #f59e0b);
      font-size: var(--font-2xl, 1.5rem);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .close-button {
      background: none;
      border: none;
      color: var(--text-secondary, #9ca3af);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: var(--radius-sm, 0.25rem);
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary, #f3f4f6);
      }
    }
  }
  
  .message {
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--font-sm, 0.875rem);
    
    &.error {
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
      border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    }
  }
  
  .dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem 1rem;
    color: var(--text-secondary, #9ca3af);
    
    i {
      font-size: 3rem;
      opacity: 0.5;
    }
  }
  
  .empty-state {
    i {
      color: var(--color-green, #22c55e);
    }
    
    .empty-message {
      text-align: center;
      
      strong {
        display: block;
        font-size: var(--font-lg, 1.125rem);
        color: var(--text-primary, #f3f4f6);
        margin-bottom: 0.5rem;
      }
      
      p {
        margin: 0;
        color: var(--text-secondary, #9ca3af);
      }
    }
  }
  
  .info-banner {
    display: flex;
    align-items: start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--radius-md, 0.375rem);
    font-size: var(--font-sm, 0.875rem);
    color: var(--text-secondary, #9ca3af);
    
    i {
      color: rgb(96, 165, 250);
      margin-top: 0.125rem;
      flex-shrink: 0;
    }
  }
  
  .settlement-section {
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md, 0.375rem);
    background: var(--bg-surface);
    overflow: hidden;
  }
  
  .settlement-header {
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: var(--font-md, 1rem);
    font-weight: 600;
  }
  
  .structures-list {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .structure-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--bg-base);
    border: 2px solid transparent;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
    font-family: inherit;
    
    &:hover {
      background: var(--bg-elevated);
      border-color: var(--border-strong);
    }
    
    &.selected {
      background: rgba(245, 158, 11, 0.1);
      border-color: var(--color-amber, #f59e0b);
    }
  }
  
  .structure-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .structure-name {
    font-weight: 600;
    color: var(--text-primary, #f3f4f6);
    font-size: var(--font-md, 1rem);
  }
  
  .structure-tier {
    padding: 0.125rem 0.5rem;
    background: rgba(100, 116, 139, 0.2);
    border: 1px solid rgba(100, 116, 139, 0.3);
    border-radius: var(--radius-sm, 0.25rem);
    font-size: var(--font-xs, 0.75rem);
    font-weight: 600;
    color: var(--text-tertiary, #6b7280);
  }
  
  .selected-indicator {
    color: var(--color-amber, #f59e0b);
    font-size: 1.5rem;
    
    i {
      filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.5));
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default);
    background: var(--bg-elevated);
  }
</style>
