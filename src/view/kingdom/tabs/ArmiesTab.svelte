<script lang="ts">
   import { kingdomData, ledArmies } from '../../../stores/KingdomStore';
   import type { Army } from '../../../models/Army';
   import { SettlementTierConfig, type SettlementTier } from '../../../models/Settlement';
   import Button from '../components/baseComponents/Button.svelte';
   import InlineEditActions from '../components/baseComponents/InlineEditActions.svelte';
   import DisbandArmyDialog from '../components/DisbandArmyDialog.svelte';
   import RecruitArmyDialog from '../components/RecruitArmyDialog.svelte';
   import { logger } from '../../../utils/Logger';
   import { EQUIPMENT_ICONS } from '../../../utils/presentation';

   // Table state
   let searchTerm = '';
   let filterSupport = 'all'; // 'all', 'supported', 'unsupported'
   let currentPage = 1;
   const itemsPerPage = 25;
   
   // Inline editing state
   let editingArmyId: string | null = null;
   let editingField: 'level' | 'settlement' | null = null;
   let editedValue: string | number = '';
   let editedSettlementId: string = '';
   let isSaving = false;
   
   // Create army dialog state
   let showRecruitDialog = false;
   let isCreatingArmy = false;
   
   // Actor linking state
   let linkingArmyId: string | null = null;
   let actorSearchTerm: string = '';
   let searchInputRef: HTMLInputElement | null = null;
   
   // Disband army dialog state
   let showDisbandDialog = false;
   let disbandingArmyId: string | null = null;
   let disbandingArmy: Army | null = null;
   
   // Get current user's character level for validation
   $: userCharacterLevel = (() => {
      const game = (globalThis as any).game;
      
      if (!game?.user?.character) {
         // No assigned character - default to level 1, user can edit
         return 1;
      }
      
      const character = game.user.character;
      const level = character.level;
      
      if (typeof level !== 'number' || level < 1) {
         return 1;
      }
      
      return level;
   })();
   
   // Apply filters
   $: filteredArmies = (() => {
      let armies = [...$ledArmies];
      
      // Search filter
      if (searchTerm) {
         const term = searchTerm.toLowerCase();
         armies = armies.filter(a => 
            a.name.toLowerCase().includes(term) ||
            `level ${a.level}`.includes(term)
         );
      }
      
      // Support filter
      if (filterSupport === 'supported') {
         armies = armies.filter(a => a.isSupported);
      } else if (filterSupport === 'unsupported') {
         armies = armies.filter(a => !a.isSupported);
      }
      
      return armies;
   })();
   
   // Pagination
   $: totalPages = Math.ceil(filteredArmies.length / itemsPerPage);
   $: paginatedArmies = filteredArmies.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
   );
   
   // Reset to page 1 when filters change
   $: if (searchTerm || filterSupport) {
      currentPage = 1;
   }
   
   // Calculate army statistics
   $: totalArmies = $ledArmies.length;
   $: supportedArmies = $ledArmies.filter(a => a.isSupported).length;
   $: unsupportedArmies = totalArmies - supportedArmies;
   
   // Helper functions
   function getSupportStatusIcon(army: Army): string {
      return army.isSupported ? 'fa-check-circle' : 'fa-exclamation-triangle';
   }
   
   function getSupportStatusColor(army: Army): string {
      return army.isSupported ? 'status-supported' : 'status-unsupported';
   }
   
   function getSupportStatusText(army: Army): string {
      if (!army.supportedBySettlementId) {
         return army.turnsUnsupported > 0 
            ? `Unsupported (${army.turnsUnsupported} turns)`
            : 'Unsupported';
      }
      
      const settlement = $kingdomData.settlements.find(
         s => s.id === army.supportedBySettlementId
      );
      
      if (!settlement) {
         return 'Unsupported (settlement lost)';
      }
      
      const capacity = SettlementTierConfig[settlement.tier].armySupport;
      const current = settlement.supportedUnits.length;
      
      return `${settlement.name} (${settlement.tier} ${current}/${capacity})`;
   }
   
   // Get settlements with available capacity (or currently supporting this army)
   function getAvailableSettlements(armyId: string) {
      return $kingdomData.settlements.filter(s => {
         const capacity = SettlementTierConfig[s.tier].armySupport;
         const current = s.supportedUnits.length;
         
         // Either has space OR is currently supporting this army
         return current < capacity || s.supportedUnits.includes(armyId);
      });
   }
   
   // Get capacity text for settlement in dropdown
   function getSettlementCapacityText(settlement: any, armyId: string): string {
      const capacity = SettlementTierConfig[settlement.tier as SettlementTier].armySupport;
      const current = settlement.supportedUnits.filter((id: string) => id !== armyId).length;
      
      if (current >= capacity) {
         return 'Full';
      }
      return `${current + 1}/${capacity}`;
   }
   
   // Actor linking functions
   function startLinking(armyId: string) {
      linkingArmyId = armyId;
      actorSearchTerm = '';
      setTimeout(() => {
         searchInputRef?.focus();
      }, 10);
   }
   
   function cancelLinking() {
      linkingArmyId = null;
      actorSearchTerm = '';
   }
   
   async function linkActor(armyId: string, actorId: string) {
      if (armyId === 'new') {
         // Linking to new army - create army from actor
         const actor = (globalThis as any).game?.actors?.get(actorId);
         if (!actor) return;
         
         try {
            const { armyService } = await import('../../../services/army');
            // Create army with actor's name and user's character level
            await armyService.createArmy(actor.name, userCharacterLevel);
            
            // Find the newly created army and link it
            const newArmy = $kingdomData.armies.find(a => a.name === actor.name && !a.actorId);
            if (newArmy) {
               await armyService.linkExistingActor(newArmy.id, actorId);
            }
            
            cancelLinking();
            // @ts-ignore
            ui.notifications?.info(`Created army and linked to ${actor.name}`);
         } catch (error) {
            logger.error('Failed to create army and link actor:', error);
            // @ts-ignore
            ui.notifications?.error(error instanceof Error ? error.message : 'Failed to create army');
         }
      } else {
         // Linking to existing army
         try {
            const { armyService } = await import('../../../services/army');
            await armyService.linkExistingActor(armyId, actorId);
            cancelLinking();
            // @ts-ignore
            ui.notifications?.info('Actor linked successfully');
         } catch (error) {
            logger.error('Failed to link actor:', error);
            // @ts-ignore
            ui.notifications?.error(error instanceof Error ? error.message : 'Failed to link actor');
         }
      }
   }
   
   async function unlinkActor(armyId: string) {
      try {
         const { armyService } = await import('../../../services/army');
         await armyService.unlinkActor(armyId);
         // @ts-ignore
         ui.notifications?.info('Actor unlinked successfully');
      } catch (error) {
         logger.error('Failed to unlink actor:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to unlink actor');
      }
   }
   
   async function createActorForArmy(armyId: string) {
      const army = $kingdomData.armies.find(a => a.id === armyId);
      if (!army) return;
      
      try {
         // @ts-ignore - Foundry VTT API
         const actor = await Actor.create({
            name: army.name,
            type: 'npc',
            folder: null
         });
         
         if (actor) {
            const { armyService } = await import('../../../services/army');
            await armyService.linkExistingActor(armyId, actor.id);
            // @ts-ignore
            ui.notifications?.info(`Created and linked actor: ${army.name}`);
         }
      } catch (error) {
         logger.error('Failed to create actor:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create actor');
      }
   }
   
   function getActorName(actorId: string): string {
      // @ts-ignore - Foundry VTT API
      const actor = (globalThis as any).game?.actors?.get(actorId);
      return actor?.name || 'Unknown Actor';
   }
   
   // Filter actors - Include NPCs and characters, exclude system actors
   $: filteredActors = (() => {
      if (!linkingArmyId) return [];
      
      const game = (globalThis as any).game;
      // Include 'npc' and 'character' types, exclude 'loot', 'hazard', 'vehicle', etc.
      const allActors = game?.actors?.filter((a: any) => 
         a.type === 'npc' || a.type === 'character'
      ) || [];
      
      if (!actorSearchTerm.trim()) {
         return allActors;
      }
      
      const searchLower = actorSearchTerm.toLowerCase();
      return allActors.filter((a: any) => a.name.toLowerCase().includes(searchLower));
   })();
   
   // Group actors by type
   $: groupedActors = (() => {
      const characters: any[] = filteredActors.filter((a: any) => a.type === 'character');
      const npcs: any[] = filteredActors.filter((a: any) => a.type === 'npc');
      return { characters, npcs };
   })();
   
   // Inline editing functions
   function startEdit(army: Army, field: 'level') {
      editingArmyId = army.id;
      editingField = field;
      editedValue = army[field];
   }
   
   function startEditingSettlement(army: Army) {
      editingArmyId = army.id;
      editingField = 'settlement';
      editedSettlementId = army.supportedBySettlementId || '';
   }
   
   function cancelEdit() {
      editingArmyId = null;
      editingField = null;
      editedValue = '';
   }
   
   async function saveEdit(armyId: string) {
      if (!editedValue && editingField !== 'settlement') return;
      
      isSaving = true;
      try {
         const { armyService } = await import('../../../services/army');
         
         if (editingField === 'level') {
            // Update level
            await armyService.updateArmyLevel(armyId, Number(editedValue));
         } else if (editingField === 'settlement') {
            // Update settlement assignment
            await armyService.assignArmyToSettlement(
               armyId,
               editedSettlementId || null
            );
            // @ts-ignore
            ui.notifications?.info('Army support assignment updated');
         }
         
         cancelEdit();
      } catch (error) {
         logger.error('Failed to save edit:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to save changes');
      } finally {
         isSaving = false;
      }
   }
   
   function handleKeydown(event: KeyboardEvent, armyId: string) {
      if (event.key === 'Enter') {
         saveEdit(armyId);
      } else if (event.key === 'Escape') {
         cancelEdit();
      }
   }
   
   // Create army functions
   function startCreating() {
      showRecruitDialog = true;
   }
   
   async function handleRecruitConfirm(event: CustomEvent<{ name: string; settlementId: string | null; armyType: string }>) {
      const { name, settlementId, armyType } = event.detail;
      
      isCreatingArmy = true;
      try {
         const { armyService } = await import('../../../services/army');
         const { ARMY_TYPES } = await import('../../../utils/armyHelpers');
         
         // Create army with selected type and image
         const army = await armyService.createArmy(name, userCharacterLevel, {
            type: armyType,
            image: ARMY_TYPES[armyType as keyof typeof ARMY_TYPES].image
         });
         
         // Assign to selected settlement if provided
         if (settlementId) {
            await armyService.assignArmyToSettlement(army.id, settlementId);
         }
         
         // Place token on map
         if (army.actorId) {
            const game = (globalThis as any).game;
            const scene = game?.scenes?.current;
            
            logger.info(`🗺️ [ArmiesTab] Attempting token placement for ${name} (actorId: ${army.actorId})`);
            
            if (!scene) {
               logger.warn('⚠️ [ArmiesTab] No active scene found, cannot place token');
            } else {
               try {
                  let targetSettlement = null;
                  
                  if (settlementId) {
                     // Supported: place at supporting settlement
                     targetSettlement = $kingdomData.settlements.find(s => s.id === settlementId);
                     logger.info(`🗺️ [ArmiesTab] Placing at supporting settlement: ${targetSettlement?.name}`);
                  } else {
                     // Unsupported: place at capital, or first settlement if no capital
                     targetSettlement = $kingdomData.settlements.find(s => s.isCapital);
                     if (!targetSettlement && $kingdomData.settlements.length > 0) {
                        targetSettlement = $kingdomData.settlements[0];
                        logger.info(`🗺️ [ArmiesTab] No capital defined, placing at first settlement: ${targetSettlement?.name}`);
                     } else {
                        logger.info(`🗺️ [ArmiesTab] No settlement selected, placing at capital: ${targetSettlement?.name}`);
                     }
                  }
                  
                  if (!targetSettlement) {
                     logger.warn('⚠️ [ArmiesTab] No target settlement found for token placement');
                  } else if (!targetSettlement.location) {
                     logger.warn('⚠️ [ArmiesTab] Target settlement has no location data');
                  } else {
                     const hasLocation = targetSettlement.location.x !== 0 || targetSettlement.location.y !== 0;
                     
                     if (!hasLocation) {
                        logger.warn(`⚠️ [ArmiesTab] Settlement ${targetSettlement.name} has invalid location (0,0)`);
                     } else {
                        // Use shared helper for token placement
                        const { placeArmyTokenAtSettlement } = await import('../../../utils/armyHelpers');
                        await placeArmyTokenAtSettlement(armyService, army.actorId, targetSettlement, name);
                     }
                  }
               } catch (error) {
                  logger.error('❌ [ArmiesTab] Failed to place token:', error);
                  // Don't fail the whole action if token placement fails
               }
            }
         } else {
            logger.warn(`⚠️ [ArmiesTab] Army ${name} has no actorId, cannot place token`);
         }
         
         // @ts-ignore
         ui.notifications?.info(`Recruited ${name}!`);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Failed to recruit army';
         // @ts-ignore
         ui.notifications?.error(errorMessage);
      } finally {
         isCreatingArmy = false;
      }
   }
   
   function handleRecruitCancel() {
      // Dialog handles its own state
   }
   
   // Open NPC actor sheet or offer to recreate if missing
   async function openActorSheet(army: Army) {
      const game = (globalThis as any).game;
      
      // Check if actor exists
      if (army.actorId) {
         const actor = game?.actors?.get(army.actorId);
         
         if (actor) {
            // Actor exists - open it
            actor.sheet.render(true);
            return;
         }
      }
      
      // Actor missing or not linked - offer to create/recreate
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Missing NPC Actor',
         content: army.actorId 
            ? `<p>The NPC actor for <strong>${army.name}</strong> was not found (may have been deleted).</p><p>Would you like to create a new NPC actor?</p>`
            : `<p><strong>${army.name}</strong> has no linked NPC actor.</p><p>Would you like to create one?</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         const { armyService } = await import('../../../services/army');
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         // Create new NPC actor
         const newActorId = await armyService.createNPCActor(army.name, army.level);
         
         // Update army with new actor ID
         await updateKingdom(k => {
            const armyToUpdate = k.armies.find(a => a.id === army.id);
            if (armyToUpdate) {
               armyToUpdate.actorId = newActorId;
            }
         });
         
         // Open the newly created actor
         const newActor = game?.actors?.get(newActorId);
         if (newActor) {
            newActor.sheet.render(true);
            // @ts-ignore
            ui.notifications?.info(`Created new NPC actor for ${army.name}`);
         }
      } catch (error) {
         logger.error('Failed to create NPC actor:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create NPC actor');
      }
   }
   
   // Delete army
   function deleteArmy(armyId: string) {
      const army = $kingdomData.armies.find(a => a.id === armyId);
      if (!army) return;
      
      disbandingArmyId = armyId;
      disbandingArmy = army;
      showDisbandDialog = true;
   }
   
   async function handleDisbandConfirm(event: CustomEvent<{ deleteActor: boolean }>) {
      if (!disbandingArmyId) return;
      
      const { deleteActor } = event.detail;
      const armyName = disbandingArmy?.name || 'Army';
      
      try {
         const { armyService } = await import('../../../services/army');
         const result = await armyService.disbandArmy(disbandingArmyId, deleteActor);
         
         // For players, result may be undefined (fire-and-forget)
         // The operation still succeeds on GM side and syncs back
         if (result) {
            // @ts-ignore
            ui.notifications?.info(`Disbanded ${result.armyName}`);
         } else {
            // @ts-ignore
            ui.notifications?.info(`${armyName} disbanded successfully`);
         }
      } catch (error) {
         // Error message already shown by ActionDispatcher or lower-level service
         // Just show user-friendly notification
         const errorMessage = error instanceof Error ? error.message : 'Failed to disband army';
         // @ts-ignore
         ui.notifications?.error(errorMessage);
      } finally {
         disbandingArmyId = null;
         disbandingArmy = null;
      }
   }
   
   function handleDisbandCancel() {
      disbandingArmyId = null;
      disbandingArmy = null;
   }
   
   // Pagination
   function nextPage() {
      if (currentPage < totalPages) {
         currentPage++;
      }
   }
   
   function prevPage() {
      if (currentPage > 1) {
         currentPage--;
      }
   }
   
   function goToPage(page: number) {
      currentPage = Math.max(1, Math.min(page, totalPages));
   }
</script>

<!-- Recruit Army Dialog -->
<RecruitArmyDialog
   bind:show={showRecruitDialog}
   on:confirm={handleRecruitConfirm}
   on:cancel={handleRecruitCancel}
/>

<!-- Disband Army Dialog -->
{#if disbandingArmy}
   <DisbandArmyDialog
      bind:show={showDisbandDialog}
      armyName={disbandingArmy.name}
      armyLevel={disbandingArmy.level}
      hasLinkedActor={!!disbandingArmy.actorId}
      isSupported={disbandingArmy.isSupported}
      supportedBySettlement={disbandingArmy.supportedBySettlementId 
         ? $kingdomData.settlements.find(s => s.id === disbandingArmy?.supportedBySettlementId)?.name || ''
         : ''}
      on:confirm={handleDisbandConfirm}
      on:cancel={handleDisbandCancel}
   />
{/if}

<div class="armies-tab">
   <!-- Summary Stats -->
   <div class="armies-summary">
      <div class="summary-card">
         <i class="fas fa-shield-alt"></i>
         <div>
            <div class="summary-value">{totalArmies}</div>
            <div class="summary-label">Total</div>
         </div>
      </div>
      <div class="summary-card">
         <i class="fas fa-check-circle status-supported"></i>
         <div>
            <div class="summary-value">{supportedArmies}</div>
            <div class="summary-label">Supported</div>
         </div>
      </div>
      <div class="summary-card">
         <i class="fas fa-exclamation-triangle status-unsupported"></i>
         <div>
            <div class="summary-value">{unsupportedArmies}</div>
            <div class="summary-label">Unsupported</div>
         </div>
      </div>
   </div>
   
   <!-- Filters -->
   <div class="table-controls">
      <select bind:value={filterSupport} class="filter-select">
         <option value="all">All Armies</option>
         <option value="supported">Supported Only</option>
         <option value="unsupported">Unsupported Only</option>
      </select>
   </div>
   
   <!-- Table -->
   <div class="armies-table-container">
      <div class="armies-table-wrapper">
         <table class="armies-table">
         <thead>
            <tr>
               <th>Name</th>
               <th>Level</th>
               <th>Gear</th>
               <th>Support Status</th>
               <th>Actions</th>
            </tr>
         </thead>
         <tbody>
            <!-- Data Rows -->
            {#each paginatedArmies as army}
               <tr>
                  {#if linkingArmyId === army.id}
                     <!-- Linking mode: Full-width actor search -->
                     <td colspan="4">
                        <div class="actor-autosuggest">
                           <input 
                              type="text" 
                              bind:value={actorSearchTerm}
                              bind:this={searchInputRef}
                              placeholder="Search actors..."
                              class="autosuggest-input"
                           />
                           
                           {#if filteredActors.length > 0}
                              <div class="suggestions-dropdown">
                                 {#if groupedActors.characters.length > 0}
                                    <div class="suggestion-group">
                                       <div class="group-header">Characters ({groupedActors.characters.length})</div>
                                       {#each groupedActors.characters as actor}
                                          <button 
                                             class="suggestion-item"
                                             on:click={() => linkActor(army.id, actor.id)}
                                          >
                                             {actor.name}
                                          </button>
                                       {/each}
                                    </div>
                                 {/if}
                                 
                                 {#if groupedActors.npcs.length > 0}
                                    <div class="suggestion-group">
                                       <div class="group-header">NPCs ({groupedActors.npcs.length})</div>
                                       {#each groupedActors.npcs as actor}
                                          <button 
                                             class="suggestion-item"
                                             on:click={() => linkActor(army.id, actor.id)}
                                          >
                                             {actor.name}
                                          </button>
                                       {/each}
                                    </div>
                                 {/if}
                              </div>
                           {:else if actorSearchTerm.trim() !== ''}
                              <div class="suggestions-dropdown">
                                 <div class="no-results">No actors found</div>
                              </div>
                           {/if}
                        </div>
                     </td>
                     <td>
                        <div class="person-actions">
                           <button class="action-btn" on:click={cancelLinking} title="Cancel">
                              <i class="fas fa-times"></i>
                           </button>
                           <button 
                              class="delete-btn" 
                              on:click={() => deleteArmy(army.id)}
                              title="Disband army"
                           >
                              <i class="fas fa-trash"></i>
                           </button>
                        </div>
                     </td>
                  {:else}
                     <!-- Normal mode: All columns visible -->
                     <!-- Name Column -->
                     <td>
                        <button
                           class="army-name-btn" 
                           on:click={() => openActorSheet(army)}
                           title={army.actorId ? "Open actor sheet" : "Create actor"}
                        >
                           {army.actorId ? getActorName(army.actorId) : army.name}
                           {#if army.actorId}
                              <i class="fas fa-link link-icon"></i>
                           {/if}
                        </button>
                     </td>
                     
                     <!-- Level Column -->
                     <td>
                        {#if editingArmyId === army.id && editingField === 'level'}
                           <div class="inline-edit">
                              <input 
                                 type="number" 
                                 bind:value={editedValue}
                                 on:keydown={(e) => handleKeydown(e, army.id)}
                                 min="1"
                                 max="20"
                                 class="inline-input"
                                 disabled={isSaving}
                              />
                              <InlineEditActions
                                 onSave={() => saveEdit(army.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <button
                              class="editable-cell" 
                              on:click={() => startEdit(army, 'level')}
                              title="Click to edit"
                           >
                              {army.level}
                           </button>
                        {/if}
                     </td>
                     
                     <!-- Gear Column -->
                     <td>
                        <div class="gear-icons">
                           <i 
                              class="{EQUIPMENT_ICONS.armor} gear-icon" 
                              class:owned={army.equipment?.armor}
                              title={army.equipment?.armor ? 'Armor equipped' : 'No armor'}
                           ></i>
                           <i 
                              class="{EQUIPMENT_ICONS.runes} gear-icon" 
                              class:owned={army.equipment?.runes}
                              title={army.equipment?.runes ? 'Runes equipped' : 'No runes'}
                           ></i>
                           <i 
                              class="{EQUIPMENT_ICONS.weapons} gear-icon" 
                              class:owned={army.equipment?.weapons}
                              title={army.equipment?.weapons ? 'Weapons equipped' : 'No weapons'}
                           ></i>
                           <i 
                              class="{EQUIPMENT_ICONS.equipment} gear-icon" 
                              class:owned={army.equipment?.equipment}
                              title={army.equipment?.equipment ? 'Enhanced gear equipped' : 'No enhanced gear'}
                           ></i>
                        </div>
                     </td>
                     
                     <!-- Support Status Column -->
                     <td>
                        {#if editingArmyId === army.id && editingField === 'settlement'}
                           <!-- Editing: Show dropdown -->
                           <div class="inline-edit">
                              <select 
                                 bind:value={editedSettlementId}
                                 class="settlement-dropdown"
                                 disabled={isSaving}
                              >
                                 <option value="">Unsupported</option>
                                 {#each getAvailableSettlements(army.id) as settlement}
                                    <option value={settlement.id}>
                                       {settlement.name} ({settlement.tier} {getSettlementCapacityText(settlement, army.id)})
                                    </option>
                                 {/each}
                              </select>
                              <InlineEditActions
                                 onSave={() => saveEdit(army.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <!-- Display: Click to edit -->
                           <button
                              class="support-status-btn {getSupportStatusColor(army)}"
                              on:click={() => startEditingSettlement(army)}
                              title="Click to change settlement"
                           >
                              <i class="fas {getSupportStatusIcon(army)}"></i>
                              {getSupportStatusText(army)}
                           </button>
                        {/if}
                     </td>
                     
                     <!-- Actions Column -->
                     <td>
                        <div class="person-actions">
                           {#if army.actorId}
                              <button 
                                 class="action-btn" 
                                 on:click={() => unlinkActor(army.id)}
                                 title="Unlink actor"
                              >
                                 <i class="fas fa-unlink"></i>
                              </button>
                           {:else}
                              <button 
                                 class="action-btn" 
                                 on:click={() => startLinking(army.id)}
                                 title="Link existing actor"
                              >
                                 <i class="fas fa-link"></i>
                              </button>
                              <button 
                                 class="action-btn primary" 
                                 on:click={() => createActorForArmy(army.id)}
                                 title="Create new actor"
                              >
                                 <i class="fas fa-plus"></i>
                              </button>
                           {/if}
                           <button 
                              class="delete-btn" 
                              on:click={() => deleteArmy(army.id)}
                              title="Disband army"
                           >
                              <i class="fas fa-trash"></i>
                           </button>
                        </div>
                     </td>
                  {/if}
               </tr>
            {/each}
            
            <!-- Add Army Row -->
            <tr class="add-row">
               <td colspan="4">
                  {#if linkingArmyId === 'new'}
                     <!-- Linking mode: Actor search autosuggest -->
                     <div class="actor-autosuggest">
                        <input 
                           type="text" 
                           bind:value={actorSearchTerm}
                           bind:this={searchInputRef}
                           placeholder="Search actors..."
                           class="autosuggest-input"
                        />
                        
                        {#if filteredActors.length > 0}
                           <div class="suggestions-dropdown">
                              {#if groupedActors.characters.length > 0}
                                 <div class="suggestion-group">
                                    <div class="group-header">Characters ({groupedActors.characters.length})</div>
                                    {#each groupedActors.characters as actor}
                                       <button 
                                          class="suggestion-item"
                                          on:click={() => linkActor('new', actor.id)}
                                       >
                                          {actor.name}
                                       </button>
                                    {/each}
                                 </div>
                              {/if}
                              
                              {#if groupedActors.npcs.length > 0}
                                 <div class="suggestion-group">
                                    <div class="group-header">NPCs ({groupedActors.npcs.length})</div>
                                    {#each groupedActors.npcs as actor}
                                       <button 
                                          class="suggestion-item"
                                          on:click={() => linkActor('new', actor.id)}
                                       >
                                          {actor.name}
                                       </button>
                                    {/each}
                                 </div>
                              {/if}
                           </div>
                        {:else if actorSearchTerm.trim() !== ''}
                           <div class="suggestions-dropdown">
                              <div class="no-results">No actors found</div>
                           </div>
                        {/if}
                     </div>
                  {:else}
                     <!-- Default: Show prompt -->
                     <span class="add-prompt">Recruit Army</span>
                  {/if}
               </td>
               <td>
                  <div class="person-actions">
                     {#if linkingArmyId === 'new'}
                        <button class="action-btn" on:click={cancelLinking} title="Cancel">
                           <i class="fas fa-times"></i>
                        </button>
                     {:else}
                        <button class="action-btn" on:click={() => startLinking('new')} title="Link existing actor">
                           <i class="fas fa-link"></i>
                        </button>
                        <button class="action-btn primary" on:click={startCreating} title="Recruit new army">
                           <i class="fas fa-plus"></i>
                        </button>
                     {/if}
                  </div>
               </td>
            </tr>
            </tbody>
         </table>
      </div>
   </div>
   
   <!-- Pagination -->
   {#if totalPages > 1}
      <div class="pagination">
         <button 
            class="page-btn" 
            on:click={prevPage}
            disabled={currentPage === 1}
         >
            <i class="fas fa-chevron-left"></i>
         </button>
         
         <span class="page-info">
            Page {currentPage} of {totalPages}
         </span>
         
         <button 
            class="page-btn" 
            on:click={nextPage}
            disabled={currentPage === totalPages}
         >
            <i class="fas fa-chevron-right"></i>
         </button>
      </div>
   {/if}
</div>

<style lang="scss">
   .armies-tab {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      height: 100%;
      padding: var(--space-16);
   }
   
   .armies-summary {
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
            color: var(--color-white, #ffffff);
            
            &.status-supported {
               color: #90ee90;
            }
            
            &.status-unsupported {
               color: #ffa500;
            }
         }
         
         .summary-value {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: var(--font-sm);
            color: var(--text-medium-light, #9e9b8f);
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
         padding: var(--space-8);
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            border-color: var(--color-primary, #5e0000);
         }
      }
   }
   
   .armies-table-container {
      flex: 1;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      position: relative;
   }
   
   .armies-table-wrapper {
      overflow: visible;
      position: relative;
      z-index: auto;
   }
   
   .armies-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      position: relative;
      overflow: visible;
      
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
            
            &.add-row {
               background: rgba(0, 0, 0, 0.2);
            }
         }
         
         td {
            padding: var(--space-12) var(--space-16);
            color: var(--color-text-dark-primary, #b5b3a4);
            position: relative;
            overflow: visible;
            
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
   
   .army-name-btn {
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-md);
      text-align: left;
      font-weight: var(--font-weight-semibold);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 0.1875rem;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
         text-decoration-style: solid;
      }
   }
   
   .link-icon {
      margin-left: var(--space-6);
      font-size: var(--font-xs);
      opacity: 0.7;
   }
   
   .editable-cell {
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
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
   .actor-link,
   .edit-btn {
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
   
   .actor-link {
      background: transparent;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.1);
      }
      
      &.full-width {
         width: 100%;
         justify-content: center;
      }
   }
   
   .edit-btn {
      background: rgba(94, 0, 0, 0.2);
      color: var(--color-primary, #5e0000);
      
      &:hover:not(:disabled) {
         background: rgba(94, 0, 0, 0.3);
      }
   }
   
   .support-status {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &.status-supported {
         color: #90ee90;
      }
      
      &.status-unsupported {
         color: #ffa500;
      }
   }
   
   .support-status-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      background: rgba(0, 0, 0, 0.2);
      
      &.status-supported {
         color: #90ee90;
      }
      
      &.status-unsupported {
         color: #ffa500;
      }
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .settlement-dropdown {
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--color-primary, #5e0000);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 12.5rem;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .no-actor {
      color: var(--color-text-dark-secondary, #7a7971);
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-style: italic;
   }
   
   .add-prompt {
      color: var(--text-tertiary, #5a5850);
      font-weight: var(--font-weight-thin, 300);
   }
   
   .add-army-inputs {
      display: flex;
      gap: var(--space-8);
      align-items: center;
      
      .level-input {
         width: 5rem;
      }
   }
   
   .text-input {
      width: 100%;
      padding: var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      font-family: inherit;
      font-size: var(--font-md);
      
      &::placeholder {
         color: var(--color-text-dark-secondary, #7a7971);
         font-weight: var(--font-weight-normal);
         font-style: italic;
      }
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
         border-color: var(--border-faint);
      }
      
      &.small {
         padding: var(--space-4) var(--space-8);
         font-size: var(--font-sm);
      }
   }
   
   .person-actions {
      display: flex;
      gap: var(--space-4);
      align-items: center;
      position: relative;
      overflow: visible;
   }
   
   .action-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
      
      &.primary {
         background: rgba(144, 238, 144, 0.2);
         color: #90ee90;
         
         &:hover {
            background: rgba(144, 238, 144, 0.3);
         }
      }
      
      &.unlink-btn {
         color: #ffa500;
      }
      
      &.cancel-link {
         color: #ff6b6b;
      }
   }
   
   /* Actor Autosuggest */
   .actor-autosuggest {
      position: relative;
      display: flex;
      gap: var(--space-4);
      align-items: center;
      flex: 1;
      
      .autosuggest-input {
         flex: 1;
         padding: var(--space-4) var(--space-8);
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            background: rgba(0, 0, 0, 0.5);
            border-color: var(--border-faint);
         }
      }
      
      .suggestions-dropdown {
         position: absolute;
         top: 100%;
         left: 0;
         right: 0;
         width: auto;
         min-width: 18.75rem;
         max-height: 12.5rem;
         overflow-y: auto;
         background: rgba(0, 0, 0, 0.95);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         margin-top: var(--space-4);
         z-index: 10000;
         box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);
         
         .suggestion-group {
            .group-header {
               padding: var(--space-8);
               font-size: var(--font-xs);
               font-weight: var(--font-weight-semibold);
               color: var(--color-text-dark-secondary, #7a7971);
               text-transform: uppercase;
               background: rgba(0, 0, 0, 0.3);
               border-bottom: 1px solid var(--border-subtle);
            }
         }
         
         .suggestion-item {
            display: block;
            width: 100%;
            padding: var(--space-8);
            text-align: left;
            border: none;
            background: transparent;
            color: var(--color-text-dark-primary, #b5b3a4);
            cursor: pointer;
            transition: background 0.2s;
            
            &:hover {
               background: rgba(255, 255, 255, 0.1);
            }
         }
         
         .no-results {
            padding: var(--space-16);
            text-align: center;
            color: var(--color-text-dark-secondary, #7a7971);
            font-style: italic;
         }
      }
   }
   
   /* Pagination */
   .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-16);
      
      .page-btn {
         padding: var(--space-8) var(--space-16);
         background: rgba(0, 0, 0, 0.2);
         border: 1px solid var(--border-subtle);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         cursor: pointer;
         transition: all 0.2s;
         
         &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
         }
         
         &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
         }
      }
      
      .page-info {
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   /* Gear Icons */
   .gear-icons {
      display: flex;
      gap: var(--space-8);
      align-items: center;
      
      .gear-icon {
         font-size: var(--font-md);
         color: rgba(255, 255, 255, 0.3);
         transition: all 0.2s;
         
         &.owned {
            color: #90ee90;
         }
      }
   }
   
</style>
