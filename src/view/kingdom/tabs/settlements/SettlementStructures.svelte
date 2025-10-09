<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { StructureCondition } from '../../../../models/Settlement';
   import { getStructureCount, getMaxStructures } from './settlements.utils';
   import { settlementStructureManagement } from '../../../../services/structures/management';
   import { structuresService } from '../../../../services/structures';
   import SettlementStructureDialog from '../../components/SettlementStructureDialog.svelte';
   import type { Structure } from '../../../../models/Structure';
   
   export let settlement: Settlement;
   
   let showAddDialog = false;
   let expandedCategories: Set<string> = new Set();
   
   // Get grouped structures for this settlement
   $: groupedStructures = settlementStructureManagement.getSettlementStructuresGrouped(settlement);
   
   function toggleCategory(category: string) {
      if (expandedCategories.has(category)) {
         expandedCategories.delete(category);
      } else {
         expandedCategories.add(category);
      }
      expandedCategories = new Set(expandedCategories);
   }
   
   async function handleDeleteStructure(structureId: string, structureName: string) {
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Remove Structure',
         content: `<p>Are you sure you want to remove <strong>${structureName}</strong>?</p><p>This action cannot be undone.</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
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
      } catch (error) {
         console.error('Error removing structure:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to remove structure');
      }
   }
   
   function openAddDialog() {
      showAddDialog = true;
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
      <button class="add-structure-button" on:click={openAddDialog}>
         <i class="fas fa-plus"></i>
         Add Structure
      </button>
   </div>
   
   {#if settlement.structureIds.length === 0}
      <div class="empty-structures">
         <i class="fas fa-tools"></i>
         <p>No structures built yet.</p>
         <p class="hint">Click "Add Structure" to build in this settlement.</p>
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
               {#each groupedStructures as group}
                  <!-- Highest tier row -->
                  <tr class="structure-row">
                     <td class="name-cell">
                        <div class="name-content">
                           {#if group.lowerTiers.length > 0}
                              <button 
                                 class="expand-button"
                                 on:click={() => toggleCategory(group.category)}
                                 title="Show lower tiers"
                              >
                                 <i class="fas fa-chevron-{expandedCategories.has(group.category) ? 'down' : 'right'}"></i>
                              </button>
                           {:else}
                              <span class="no-expand-spacer"></span>
                           {/if}
                           <span class="structure-name">
                              {group.highestTier.name}
                              {#if getSkillsText(group.highestTier)}
                                 <span class="skills-badge">({getSkillsText(group.highestTier)})</span>
                              {/if}
                           </span>
                        </div>
                     </td>
                     <td class="tier-cell">
                        <span class="tier-label">
                           {group.highestTier.tier}
                        </span>
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
                        <button 
                           class="delete-button"
                           on:click={() => handleDeleteStructure(group.highestTier.id, group.highestTier.name)}
                           title="Remove structure"
                        >
                           <i class="fas fa-trash"></i>
                        </button>
                     </td>
                  </tr>
                  
                  <!-- Lower tiers (expandable) -->
                  {#if expandedCategories.has(group.category)}
                     {#each group.lowerTiers as structure}
                        <tr class="structure-row lower-tier">
                           <td class="name-cell">
                              <div class="name-content indented">
                                 <span class="no-expand-spacer"></span>
                                 <span class="structure-name">
                                    {structure.name}
                                    {#if getSkillsText(structure)}
                                       <span class="skills-badge">({getSkillsText(structure)})</span>
                                    {/if}
                                 </span>
                              </div>
                           </td>
                           <td class="tier-cell">
                              <span class="tier-label">
                                 {structure.tier}
                              </span>
                           </td>
                           <td class="condition-cell">
                              <select 
                                 class="condition-select"
                                 class:condition-good={getStructureCondition(structure.id) === StructureCondition.GOOD}
                                 class:condition-damaged={getStructureCondition(structure.id) === StructureCondition.DAMAGED}
                                 value={getStructureCondition(structure.id)}
                                 on:change={(e) => handleConditionChange(structure.id, e)}
                              >
                                 <option value={StructureCondition.GOOD}>-</option>
                                 <option value={StructureCondition.DAMAGED}>Damaged</option>
                              </select>
                           </td>
                           <td class="actions-cell">
                              <button 
                                 class="delete-button"
                                 on:click={() => handleDeleteStructure(structure.id, structure.name)}
                                 title="Remove structure"
                              >
                                 <i class="fas fa-trash"></i>
                              </button>
                           </td>
                        </tr>
                     {/each}
                  {/if}
               {/each}
         </tbody>
      </table>
   {/if}
</div>

<!-- Add Structure Dialog -->
<SettlementStructureDialog 
   bind:show={showAddDialog}
   {settlement}
   on:close={() => showAddDialog = false}
   on:structureAdded={() => {
      // Dialog handles closing, structures update automatically via store
   }}
/>

<style lang="scss">
   @use './settlements-shared.scss';
   
   .detail-section {
      margin-bottom: 1.5rem;
      
      .section-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: 1rem;
         
         h4 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 0;
            
            .structure-count {
               font-size: var(--font-md);
               font-weight: var(--font-weight-medium);
               color: var(--text-secondary);
            }
         }
         
         .add-structure-button {
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
            
            &:hover {
               background: rgba(255, 255, 255, 0.15);
               border-color: rgba(255, 255, 255, 0.3);
               transform: translateY(-1px);
            }
         }
      }
   }
   
   .empty-structures {
      @extend .empty-state;
   }
   
   .structures-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      overflow: hidden;
      
      thead {
         background: rgba(0, 0, 0, 0.1);
         
         th {
            padding: 0.75rem;
            text-align: left;
            font-weight: var(--font-weight-light);
            color: var(--text-secondary);
            font-size: var(--font-md);
            border-bottom: 1px solid var(--border-default);
            
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
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            &.lower-tier {
               background: rgba(0, 0, 0, 0.4);
            }
            
            td {
               padding: 0.75rem;
               color: var(--text-primary);
               font-size: var(--font-md);
               vertical-align: middle;
            }
               
            .name-cell {
               text-align: left;
               
               .name-content {
                     display: flex;
                     align-items: center;
                     gap: 0.5rem;
                     
                     &.indented {
                        padding-left: 0.75rem;
                     }
                     
                  .expand-button {
                     background: none;
                     border: none;
                     color: var(--text-secondary);
                     cursor: pointer;
                     padding: 0;
                     width: 1.25rem;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     transition: color 0.2s ease;
                     
                     &:hover {
                        color: var(--text-primary);
                     }
                  }
                  
                  .no-expand-spacer {
                     width: 1.25rem;
                     display: inline-block;
                  }
                  
                  .structure-name {
                     font-weight: var(--font-weight-semibold);
                     
                     .skills-badge {
                        font-weight: normal;
                        color: var(--text-tertiary);
                        font-size: var(--font-sm);
                        margin-left: 0.5rem;
                     }
                  }
               }
            }
            
            .tier-cell {
               text-align: center;
               
               .tier-label {
                  display: inline-block;
                  padding: 0.25rem 0.5rem;
                  background: rgba(0, 0, 0, 0.3);
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
                  padding: 0.25rem 0.5rem;
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
                     outline-offset: -1px;
                  }
                  
                  &:focus {
                     outline: none;
                  }
               }
            }
            
            .actions-cell {
               text-align: center;
               
               .delete-button {
                  background: transparent;
                  border: none;
                  color: #ff6b6b;
                  cursor: pointer;
                  padding: 0.5rem;
                  border-radius: var(--radius-sm);
                  transition: all 0.2s ease;
                  display: inline-block;
                  
                  &:hover {
                     background: rgba(255, 107, 107, 0.1);
                  }
               }
            }
         }
      }
   }
</style>
