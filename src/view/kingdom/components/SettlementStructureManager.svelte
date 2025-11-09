<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { settlementStructureManagement } from '../../../services/structures/management';
  import { structuresService } from '../../../services/structures';
  import type { Structure } from '../../../models/Structure';
  import type { Settlement } from '../../../models/Settlement';
  import { SettlementTierConfig } from '../../../models/Settlement';
  import { getCategoryIcon } from '../../kingdom/utils/presentation';
  import { kingdomData, updateKingdom } from '../../../stores/KingdomStore';
  
  export let show: boolean = false;
  export let settlement: Settlement | null = null;
  
  const dispatch = createEventDispatcher();
  
  // State
  let activeTab: 'skill' | 'support' = 'skill';
  let isProcessing: boolean = false;
  
  // Grouped structures
  let skillGroups: Array<{ category: string; displayName: string; structures: Structure[] }> = [];
  let supportGroups: Array<{ category: string; displayName: string; structures: Structure[] }> = [];
  
  // Initialize structures
  onMount(() => {
    structuresService.initializeStructures();
    const grouped = settlementStructureManagement.getStructuresGroupedByTypeAndCategory();
    skillGroups = grouped.skill;
    supportGroups = grouped.support;
  });
  
  // Get current settlement from store (reactive)
  $: currentSettlement = settlement?.id 
    ? $kingdomData.settlements.find(s => s.id === settlement.id) 
    : null;
  
  // Get current tab's groups
  $: currentGroups = activeTab === 'skill' ? skillGroups : supportGroups;
  
  // Get all structures for cascading
  $: allStructures = [...skillGroups, ...supportGroups].flatMap(g => g.structures);
  
  // Warning detection
  $: capacityWarning = currentSettlement && currentSettlement.structureIds.length > SettlementTierConfig[currentSettlement.tier].maxStructures
    ? `Over capacity: ${currentSettlement.structureIds.length}/${SettlementTierConfig[currentSettlement.tier].maxStructures} structures`
    : null;
  
  $: tierWarnings = currentSettlement ? (() => {
    const requiredTierMap: Record<number, string> = { 1: 'Village', 2: 'Town', 3: 'City', 4: 'Metropolis' };
    const byTier: Record<string, string[]> = {};
    
    currentSettlement.structureIds.forEach(id => {
      const structure = structuresService.getStructure(id);
      if (structure && structureExceedsTier(structure)) {
        const requiredTier = requiredTierMap[structure.minimumSettlementTier || 1];
        if (!byTier[requiredTier]) {
          byTier[requiredTier] = [];
        }
        byTier[requiredTier].push(structure.name);
      }
    });
    
    return Object.entries(byTier).map(([tier, names]) => 
      `Requires ${tier}: ${names.join(', ')}`
    );
  })() : [];
  
  $: currentWarnings = [
    capacityWarning,
    ...tierWarnings
  ].filter(Boolean).map(message => ({ message }));
  
  function handleClose() {
    show = false;
    dispatch('close');
  }
  
  async function toggleStructure(structureId: string, newCheckedState: boolean) {
    if (!currentSettlement || isProcessing) return;
    
    const structure = allStructures.find(s => s.id === structureId);
    if (!structure) return;
    
    console.log('🔵 Toggle structure:', structureId, 'to', newCheckedState);
    console.log('🔵 Current settlement before:', currentSettlement.structureIds);
    
    isProcessing = true;
    
    try {
      // Import settlementService for proper capacity recalculation
      const { settlementService } = await import('../../../services/settlements');
      
      if (!newCheckedState) {
        // Unchecking - remove this structure and all higher tiers in same category
        const toRemove = allStructures
          .filter(s => 
            s.category === structure.category && 
            s.tier >= structure.tier &&
            currentSettlement.structureIds.includes(s.id)
          )
          .sort((a, b) => b.tier - a.tier); // Remove higher tiers first
        
        console.log('🔴 Removing:', toRemove.map(s => s.id));
        
        // Use service to remove each structure (triggers recalculation)
        for (const structToRemove of toRemove) {
          await settlementService.removeStructure(currentSettlement.id, structToRemove.id);
          dispatch('structureRemoved', { structureId: structToRemove.id });
        }
        
        console.log('🔴 Structures removed via service');
      } else {
        // Checking - add all lower tier prerequisites first, then this structure
        const toAdd = allStructures
          .filter(s => 
            s.category === structure.category && 
            s.tier <= structure.tier &&
            !currentSettlement.structureIds.includes(s.id)
          )
          .sort((a, b) => a.tier - b.tier); // Add lower tiers first
        
        console.log('🟢 Adding:', toAdd.map(s => s.id));
        
        // Use service to add each structure (triggers recalculation)
        for (const structToAdd of toAdd) {
          await settlementService.addStructure(currentSettlement.id, structToAdd.id);
          dispatch('structureAdded', { structureId: structToAdd.id });
        }
        
        console.log('🟢 Structures added via service');
      }
      
      console.log('🔵 After service calls, currentSettlement:', currentSettlement?.structureIds);
    } catch (error) {
      console.error('Error toggling structure:', error);
      // @ts-ignore - Foundry global
      ui.notifications?.error('Failed to update structure');
    } finally {
      isProcessing = false;
    }
  }
  
  function isStructureBuilt(structureId: string): boolean {
    return currentSettlement?.structureIds.includes(structureId) || false;
  }
  
  function getSettlementCapacityText(): string {
    if (!currentSettlement) return '';
    const max = SettlementTierConfig[currentSettlement.tier].maxStructures;
    const current = currentSettlement.structureIds.length;
    return `${current}/${max}`;
  }
  
  function getSkillsText(structure: Structure): string {
    if (structure.type === 'skill' && structure.effects.skillsSupported) {
      return structure.effects.skillsSupported
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(', ');
    }
    return '';
  }
  
  function structureExceedsTier(structure: Structure): boolean {
    if (!currentSettlement || !structure.minimumSettlementTier) return false;
    const tierMap: Record<string, number> = {
      'Village': 1, 'Town': 2, 'City': 3, 'Metropolis': 4
    };
    const settlementTierNum = tierMap[currentSettlement.tier] || 1;
    return structure.minimumSettlementTier > settlementTierNum;
  }
  
  function getTierName(tier: number): string {
    const tierMap: Record<number, string> = { 1: 'Village', 2: 'Town', 3: 'City', 4: 'Metropolis' };
    return tierMap[tier] || 'Village';
  }
  
