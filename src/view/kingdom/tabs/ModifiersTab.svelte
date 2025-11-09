<script lang="ts">
   import { kingdomData } from '../../../stores/KingdomStore';
   import type { ActiveModifier } from '../../../models/Modifiers';
   import type { EventModifier, ResourceType } from '../../../types/events';
   import Button from '../components/baseComponents/Button.svelte';
   import InlineEditActions from '../components/baseComponents/InlineEditActions.svelte';
   
   // Filter state
   let filterSource = 'all'; // 'all', 'event', 'incident', 'structure', 'custom'
   
   // Create custom modifier state
   let isCreatingCustom = false;
   let newModifierName = '';
   let newModifierDescription = '';
   let newModifierEffects: EventModifier[] = [];
   let isCreating = false;
   
   // Edit custom modifier state - open modifier in create view
   let editingModifierId: string | null = null;
   
   // Add effect state (for custom modifiers)
   let addingEffectToModifier: string | null = null;
   let newEffectResource: ResourceType = 'gold';
   let newEffectValue: number = 0;
   let newEffectDuration: string = 'ongoing';
   
   // Resource options for dropdown
   const resourceOptions: ResourceType[] = [
      'gold', 'food', 'lumber', 'stone', 'ore', 'unrest', 'fame'
   ];
   
   const durationOptions = [
      { value: 'immediate', label: 'Immediate' },
      { value: 'ongoing', label: 'Ongoing (Permanent)' },
      { value: '1', label: '1 Turn' },
      { value: '3', label: '3 Turns' },
      { value: '5', label: '5 Turns' }
   ];
   
   // Format duration display
   function formatDuration(duration: string | number | undefined): string {
      if (!duration || duration === 'ongoing') return 'Ongoing';
      if (duration === 'immediate') return 'Immediate';
      if (duration === 'permanent') return 'Permanent';
      return `${duration} Turns`;
   }
   
   // Format effects for display
   function formatEffect(modifier: EventModifier): string {
      const sign = typeof modifier.value === 'number' && modifier.value > 0 ? '+' : '';
      const duration = modifier.duration ? ` (${formatDuration(modifier.duration)})` : '';
      return `${sign}${modifier.value} ${modifier.resource}${duration}`;
   }
   
   // Get icon for source type
   function getSourceIcon(sourceType: string): string {
      switch (sourceType) {
         case 'event': return 'fas fa-calendar-times';
         case 'incident': return 'fas fa-fire';
         case 'structure': return 'fas fa-building';
         case 'custom': return 'fas fa-edit';
         default: return 'fas fa-question-circle';
      }
   }
   
   // Get color class for source type
   function getSourceColor(sourceType: string): string {
      switch (sourceType) {
         case 'event': return 'source-event';
         case 'incident': return 'source-incident';
         case 'structure': return 'source-structure';
         case 'custom': return 'source-custom';
         default: return '';
      }
   }
   
   $: currentTurn = $kingdomData.currentTurn || 1;
   $: activeModifiers = ($kingdomData.activeModifiers || []) as ActiveModifier[];
   
   // Separate assigned and custom modifiers
   $: assignedModifiers = activeModifiers.filter(m => m.sourceType !== 'custom');
   $: customModifiers = activeModifiers.filter(m => m.sourceType === 'custom');
   
   // Apply filters
   $: filteredAssigned = filterSource === 'all' || filterSource === 'custom'
      ? assignedModifiers
      : assignedModifiers.filter(m => m.sourceType === filterSource);
   
   $: filteredCustom = filterSource === 'all' || filterSource === 'custom'
      ? customModifiers
      : [];
   
   // Statistics
   $: totalModifiers = activeModifiers.length;
   $: eventModifiers = activeModifiers.filter(m => m.sourceType === 'event').length;
   $: incidentModifiers = activeModifiers.filter(m => m.sourceType === 'incident').length;
   $: structureModifiers = activeModifiers.filter(m => m.sourceType === 'structure').length;
   $: customModifiersCount = customModifiers.length;
   
   // Create custom modifier functions
   function startCreating() {
      isCreatingCustom = true;
      newModifierName = '';
      newModifierDescription = '';
      newModifierEffects = [];
   }
   
   
   function addEffectToNew() {
      newModifierEffects = [
         ...newModifierEffects,
         {
            type: 'static',
            resource: newEffectResource,
            value: newEffectValue,
            duration: newEffectDuration === 'ongoing' ? 'ongoing' : 
                     newEffectDuration === 'immediate' ? 'immediate' :
                     parseInt(newEffectDuration)
         }
      ];
      
      // Reset form
      newEffectResource = 'gold';
      newEffectValue = 0;
      newEffectDuration = 'ongoing';
   }
   
   function removeEffectFromNew(index: number) {
      newModifierEffects = newModifierEffects.filter((_, i) => i !== index);
   }
   
   async function createOrUpdateCustomModifier() {
      if (!newModifierName.trim()) {
         // @ts-ignore
         ui.notifications?.warn('Modifier name is required');
         return;
      }
      
      if (newModifierEffects.length === 0) {
         // @ts-ignore
         ui.notifications?.warn('At least one effect is required');
         return;
      }
      
      isCreating = true;
      try {
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         if (editingModifierId) {
            // Update existing modifier
            await updateKingdom(k => {
               const modifier = k.activeModifiers?.find(m => m.id === editingModifierId);
               if (modifier) {
                  modifier.name = newModifierName.trim();
                  modifier.description = newModifierDescription.trim();
                  modifier.modifiers = newModifierEffects;
               }
            });
            // @ts-ignore
            ui.notifications?.info(`Updated modifier: ${newModifierName}`);
         } else {
            // Create new custom modifier
            const newModifier: ActiveModifier = {
               id: `custom-${Date.now()}`,
               name: newModifierName.trim(),
               description: newModifierDescription.trim(),
               icon: 'fas fa-edit',
               tier: 1,
               sourceType: 'custom',
               sourceId: 'custom',
               sourceName: 'Custom Modifier',
               startTurn: currentTurn,
               modifiers: newModifierEffects
            };
            
            await updateKingdom(k => {
               if (!k.activeModifiers) k.activeModifiers = [];
               k.activeModifiers.push(newModifier);
            });
            // @ts-ignore
            ui.notifications?.info(`Created custom modifier: ${newModifier.name}`);
         }
         
         cancelCreatingOrEditing();
      } catch (error) {
         logger.error('Failed to create/update custom modifier:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create/update custom modifier');
      } finally {
         isCreating = false;
      }
   }
   
   // Edit modifier - open in create view
   function openModifierInCreateView(modifier: ActiveModifier) {
      // Populate the create form with the modifier's data
      isCreatingCustom = true;
      editingModifierId = modifier.id;
      newModifierName = modifier.name;
      newModifierDescription = modifier.description;
      newModifierEffects = [...modifier.modifiers];
      
      // Scroll to top to show the create form
      const container = document.querySelector('.modifiers-tab');
      if (container) {
         container.scrollTop = 0;
      }
   }
   
   function cancelCreatingOrEditing() {
      isCreatingCustom = false;
      editingModifierId = null;
      newModifierName = '';
      newModifierDescription = '';
      newModifierEffects = [];
   }
   
   // Delete custom modifier
   async function deleteCustomModifier(modifierId: string) {
      const modifier = customModifiers.find(m => m.id === modifierId);
      if (!modifier) return;
      
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Delete Custom Modifier',
         content: `<p>Are you sure you want to delete <strong>${modifier.name}</strong>?</p><p>This action cannot be undone.</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         await updateKingdom(k => {
            if (k.activeModifiers) {
               k.activeModifiers = k.activeModifiers.filter(m => m.id !== modifierId);
            }
         });
         
         // @ts-ignore
         ui.notifications?.info(`Deleted ${modifier.name}`);
      } catch (error) {
         logger.error('Failed to delete custom modifier:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to delete modifier');
      }
   }
   
   // Add effect to existing custom modifier
   function startAddingEffect(modifierId: string) {
      addingEffectToModifier = modifierId;
      newEffectResource = 'gold';
      newEffectValue = 0;
      newEffectDuration = 'ongoing';
   }
   
   function cancelAddingEffect() {
      addingEffectToModifier = null;
   }
   
   async function saveNewEffect(modifierId: string) {
      try {
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         await updateKingdom(k => {
            const modifier = k.activeModifiers?.find(m => m.id === modifierId);
            if (modifier) {
               if (!modifier.modifiers) modifier.modifiers = [];
               modifier.modifiers.push({
                  type: 'static',
                  resource: newEffectResource,
                  value: newEffectValue,
                  duration: newEffectDuration === 'ongoing' ? 'ongoing' : 
                           newEffectDuration === 'immediate' ? 'immediate' :
                           parseInt(newEffectDuration)
               });
            }
         });
         
         cancelAddingEffect();
         // @ts-ignore
         ui.notifications?.info('Effect added');
      } catch (error) {
         logger.error('Failed to add effect:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to add effect');
      }
   }
   
   // Remove effect from custom modifier
   async function removeEffect(modifierId: string, effectIndex: number) {
      try {
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         await updateKingdom(k => {
            const modifier = k.activeModifiers?.find(m => m.id === modifierId);
            if (modifier && modifier.modifiers) {
               modifier.modifiers = modifier.modifiers.filter((_, i) => i !== effectIndex);
            }
         });
      } catch (error) {
         logger.error('Failed to remove effect:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to remove effect');
      }
   }
</script>

<div class="modifiers-tab">
   <!-- Summary Stats -->
   <div class="modifiers-summary">
      <div class="summary-card">
         <i class="fas fa-wand-magic-sparkles"></i>
         <div>
            <div class="summary-value">{totalModifiers}</div>
            <div class="summary-label">Total</div>
         </div>
      </div>
      <div class="summary-card assigned">
         <i class="fas fa-calendar-times"></i>
         <div>
            <div class="summary-value">{eventModifiers}</div>
            <div class="summary-label">Events</div>
         </div>
      </div>
      <div class="summary-card assigned">
         <i class="fas fa-fire"></i>
         <div>
            <div class="summary-value">{incidentModifiers}</div>
            <div class="summary-label">Incidents</div>
         </div>
      </div>
      <div class="summary-card assigned">
         <i class="fas fa-building"></i>
         <div>
            <div class="summary-value">{structureModifiers}</div>
            <div class="summary-label">Structures</div>
         </div>
      </div>
      <div class="summary-card custom">
         <i class="fas fa-edit"></i>
         <div>
            <div class="summary-value">{customModifiersCount}</div>
            <div class="summary-label">Custom</div>
         </div>
      </div>
      <Button 
         variant="primary" 
         icon="fas fa-plus" 
         iconPosition="left"
         disabled={isCreatingCustom}
         on:click={startCreating}
      >
         Create Modifier
      </Button>
   </div>
   
   <!-- Filters -->
   <div class="table-controls">
      <select bind:value={filterSource} class="filter-select">
         <option value="all">All Modifiers</option>
         <option value="event">Events Only</option>
         <option value="incident">Incidents Only</option>
         <option value="structure">Structures Only</option>
         <option value="custom">Custom Only</option>
      </select>
   </div>
   
   <!-- Custom Modifiers Table -->
   <div class="section">
      <h3 class="section-title">
         <i class="fas fa-edit"></i>
         Custom Modifiers
      </h3>
      
      <div class="modifiers-table-container">
         <table class="modifiers-table">
            <thead>
               <tr>
                  <th>Name</th>
                  <th>Effects</th>
                  <th>Duration</th>
                  <th>Actions</th>
               </tr>
            </thead>
            <tbody>
               <!-- Create Row -->
               {#if isCreatingCustom}
                  <tr class="create-row">
                     <td colspan="4">
                        <div class="create-modifier-form">
                           <div class="form-row">
                              <div class="form-field">
                                 <label>Name</label>
                                 <input 
                                    type="text" 
                                    bind:value={newModifierName}
                                    placeholder="Modifier name"
                                    class="inline-input"
                                    disabled={isCreating}
                                 />
                              </div>
                              <div class="form-field">
                                 <label>Description</label>
                                 <input 
                                    type="text" 
                                    bind:value={newModifierDescription}
                                    placeholder="Brief description"
                                    class="inline-input"
                                    disabled={isCreating}
                                 />
                              </div>
                           </div>
                           
                           <div class="effects-section">
                              <div class="effects-header">
                                 <label>Effects</label>
                              </div>
                              
                              <div class="effects-row-builder">
                                 {#if newModifierEffects.length > 0}
                                    {#each newModifierEffects as effect, index}
                                       <div class="effect-item">
                                          <span class="effect-resource">{effect.resource}:</span>
                                          <span class="effect-value">{typeof effect.value === 'number' && effect.value > 0 ? '+' : ''}{effect.value}</span>
                                          <span class="effect-duration">({formatDuration(effect.duration)})</span>
                                          <button 
                                             class="remove-effect-btn"
                                             on:click={() => removeEffectFromNew(index)}
                                             disabled={isCreating}
                                             title="Remove effect"
                                          >
                                             <i class="fas fa-times"></i>
                                          </button>
                                       </div>
                                    {/each}
                                 {/if}
                                 
                                 <div class="add-effect-inline-builder">
                                    <select bind:value={newEffectResource} class="effect-select" disabled={isCreating}>
                                       {#each resourceOptions as resource}
                                          <option value={resource}>{resource}</option>
                                       {/each}
                                    </select>
                                    <input 
                                       type="number" 
                                       bind:value={newEffectValue}
                                       placeholder="Value"
                                       class="effect-input"
                                       disabled={isCreating}
                                    />
                                    <select bind:value={newEffectDuration} class="effect-select" disabled={isCreating}>
                                       {#each durationOptions as option}
                                          <option value={option.value}>{option.label}</option>
                                       {/each}
                                    </select>
                                    <button 
                                       class="add-effect-btn" 
                                       on:click={addEffectToNew}
                                       disabled={isCreating}
                                       title="Add effect"
                                    >
                                       <i class="fas fa-plus"></i>
                                    </button>
                                 </div>
                              </div>
                           </div>
                           
                           <div class="form-actions">
                              <InlineEditActions
                                 onSave={createOrUpdateCustomModifier}
                                 onCancel={cancelCreatingOrEditing}
                                 disabled={isCreating}
                                 saveTitle={editingModifierId ? "Update" : "Create"}
                                 cancelTitle="Cancel"
                              />
                           </div>
                        </div>
                     </td>
                  </tr>
               {/if}
               
               <!-- Data Rows -->
               {#if filteredCustom.length > 0}
                  {#each filteredCustom as modifier}
                     <tr>
                        <!-- Name Column -->
                        <td>
                           <button
                              class="modifier-name-clickable" 
                              on:click={() => openModifierInCreateView(modifier)}
                              title="Click to edit"
                           >
                              {modifier.name}
                           </button>
                        </td>
                        
                        <!-- Effects Column -->
                        <td>
                           <div class="effects-tags">
                              {#if modifier.modifiers && modifier.modifiers.length > 0}
                                 {#each modifier.modifiers as effect}
                                    <span class="effect-tag">
                                       {effect.resource}: {typeof effect.value === 'number' && effect.value > 0 ? '+' : ''}{effect.value}
                                    </span>
                                 {/each}
                              {:else}
                                 <span class="no-effects">No effects</span>
                              {/if}
                           </div>
                        </td>
                        
                        <!-- Duration Column -->
                        <td>
                           {#if modifier.modifiers && modifier.modifiers[0]?.duration}
                              <span class="modifier-duration">{formatDuration(modifier.modifiers[0].duration)}</span>
                           {:else}
                              <span class="no-effects">—</span>
                           {/if}
                        </td>
                        
                        <!-- Actions Column -->
                        <td>
                           <button 
                              class="delete-btn" 
                              on:click={() => deleteCustomModifier(modifier.id)}
                              title="Delete modifier"
                           >
                              <i class="fas fa-trash"></i>
                           </button>
                        </td>
                     </tr>
                  {/each}
               {:else if !isCreatingCustom}
                  <tr>
                     <td colspan="4" class="empty-state">
                        <i class="fas fa-edit"></i>
                        <p>No custom modifiers</p>
                        <p class="hint">Click "Create Modifier" to add custom effects</p>
                     </td>
                  </tr>
               {/if}
            </tbody>
         </table>
      </div>
   </div>
   
   <!-- Assigned Modifiers Table -->
   <div class="section">
      <h3 class="section-title">
         <i class="fas fa-list"></i>
         Assigned Modifiers
      </h3>
      
      <div class="modifiers-table-container">
         <table class="modifiers-table">
            <thead>
               <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Effects</th>
                  <th>Duration</th>
                  <th>Started</th>
               </tr>
            </thead>
            <tbody>
               {#if filteredAssigned.length > 0}
                  {#each filteredAssigned as modifier}
                     <tr>
                        <td>
                           <div class="modifier-name">
                              {#if modifier.icon}
                                 <i class="{modifier.icon}"></i>
                              {/if}
                              <span class="name">{modifier.name}</span>
                           </div>
                        </td>
                        <td>
                           <div class="source-badge {getSourceColor(modifier.sourceType)}">
                              <i class="{getSourceIcon(modifier.sourceType)}"></i>
                              {modifier.sourceName}
                           </div>
                        </td>
                        <td>
                           <div class="effects-tags">
                              {#if modifier.modifiers && modifier.modifiers.length > 0}
                                 {#each modifier.modifiers as effect}
                                    <span class="effect-tag">
                                       {effect.resource}: {typeof effect.value === 'number' && effect.value > 0 ? '+' : ''}{effect.value}
                                    </span>
                                 {/each}
                              {:else}
                                 <span class="no-effects">No effects</span>
                              {/if}
                           </div>
                        </td>
                        <td>
                           {#if modifier.modifiers && modifier.modifiers[0]?.duration}
                              <span class="modifier-duration">{formatDuration(modifier.modifiers[0].duration)}</span>
                           {:else}
                              <span class="no-effects">—</span>
                           {/if}
                        </td>
                        <td>
                           <span class="turn-info">Turn {modifier.startTurn}</span>
                        </td>
                     </tr>
                  {/each}
               {:else}
                  <tr>
                     <td colspan="5" class="empty-state">
                        <i class="fas fa-info-circle"></i>
                        <p>No assigned modifiers</p>
                        <p class="hint">Modifiers are gained from events, incidents, and structures</p>
                     </td>
                  </tr>
               {/if}
            </tbody>
         </table>
      </div>
   </div>
</div>

<style lang="scss">
   .modifiers-tab {
      display: flex;
      flex-direction: column;
      gap: var(--space-24);
      height: 100%;
      padding: var(--space-16);
      overflow-y: auto;
   }
   
   .modifiers-summary {
      display: flex;
      gap: var(--space-16);
      flex-wrap: wrap;
      align-items: center;
      
      .summary-card {
         display: flex;
         align-items: center;
         gap: var(--space-12);
         background: rgba(0, 0, 0, 0.2);
         padding: var(--space-12) var(--space-16);
         border-radius: var(--radius-lg);
         border: 1px solid var(--border-subtle);
         
         i {
            font-size: var(--font-2xl);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-value {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: var(--font-size-medium, 0.875rem);
            color: var(--text-medium-light, #9e9b8f);
         }
         
         &.assigned .summary-label {
            color: #ffa500;
         }
         
         &.custom .summary-label {
            color: #95e1d3;
         }
      }
      
      :global(button) {
         margin-left: auto;
      }
   }
   
   .table-controls {
      display: flex;
      gap: var(--space-16);
      
      .filter-select {
         padding: var(--space-8) var(--space-12);
         min-height: 2.5rem;
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         line-height: 1.5;
         vertical-align: middle;
         box-sizing: border-box;
         
         &:focus {
            outline: none;
            border-color: var(--color-primary, #5e0000);
         }
      }
   }
   
   .section {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
      .section-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
      }
      
      .section-title {
         font-size: var(--font-size-large, 1.25rem);
         font-weight: var(--font-weight-bold);
         color: var(--color-text-dark-primary, #b5b3a4);
         display: flex;
         align-items: center;
         gap: var(--space-8);
         margin: 0;
         
         i {
            color: var(--color-text-dark-primary, #b5b3a4);
         }
      }
   }
   
   .modifiers-table-container {
      overflow: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
   }
   
   .modifiers-table {
      width: 100%;
      border-collapse: collapse;
      
      thead {
         background: rgba(0, 0, 0, 0.3);
         position: sticky;
         top: 0;
         z-index: 1;
         
         th {
            padding: var(--space-12) var(--space-16);
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-dark-primary, #b5b3a4);
            border-bottom: 1px solid var(--border-subtle);
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid var(--border-faint);
            
            &:hover:not(.create-row) {
               background: rgba(255, 255, 255, 0.05);
            }
            
            &.create-row {
               background: rgba(94, 0, 0, 0.1);
            }
         }
         
         td {
            padding: var(--space-12) var(--space-16);
            color: var(--color-text-dark-primary, #b5b3a4);
            font-size: var(--font-size-medium, 0.875rem);
            
            &.empty-state {
               padding: var(--space-24);
               text-align: center;
               color: var(--color-text-dark-secondary, #7a7971);
               
               i {
                  font-size: var(--font-4xl);
                  margin-bottom: var(--space-16);
                  opacity: 0.5;
                  display: block;
               }
               
               p {
                  margin: var(--space-8) 0;
                  
                  &.hint {
                     font-size: var(--font-sm);
                     font-style: italic;
                  }
               }
            }
         }
      }
   }
   
   .modifier-name {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      i {
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      .name {
         font-weight: var(--font-weight-semibold);
         font-size: var(--font-size-large, 1.125rem);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .source-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-4) var(--space-12);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      background: rgba(0, 0, 0, 0.3);
      
      &.source-event {
         color: #ffa500;
      }
      
      &.source-incident {
         color: #ff6b6b;
      }
      
      &.source-structure {
         color: #4ecdc4;
      }
      
      &.source-custom {
         color: #95e1d3;
      }
   }
   
   .effects-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .effects-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-8);
   }
   
   .effect-tag {
      display: inline-flex;
      align-items: center;
      padding: var(--space-4) var(--space-12);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      font-size: var(--font-size-medium, 0.875rem);
      color: var(--color-text-dark-primary, #b5b3a4);
      font-weight: var(--font-weight-semibold);
   }
   
   .modifier-duration {
      display: inline-block;
      font-size: var(--font-size-medium, 0.875rem);
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
   }
   
   .remove-effect-btn {
      background: none;
      border: none;
      color: #ff6b6b;
      cursor: pointer;
      padding: 0;
      margin-left: var(--space-4);
      display: flex;
      align-items: center;
      
      &:hover {
         color: #ff4444;
      }
   }
   
   .effects-row-builder {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      flex-wrap: wrap;
      padding: var(--space-8);
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
   }
   
   .effect-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-6) var(--space-12);
      background: rgba(200, 200, 200, 0.12);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-medium, 0.875rem);
      color: var(--color-text-dark-primary, #b5b3a4);
      white-space: nowrap;
      
      .effect-resource {
         font-weight: var(--font-weight-semibold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      .effect-value {
         font-weight: var(--font-weight-bold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      .effect-duration {
         font-size: var(--font-xs);
         color: var(--color-text-dark-secondary, #7a7971);
         font-style: italic;
      }
      
      .remove-effect-btn {
         background: none;
         border: none;
         color: #ff6b6b;
         cursor: pointer;
         padding: 0;
         margin-left: var(--space-4);
         display: flex;
         align-items: center;
         font-size: var(--font-xs);
         transition: color 0.2s;
         
         &:hover:not(:disabled) {
            color: #ff4444;
         }
         
         &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
         }
      }
   }
   
   .add-effect-inline-builder {
      display: flex;
      align-items: center;
      gap: var(--space-8);
   }
   
   .no-effects {
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
      font-size: var(--font-sm);
   }
   
   .turn-info {
      font-size: var(--font-sm);
      color: var(--color-text-dark-secondary, #7a7971);
   }
   
   .modifier-name-clickable {
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      text-align: left;
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-large, 1.125rem);
      transition: all 0.2s;
      border-radius: var(--radius-md);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .description-text {
      color: var(--color-text-dark-secondary, #7a7971);
      font-size: var(--font-size-medium, 0.875rem);
   }
   
   .inline-edit {
      display: flex;
      gap: var(--space-8);
      align-items: center;
   }
   
   .inline-input {
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--color-primary, #5e0000);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 9.375rem;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .delete-btn,
   .add-effect-icon-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .delete-btn {
      background: transparent;
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.1);
      }
   }
   
   .add-effect-icon-btn {
      background: transparent;
      color: var(--color-primary, #5e0000);
      
      &:hover:not(:disabled) {
         background: rgba(94, 0, 0, 0.1);
      }
   }
   
   // Create modifier form styles
   .create-modifier-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      padding: var(--space-16);
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-lg);
   }
   
   .form-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: var(--space-16);
   }
   
   .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
      label {
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .effects-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .effects-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
      label {
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .effect-select {
      padding: var(--space-8) var(--space-12);
      min-height: 2.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      line-height: 1.5;
      vertical-align: middle;
      box-sizing: border-box;
      
      &:focus {
         outline: none;
         border-color: var(--color-primary, #5e0000);
      }
      
      &:disabled {
         opacity: 0.5;
      }
   }
   
   .effect-input {
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      width: 6.25rem;
      
      &:focus {
         outline: none;
         border-color: var(--color-primary, #5e0000);
      }
      
      &:disabled {
         opacity: 0.5;
      }
   }
   
   .add-effect-btn {
      padding: var(--space-4) var(--space-12);
      background: rgba(94, 0, 0, 0.2);
      border: 1px solid rgba(94, 0, 0, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &:hover:not(:disabled) {
         background: rgba(94, 0, 0, 0.3);
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .form-actions {
      display: flex;
      justify-content: flex-end;
   }
</style>
