<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { StructureCondition, SettlementTier } from '../../../../models/Settlement';
   import { getStructureCount, getMaxStructures } from './settlements.utils';
   import { settlementStructureManagement } from '../../../../services/structures/management';
   import { structuresService } from '../../../../services/structures';
   import SettlementStructureManager from '../../components/SettlementStructureManager.svelte';
   import StructureDetailsDialog from '../../components/dialogs/StructureDetailsDialog.svelte';
   import Button from '../../components/baseComponents/Button.svelte';
   import Notification from '../../components/baseComponents/Notification.svelte';
   import type { Structure } from '../../../../models/Structure';
   
   export let settlement: Settlement;
   
   let showAddDialog = false;
   let showDetailsDialog = false;
   let selectedStructure: Structure | null = null;
   let expandedGroups: Set<string> = new Set(); // Track which structure families are expanded
   let dismissedWarning = false;
   
   // Force reactivity by converting Set to Array
   $: expandedGroupsArray = Array.from(expandedGroups);
   
   // Helper to check if expanded (directly uses reactive array)
   $: isExpanded = (category: string) => expandedGroupsArray.includes(category);
   
   // Get minimum structure requirements for tier
   // Returns the minimum structures this tier SHOULD have (i.e., what was needed to become this tier)
   function getMinStructuresForTier(tier: SettlementTier): number {
      switch (tier) {
         case SettlementTier.VILLAGE:
            return 0; // Starting tier, no requirement
         case SettlementTier.TOWN:
            return 3; // Needed 3 structures to become Town
         case SettlementTier.CITY:
            return 6; // Needed 6 structures to become City
         case SettlementTier.METROPOLIS:
            return 9; // Needed 9 structures to become Metropolis
         default:
            return 0;
      }
   }
   
   // Check if settlement meets minimum structure requirements
   $: currentStructures = settlement.structureIds?.length || 0;
   $: requiredStructures = getMinStructuresForTier(settlement.tier);
   $: meetsRequirements = currentStructures >= requiredStructures;
   $: showWarning = !meetsRequirements && requiredStructures > 0 && !dismissedWarning;
   
   // Get grouped structures for this settlement (grouped by family with tier hierarchy)
   $: groupedStructures = settlementStructureManagement.getSettlementStructuresGrouped(settlement);
   
   // Separate by type for section dividers
   $: supportStructures = groupedStructures.filter(g => g.highestTier.type === 'support');
   $: skillStructures = groupedStructures.filter(g => g.highestTier.type === 'skill');
   
   function toggleGroup(groupCategory: string) {
      if (expandedGroups.has(groupCategory)) {
         expandedGroups.delete(groupCategory);
      } else {
         expandedGroups.add(groupCategory);
      }
      expandedGroups = new Set(expandedGroups);
   }
   
   // Get all structure IDs in a family (for shift-click delete)
   function getStructureFamilyIds(structure: Structure): string[] {
      const group = groupedStructures.find(g => 
         g.highestTier.id === structure.id || 
         g.lowerTiers.some(s => s.id === structure.id)
      );
      
      if (!group) return [structure.id];
      
      return [group.highestTier.id, ...group.lowerTiers.map(s => s.id)]
         .filter(id => settlement.structureIds.includes(id));
   }
   
   // Get the next tier structure in the progression chain
   function getNextTierStructure(currentStructureId: string): Structure | null {
      // Use the structures service to find the next upgrade in the catalog
      // This checks the full structure database, not just what's currently built
      return structuresService.getNextUpgrade(currentStructureId);
   }
   
   async function handleUpgradeStructure(currentStructureId: string, event: MouseEvent) {
      event.stopPropagation();
      
      const nextTier = getNextTierStructure(currentStructureId);
      if (!nextTier) return;
      
      try {
         const result = await settlementStructureManagement.addStructureToSettlement(
            nextTier.id,
            settlement.id
         );
         
         if (result.success) {
            // @ts-ignore
            ui.notifications?.info(`Added ${nextTier.name}`);
         } else {
            // @ts-ignore
            ui.notifications?.error(result.error || 'Failed to add structure');
         }
      } catch (error) {
         console.error('Error adding structure:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to add structure');
      }
   }
   
   async function handleDeleteStructure(structureId: string, structureName: string, event: MouseEvent) {
      const isShiftClick = event.shiftKey;
      const groupStructureIds = isShiftClick ? getStructureFamilyIds(structuresService.getStructure(structureId)!) : [structureId];
      const isGroupDelete = groupStructureIds.length > 1;
      
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: isGroupDelete ? 'Remove Entire Structure Tree' : 'Remove Structure',
         content: isGroupDelete 
            ? `<p>This will remove the <strong>entire structure progression tree</strong> (${groupStructureIds.length} structures). Are you sure?</p><p>This action cannot be undone.</p>`
            : `<p>Are you sure you want to remove <strong>${structureName}</strong>?</p><p>This action cannot be undone.</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         // If group delete, remove all structures in the group
         if (isGroupDelete) {
            let successCount = 0;
            let errorCount = 0;
            
            for (const id of groupStructureIds) {
               const result = await settlementStructureManagement.removeStructureFromSettlement(
                  id,
                  settlement.id
               );
               
               if (result.success) {
                  successCount++;
               } else {
                  errorCount++;
               }
            }
            
            if (successCount > 0) {
               // @ts-ignore
               ui.notifications?.info(`Removed ${successCount} structure(s)`);
            }
            if (errorCount > 0) {
               // @ts-ignore
               ui.notifications?.error(`Failed to remove ${errorCount} structure(s)`);
            }
         } else {
            // Single structure delete
            const result = await settlementStructureManagement.removeStructureFromSettlement(
               structureId,
               settlement.id
            );
            
            if (result.success) {
               if (result.warning) {
                  // @ts-ignore
                  ui.notifications?.warn(result.warning);
               }
               // @ts-ignore
               ui.notifications?.info(`Removed ${structureName}`);
            } else {
               // @ts-ignore
               ui.notifications?.error(result.error || 'Failed to remove structure');
            }
         }
      } catch (error) {
         console.error('Error removing structure:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to remove structure');
      }
   }
   
   function openAddDialog() {
      showAddDialog = true;
   }
   
   function showStructureDetails(structureId: string) {
      const structure = structuresService.getStructure(structureId);
      if (structure) {
         selectedStructure = structure;
         showDetailsDialog = true;
      }
   }
   
   
   function getSkillsText(structure: Structure): string {
      if (structure.type === 'skill' && structure.effects.skillsSupported) {
         return structure.effects.skillsSupported
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join(', ');
      }
      return '';
   }
   
   function getStructureCondition(structureId: string): StructureCondition {
      if (!settlement.structureConditions) {
         return StructureCondition.GOOD;
      }
      return settlement.structureConditions[structureId] || StructureCondition.GOOD;
   }
   
   async function handleConditionChange(structureId: string, event: Event) {
      const select = event.target as HTMLSelectElement;
      const newCondition = select.value as StructureCondition;
      
      try {
         const result = await settlementStructureManagement.updateStructureCondition(
            structureId,
            settlement.id,
            newCondition
         );
         
         if (!result.success) {
            // @ts-ignore
            ui.notifications?.error(result.error || 'Failed to update condition');
         }
      } catch (error) {
         console.error('Error updating condition:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to update condition');
      }
   }
</script>

<div class="detail-section">
   <div class="section-header">
      <h4>
         Structures 
         <span class="structure-count">
            ({getStructureCount(settlement)}/{getMaxStructures(settlement)})
         </span>
      </h4>
      <Button variant="small_secondary" on:click={openAddDialog}>
         Manage Structures
      </Button>
   </div>
   
   <!-- Minimum Structures Warning -->
   {#if showWarning}
      <div class="minimum-structures-warning-wrapper">
         <Notification
            variant="warning"
            title="Insufficient Structures for {settlement.tier}"
            description="This {settlement.tier} requires at least {requiredStructures} structures ({currentStructures}/{requiredStructures} built)"
            dismissible={true}
            emphasis={true}
            icon=""
            on:dismiss={() => dismissedWarning = true}
         />
      </div>
   {/if}
   
   {#if settlement.structureIds.length === 0}
      <div class="empty-structures">
         <i class="fas fa-tools"></i>
         <p>No structures built yet.</p>
         <Button variant="outline" size="small" on:click={openAddDialog}>
            Manage Structures
         </Button>
      </div>
   {:else}
      <table class="structures-table">
         <thead>
            <tr>
               <th class="name-col">Name</th>
               <th class="tier-col">Tier</th>
               <th class="condition-col">Condition</th>
               <th class="actions-col">Actions</th>
            </tr>
         </thead>
         <tbody>
            <!-- Support Structures Section -->
            {#if supportStructures.length > 0}
               <tr class="section-divider">
                  <td colspan="4" class="section-label">Support Structures</td>
               </tr>

               {#each supportStructures as group (group.category)}
                  {@const hasLowerTiers = group.lowerTiers.length > 0}
                  {@const nextTier = getNextTierStructure(group.highestTier.id)}
                  
                  <!-- Highest Tier Structure -->
                  <tr class="structure-row" class:damaged={getStructureCondition(group.highestTier.id) === StructureCondition.DAMAGED}>
                     <td class="name-cell">
                        <div class="name-content">
                           <span class="expand-button-slot">
                              {#if hasLowerTiers}
                                 <button class="expand-button" on:click={() => toggleGroup(group.category)} title={isExpanded(group.category) ? 'Collapse' : 'Expand'}>
                                    <i class="fas fa-chevron-{isExpanded(group.category) ? 'down' : 'right'}"></i>
                                 </button>
                              {/if}
                           </span>
                           <button class="structure-name-button" on:click={() => showStructureDetails(group.highestTier.id)} title="View details">
                              {group.highestTier.name}
                           </button>
                        </div>
                     </td>
                     <td class="tier-cell">
                        <span class="tier-label">{group.highestTier.tier}</span>
                     </td>
                     <td class="condition-cell">
                        <select 
                           class="condition-select"
                           class:condition-good={getStructureCondition(group.highestTier.id) === StructureCondition.GOOD}
                           class:condition-damaged={getStructureCondition(group.highestTier.id) === StructureCondition.DAMAGED}
                           value={getStructureCondition(group.highestTier.id)}
                           on:change={(e) => handleConditionChange(group.highestTier.id, e)}
                        >
                           <option value={StructureCondition.GOOD}>-</option>
                           <option value={StructureCondition.DAMAGED}>Damaged</option>
                        </select>
                     </td>
                     <td class="actions-cell">
                        <div class="action-buttons">
                           {#if nextTier}
                              <button 
                                 class="upgrade-button" 
                                 on:click={(e) => handleUpgradeStructure(group.highestTier.id, e)} 
                                 title="Add {nextTier.name}"
                              >
                                 <i class="fas fa-plus"></i>
                              </button>
                           {/if}
                           <button 
                              class="delete-button" 
                              on:click={(e) => handleDeleteStructure(group.highestTier.id, group.highestTier.name, e)} 
                              title={hasLowerTiers ? 'Click to remove this tier only, Shift+Click to remove entire tree' : 'Remove structure'}
                           >
                              <i class="fas fa-minus"></i>
                           </button>
                        </div>
                     </td>
                  </tr>
                  
                  <!-- Lower Tier Structures (when expanded) -->
                  {#if isExpanded(group.category) && hasLowerTiers}
                     {#each group.lowerTiers as lowerTier (lowerTier.id)}
                        <tr class="structure-row lower-tier" class:damaged={getStructureCondition(lowerTier.id) === StructureCondition.DAMAGED}>
                           <td class="name-cell">
                              <div class="name-content">
                                 <span class="expand-button-slot indented"></span>
                                 <button class="structure-name-button" on:click={() => showStructureDetails(lowerTier.id)} title="View details">
                                    {lowerTier.name}
                                 </button>
                              </div>
                           </td>
                           <td class="tier-cell">
                              <span class="tier-label">{lowerTier.tier}</span>
                           </td>
                           <td class="condition-cell">
                              <select 
                                 class="condition-select"
                                 class:condition-good={getStructureCondition(lowerTier.id) === StructureCondition.GOOD}
                                 class:condition-damaged={getStructureCondition(lowerTier.id) === StructureCondition.DAMAGED}
                                 value={getStructureCondition(lowerTier.id)}
                                 on:change={(e) => handleConditionChange(lowerTier.id, e)}
                              >
                                 <option value={StructureCondition.GOOD}>-</option>
                                 <option value={StructureCondition.DAMAGED}>Damaged</option>
                              </select>
                           </td>
                           <td class="actions-cell">
                              <div class="action-buttons">
                                 <span class="button-placeholder"></span>
                                 <button 
                                    class="delete-button" 
                                    on:click={(e) => handleDeleteStructure(lowerTier.id, lowerTier.name, e)} 
                                    title="Remove structure"
                                 >
                                    <i class="fas fa-minus"></i>
                                 </button>
                              </div>
                           </td>
                        </tr>
                     {/each}
                  {/if}
               {/each}
            {/if}

            <!-- Skill Structures Section -->
            {#if skillStructures.length > 0}
               <tr class="section-divider">
                  <td colspan="4" class="section-label">Skill Structures</td>
               </tr>

               {#each skillStructures as group (group.category)}
                  {@const hasLowerTiers = group.lowerTiers.length > 0}
                  {@const skillsText = getSkillsText(group.highestTier)}
                  {@const nextTierSkill = getNextTierStructure(group.highestTier.id)}
                  
                  <!-- Highest Tier Structure -->
                  <tr class="structure-row" class:damaged={getStructureCondition(group.highestTier.id) === StructureCondition.DAMAGED}>
                     <td class="name-cell">
                        <div class="name-content">
                           <span class="expand-button-slot">
                              {#if hasLowerTiers}
                                 <button class="expand-button" on:click={() => toggleGroup(group.category)} title={isExpanded(group.category) ? 'Collapse' : 'Expand'}>
                                    <i class="fas fa-chevron-{isExpanded(group.category) ? 'down' : 'right'}"></i>
                                 </button>
                              {/if}
                           </span>
                           <button class="structure-name-button" on:click={() => showStructureDetails(group.highestTier.id)} title="View details">
                              {group.highestTier.name}
                              {#if skillsText}
                                 <span class="skills-badge">({skillsText})</span>
                              {/if}
                           </button>
                        </div>
                     </td>
                     <td class="tier-cell">
                        <span class="tier-label">{group.highestTier.tier}</span>
                     </td>
                     <td class="condition-cell">
                        <select 
                           class="condition-select"
                           class:condition-good={getStructureCondition(group.highestTier.id) === StructureCondition.GOOD}
                           class:condition-damaged={getStructureCondition(group.highestTier.id) === StructureCondition.DAMAGED}
                           value={getStructureCondition(group.highestTier.id)}
                           on:change={(e) => handleConditionChange(group.highestTier.id, e)}
                        >
                           <option value={StructureCondition.GOOD}>-</option>
                           <option value={StructureCondition.DAMAGED}>Damaged</option>
                        </select>
                     </td>
                     <td class="actions-cell">
                        <div class="action-buttons">
                           {#if nextTierSkill}
                              <button 
                                 class="upgrade-button" 
                                 on:click={(e) => handleUpgradeStructure(group.highestTier.id, e)} 
                                 title="Add {nextTierSkill.name}"
                              >
                                 <i class="fas fa-plus"></i>
                              </button>
                           {/if}
                           <button 
                              class="delete-button" 
                              on:click={(e) => handleDeleteStructure(group.highestTier.id, group.highestTier.name, e)} 
                              title={hasLowerTiers ? 'Click to remove this tier only, Shift+Click to remove entire tree' : 'Remove structure'}
                           >
                              <i class="fas fa-minus"></i>
                           </button>
                        </div>
                     </td>
                  </tr>
                  
                  <!-- Lower Tier Structures (when expanded) -->
                  {#if isExpanded(group.category) && hasLowerTiers}
                     {#each group.lowerTiers as lowerTier (lowerTier.id)}
                        {@const lowerSkillsText = getSkillsText(lowerTier)}
                        <tr class="structure-row lower-tier" class:damaged={getStructureCondition(lowerTier.id) === StructureCondition.DAMAGED}>
                           <td class="name-cell">
                              <div class="name-content">
                                 <span class="expand-button-slot indented"></span>
                                 <button class="structure-name-button" on:click={() => showStructureDetails(lowerTier.id)} title="View details">
                                    {lowerTier.name}
                                    {#if lowerSkillsText}
                                       <span class="skills-badge">({lowerSkillsText})</span>
                                    {/if}
                                 </button>
                              </div>
                           </td>
                           <td class="tier-cell">
                              <span class="tier-label">{lowerTier.tier}</span>
                           </td>
                           <td class="condition-cell">
                              <select 
                                 class="condition-select"
                                 class:condition-good={getStructureCondition(lowerTier.id) === StructureCondition.GOOD}
                                 class:condition-damaged={getStructureCondition(lowerTier.id) === StructureCondition.DAMAGED}
                                 value={getStructureCondition(lowerTier.id)}
                                 on:change={(e) => handleConditionChange(lowerTier.id, e)}
                              >
                                 <option value={StructureCondition.GOOD}>-</option>
                                 <option value={StructureCondition.DAMAGED}>Damaged</option>
                              </select>
                           </td>
                           <td class="actions-cell">
                              <div class="action-buttons">
                                 <span class="button-placeholder"></span>
                                 <button 
                                    class="delete-button" 
                                    on:click={(e) => handleDeleteStructure(lowerTier.id, lowerTier.name, e)} 
                                    title="Remove structure"
                                 >
                                    <i class="fas fa-minus"></i>
                                 </button>
                              </div>
                           </td>
                        </tr>
                     {/each}
                  {/if}
               {/each}
            {/if}
         </tbody>
      </table>
   {/if}
</div>

<!-- Structure Details Dialog -->
<StructureDetailsDialog
   bind:show={showDetailsDialog}
   structure={selectedStructure}
/>

<!-- Add Structure Manager -->
<SettlementStructureManager 
   bind:show={showAddDialog}
   {settlement}
   on:close={() => showAddDialog = false}
   on:structureAdded={() => {
      // Structures update automatically via store
   }}
   on:structureRemoved={() => {
      // Structures update automatically via store
   }}
/>

<style lang="scss">
   @use './settlements-shared.scss';
   
   .detail-section {
      margin-bottom: var(--space-24);
      
      .section-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: var(--space-16);
         
         h4 {
            display: flex;
            align-items: center;
            gap: var(--space-8);
            margin: 0;
            
            .structure-count {
               font-size: var(--font-md);
               font-weight: var(--font-weight-medium);
               color: var(--text-secondary);
            }
         }
         
      }
   }
   
   .empty-structures {
      @extend .empty-state;
   }
   
   .minimum-structures-warning-wrapper {
      margin-bottom: var(--space-16);
   }
   
   .structures-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface-lower);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
      
      thead {
         background: var(--surface);
         
         th {
            padding: var(--space-12);
            text-align: left;
            font-weight: var(--font-weight-light);
            color: var(--text-secondary);
            font-size: var(--font-md);
            border-bottom: 1px solid var(--border-subtle);
            
            &.name-col {
               width: 50%;
            }
            
            &.tier-col {
               width: 15%;
               text-align: center;
            }
            
            &.condition-col {
               width: 20%;
               text-align: center;
            }
            
            &.actions-col {
               width: 15%;
               text-align: center;
            }
         }
      }
      
      tbody {
            .structure-row {
               background: var(--overlay);
               border-bottom: 1px solid var(--border-faint);
               
               &.lower-tier {
                  background: rgba(0, 0, 0, 0.2);
                  
                  .name-content.indented {
                     padding-left: var(--space-24);
                  }
               }
               
               &.damaged {
                  background: rgba(255, 50, 50, 0.15);
                  border-left: 3px solid #ff6b6b;
                  
                  .structure-name {
                     color: #ff6b6b;
                  }
               }
            
            td {
               padding: var(--space-12);
               color: var(--text-primary);
               font-size: var(--font-md);
               vertical-align: middle;
            }
               
            .name-cell {
               text-align: left;
               
               .name-content {
                     display: flex;
                     align-items: center;
                     gap: var(--space-8);
                     
                     &.indented {
                        padding-left: var(--space-12);
                     }
                     
                  .expand-button-slot {
                     width: 1.25rem;
                     flex-shrink: 0;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     
                     &.indented {
                        width: calc(1.25rem + var(--space-24));
                        padding-left: var(--space-24);
                     }
                  }
                  
                  .expand-button {
                     background: none;
                     border: none;
                     color: var(--text-secondary);
                     cursor: pointer;
                     padding: 0;
                     width: 1.25rem;
                     height: 1.25rem;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     transition: color 0.2s ease;
                     
                     &:hover {
                        color: var(--text-primary);
                     }
                  }
                  
                  .structure-name {
                     font-weight: var(--font-weight-semibold);
                     
                     .skills-badge {
                        font-weight: normal;
                        color: var(--text-tertiary);
                        font-size: var(--font-sm);
                        margin-left: var(--space-8);
                     }
                  }
                  
                  .structure-name-button {
                     background: none;
                     border: none;
                     color: var(--text-primary);
                     font-weight: var(--font-weight-semibold);
                     font-size: var(--font-md);
                     cursor: pointer;
                     padding: 0;
                     text-align: left;
                     transition: all 0.2s ease;
                     text-decoration: underline;
                     text-decoration-color: transparent;
                     white-space: nowrap;
                     overflow: hidden;
                     text-overflow: ellipsis;
                     max-width: 100%;
                     display: block;
                     
                     &:hover {
                        color: var(--text-link-hover);
                        text-decoration-color: var(--text-link-hover);
                     }
                     
                     .skills-badge {
                        font-weight: normal;
                        color: var(--text-tertiary);
                        font-size: var(--font-sm);
                        margin-left: var(--space-8);
                        text-decoration: none;
                     }
                  }
               }
            }
            
            .tier-cell {
               text-align: center;
               
               .tier-label {
                  display: inline-block;
                  padding: var(--space-4) var(--space-8);
                  background: var(--overlay);
                  border-radius: var(--radius-sm);
                  font-size: var(--font-md);
                  color: var(--text-secondary);
                  font-weight: 600;
               }
            }
            
            .condition-cell {
               text-align: center;
               
               .condition-select {
                  width: 100%;
                  padding: var(--space-4) var(--space-8);
                  background: transparent;
                  border: none;
                  color: var(--text-secondary);
                  font-size: var(--font-md);
                  cursor: pointer;
                  appearance: none;
                  -webkit-appearance: none;
                  -moz-appearance: none;
                  text-align: center;
                  text-align-last: center;
                  transition: all 0.2s ease;
                  font-weight: var(--font-weight-light);
                  
                  &:hover {
                     outline: 1px solid rgba(255, 255, 255, 0.2);
                     outline-offset: -0.0625rem;
                  }
                  
                  &:focus {
                     outline: none;
                  }
               }
            }
            
            .actions-cell {
               text-align: center;
               
               .action-buttons {
                  display: inline-flex;
                  gap: var(--space-4);
                  align-items: center;
               }
               
               .upgrade-button {
                  background: transparent;
                  border: none;
                  color: var(--text-secondary);
                  cursor: pointer;
                  padding: var(--space-8);
                  border-radius: var(--radius-sm);
                  transition: all 0.2s ease;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  
                  &:hover {
                     background: #4ade80;
                     color: rgba(0, 0, 0, 0.8);
                  }
               }
               
               .delete-button {
                  background: transparent;
                  border: none;
                  color: var(--text-secondary);
                  cursor: pointer;
                  padding: var(--space-8);
                  border-radius: var(--radius-sm);
                  transition: all 0.2s ease;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  
                  &:hover {
                     background: #ff6b6b;
                     color: rgba(0, 0, 0, 0.8);
                  }
               }
               
               .button-placeholder {
                  display: inline-block;
                  width: 2.5rem;
                  height: 2.5rem;
               }
            }
      }

      /* Section divider row inside single table */
      .section-divider {
         background: var(--surface);
         border-bottom: 1px solid var(--border-subtle);
      }

      .section-label {
         padding: var(--space-8) var(--space-12);
         text-transform: uppercase;
         font-weight: var(--font-weight-semibold);
         color: var(--text-secondary);
         background: transparent;
      }
      }
   }
</style>