</script>

{#if show && settlement}
  <div class="dialog-overlay" on:click={handleClose}>
    <div class="dialog-container" on:click|stopPropagation>
      <!-- Header -->
      <div class="dialog-header">
        <h2>
          <i class="fas fa-building"></i>
          Manage Structures - {settlement.name}
        </h2>
        <div class="header-info">
          <span class="capacity-badge">
            <i class="fas fa-layer-group"></i>
            {getSettlementCapacityText()}
          </span>
          <button class="close-button" on:click={handleClose}>
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <!-- Structure Type Selection -->
      <div class="structure-type-selector">
        <div class="radio-group" role="radiogroup" aria-label="Structure type">
          <label class="radio-option" class:selected={activeTab === 'skill'}>
            <input 
              type="radio" 
              name="structureType" 
              value="skill" 
              bind:group={activeTab}
              class="radio-input"
            />
            <span class="radio-content">
              <span class="radio-icon">
                <i class="fas fa-graduation-cap"></i>
              </span>
              <span class="radio-label">Skill Structures</span>
            </span>
          </label>
          
          <label class="radio-option" class:selected={activeTab === 'support'}>
            <input 
              type="radio" 
              name="structureType" 
              value="support" 
              bind:group={activeTab}
              class="radio-input"
            />
            <span class="radio-content">
              <span class="radio-icon">
                <i class="fas fa-hands-helping"></i>
              </span>
              <span class="radio-label">Support Structures</span>
            </span>
          </label>
        </div>
      </div>
      
      <!-- Content -->
      <div class="dialog-content">
        {#if currentSettlement}
          {#each currentGroups as group}
            <div class="category-section">
              <div class="category-header">
                <i class="fas {getCategoryIcon(group.displayName)}"></i>
                {group.displayName}
              </div>
              
              <div class="structures-list">
                {#key currentSettlement?.structureIds}
                  {#each group.structures as structure (structure.id)}
                    {@const isBuilt = isStructureBuilt(structure.id)}
                  {@const skillsText = getSkillsText(structure)}
                  {@const exceedsTier = structureExceedsTier(structure)}
                  
                  <div 
                    class="structure-item" 
                    class:built={isBuilt}
                    class:disabled={isProcessing}
                    on:click={() => !isProcessing && toggleStructure(structure.id, !isBuilt)}
                  >
                    <input 
                      type="checkbox" 
                      checked={isBuilt}
                      on:click|stopPropagation
                      on:change={(e) => toggleStructure(structure.id, e.currentTarget.checked)}
                      disabled={isProcessing}
                      class="structure-checkbox"
                    />
                    
                    <div class="structure-info">
                      <div class="structure-name-row">
                        <span class="structure-name">
                          {structure.name}
                          {#if skillsText}
                            <span class="skills-text">({skillsText})</span>
                          {/if}
                        </span>
                        {#if exceedsTier}
                          <span class="tier-info">
                            <i class="fas fa-info-circle"></i>
                            Requires {getTierName(structure.minimumSettlementTier || 1)}
                          </span>
                        {/if}
                      </div>
                      
                      {#if structure.description}
                        <div class="structure-description">{structure.description}</div>
                      {/if}
                      
                      {#if structure.modifiers && structure.modifiers.length > 0}
                        <div class="structure-modifiers">
                          {#each structure.modifiers as modifier}
                            <span class="modifier-badge">
                              {modifier.resource}: {modifier.value}
                            </span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    </div>
                  {/each}
                {/key}
              </div>
            </div>
          {/each}
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="dialog-footer">
        {#if currentWarnings.length > 0}
          <div class="warning-section">
            {#each currentWarnings as warning}
              <div class="warning-message">
                <i class="fas fa-exclamation-triangle"></i>
                {warning.message}
              </div>
            {/each}
          </div>
        {/if}
        
        <div class="footer-buttons">
          <button class="close-button" on:click={handleClose}>
            Close
          </button>
        </div>
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
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dialog-container {
    background: var(--bg-base);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    max-width: 56.2500rem;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0.5000rem 2.0000rem rgba(0, 0, 0, 0.5);
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .5rem var(--space-16);
    border-bottom: 1px solid var(--border-light);
    background: var(--color-gray-950);
    
    h2 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }
    
    .header-info {
      display: flex;
      align-items: center;
      gap: var(--space-16);
    }
    
    .capacity-badge {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-6) var(--space-12);
      background: var(--bg-overlay);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }
    
    .close-button {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: var(--font-xl);
      cursor: pointer;
      padding: var(--space-8);
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
      }
    }
  }
  
  .structure-type-selector {
    display: flex;
    gap: var(--space-16);
    padding: var(--space-12);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    align-items: center;
    
    .radio-group {
      display: flex;
      gap: var(--space-8);
      padding: var(--space-4);
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-xl);
      border: 0.0625rem solid rgba(255, 255, 255, 0.2);
    }
    
    .radio-option {
      display: flex;
      align-items: center;
      padding: var(--space-6) var(--space-10);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      border: 0.1250rem solid transparent;
      user-select: none;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.selected {
        background: rgba(94, 0, 0, 0.3);
        border-color: var(--color-primary);
        
        .radio-content {
          color: var(--text-primary);
        }
      }
    }
    
    .radio-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    
    .radio-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--space-8);
      color: var(--text-secondary);
      transition: color 0.2s;
    }
    
    .radio-icon {
      font-size: var(--font-md);
      
      i {
        font-size: inherit;
      }
    }
    
    .radio-label {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.0500rem;
      white-space: nowrap;
    }
  }
  
  .dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }
  
  .category-section {
    padding-bottom: var(--space-2);
    border: 0px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    overflow: hidden;
  }
  
  .category-header {
    padding: var(--space-6) var(--space-16);
    background: var(--bg-overlay);
    color: var(--color-accent);
    font-size: var(--font-lg);
    font-weight: 600;
    letter-spacing: 0.0500rem;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    
    i {
      font-size: var(--font-md);
    }
  }
  
  .structures-list {
    padding-left: .var(--space-24);
    padding-top: .var(--space-24);
  }
  
  .structure-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-12);
    padding: var(--space-8) var(--space-16);
    background: linear-gradient(135deg,
      rgba(24, 24, 27, 0.6),
      rgba(31, 31, 35, 0.4));
    border-radius: var(--radius-md);
    border: 1px solid var(--border-medium);
    margin-bottom: var(--space-6);
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    
    cursor: pointer;
    user-select: none;
    
    &.built {
      opacity: 0.8;
      background: linear-gradient(135deg,
        rgba(34, 197, 94, 0.15),
        rgba(34, 197, 94, 0.1));
      border-color: rgba(34, 197, 94, 0.3);
    }
    
    &.disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    .structure-checkbox {
      margin-top: var(--space-4);
      width: 1.25rem;
      height: 1.25rem;
      cursor: pointer;
      flex-shrink: 0;
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  
  .structure-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .structure-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
  }
  
  .structure-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-md);
    
    .skills-text {
      font-weight: normal;
      color: var(--text-secondary);
      font-size: var(--font-sm);
      margin-left: var(--space-8);
    }
  }
  
  .structure-description {
    color: var(--text-tertiary);
    font-size: var(--font-md);
    line-height: 1.3;
    font-weight: var(--font-weight-medium);
  }
  
  .tier-info {
    color: var(--text-tertiary);
    font-size: var(--font-sm);
    display: flex;
    align-items: center;
    gap: var(--space-4);
    white-space: nowrap;
  }
  
  .structure-modifiers {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    margin-top: var(--space-6);
  }
  
  .modifier-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-4) var(--space-10);
    background: rgba(34, 197, 94, 0.15);
    color: #86efac;
    border-radius: var(--radius-md);
    font-size: var(--font-xs);
    font-weight: 600;
    border: 0.0625rem solid rgba(34, 197, 94, 0.3);
  }
  
  .dialog-footer {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-16);
    border-top: 1px solid var(--border-default);
    background: var(--bg-elevated);
    
    .warning-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
      .warning-message {
        display: flex;
        align-items: center;
        gap: var(--space-8);
        padding: var(--space-8) var(--space-12);
        background: rgba(251, 191, 36, 0.1);
        border-left: 0.1875rem solid #fbbf24;
        border-radius: var(--radius-sm);
        color: #fbbf24;
        font-size: var(--font-sm);
      }
    }
    
    .footer-buttons {
      display: flex;
      justify-content: flex-end;
    }
    
    .close-button {
      padding: var(--space-8) var(--space-16);
      background: var(--color-gray-800);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 5.0000rem;
      
      &:hover {
        background: var(--color-gray-700);
      }
    }
  }
  
</style>
