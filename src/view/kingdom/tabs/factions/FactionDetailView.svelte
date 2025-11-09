<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import { kingdomData } from '../../../../stores/KingdomStore';
   import type { Faction, NotablePerson, AttitudeLevel } from '../../../../models/Faction';
   import { ATTITUDE_ORDER } from '../../../../models/Faction';
   import { 
      FACTION_ATTITUDE_ICONS, 
      FACTION_ATTITUDE_COLORS, 
      FACTION_ATTITUDE_DESCRIPTIONS 
   } from '../../../../utils/presentation';
   import Button from '../../components/baseComponents/Button.svelte';
   import ActorLinker from '../../components/baseComponents/ActorLinker.svelte';
   import RemoveNotablePersonDialog from '../../components/RemoveNotablePersonDialog.svelte';
   import FactionTokenInput from './FactionTokenInput.svelte';
   import { getAvailableActors, filterActors, groupActorsByType, getActorName as getActorNameUtil } from '../../logic/actorLinkingLogic';
   import { validateKingdomOrFactionName } from '../../../../utils/reserved-names';
   import { logger } from '../../../../utils/Logger';

   export let factionId: string;

   const dispatch = createEventDispatcher();

   // Local state for editing
   let editedFaction: Faction | null = null;
   let isSaving = false;
   let isEditingName = false;
   let tempName = '';
   
   // Check if current user is GM
   $: isGM = (globalThis as any).game?.user?.isGM || false;
   
   // Load faction data
   $: faction = $kingdomData.factions?.find(f => f.id === factionId);
   
   // Initialize editedFaction when faction loads
   $: if (faction && !editedFaction) {
      // Deep clone and ensure all fields exist
      editedFaction = {
         ...JSON.parse(JSON.stringify(faction)),
         // Ensure new fields exist with defaults
         image: faction.image || '',
         description: faction.description || '',
         gmNotes: faction.gmNotes || '',
         notablePeople: faction.notablePeople || [],
         territory: faction.territory || {
            territory: '',
            economy: '',
            religion: '',
            fame: ''
         },
         assets: faction.assets || '',
         quirks: faction.quirks || '',
         // Migrate old string format to array format if needed
         allies: Array.isArray(faction.allies) ? faction.allies : 
                 (faction.allies ? (faction.allies as any).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
         enemies: Array.isArray(faction.enemies) ? faction.enemies : 
                  (faction.enemies ? (faction.enemies as any).split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      };
   }
   
   // Notable people state
   let isAddingNew = false;
   let newPersonName = '';
   let newPersonInputRef: HTMLInputElement | null = null;
   
   // Actor linking state
   let linkingPersonId: string | null = null;
   let actorSearchTerm: string = '';
   let searchInputRef: HTMLInputElement | null = null;
   
   // Remove person dialog state
   let showRemoveDialog = false;
   let removingPerson: NotablePerson | null = null;
   
   // Click outside to close dropdown
   function handleClickOutside(event: MouseEvent) {
      if (!linkingPersonId && !isAddingNew) return;
      
      // Check if click is outside autosuggest containers
      const autosuggestContainers = document.querySelectorAll('.actor-autosuggest');
      const isOutside = Array.from(autosuggestContainers).every(container => 
         !container.contains(event.target as Node)
      );
      
      if (isOutside) {
         cancelLinking();
         cancelAddPerson();
      }
   }
   
   
   // Setup/cleanup click outside listener
   $: if (linkingPersonId || isAddingNew) {
      document.addEventListener('mousedown', handleClickOutside);
   } else {
      document.removeEventListener('mousedown', handleClickOutside);
   }
   
   function startAddingPerson() {
      isAddingNew = true;
      newPersonName = '';
      linkingPersonId = null; // Close link mode
      setTimeout(() => {
         newPersonInputRef?.focus();
      }, 10);
   }
   
   function confirmAddPerson() {
      if (!newPersonName.trim() || !editedFaction) return;
      createActorAndAdd(newPersonName.trim());
      isAddingNew = false;
      newPersonName = '';
   }
   
   function cancelAddPerson() {
      isAddingNew = false;
      newPersonName = '';
   }
   
   async function createActorAndAdd(name: string) {
      if (!editedFaction) return;
      
      try {
         // Route through GM via ActionDispatcher
         const { actionDispatcher } = await import('../../../../services/ActionDispatcher');
         
         if (!actionDispatcher.isAvailable()) {
            throw new Error('Action dispatcher not initialized. Please reload the game.');
         }
         
         const actor = await actionDispatcher.dispatch('createFactionActor', { name });
         
         if (actor) {
            const newPerson: NotablePerson = {
               id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
               name: name,
               actorId: actor.id
            };
            
            editedFaction.notablePeople = [...editedFaction.notablePeople, newPerson];
            editedFaction = { ...editedFaction };
            // @ts-ignore
            ui.notifications?.info(`Created actor: ${name}`);
         }
      } catch (error) {
         logger.error('Failed to create actor:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to create actor');
      }
   }
   
   function removeNotablePerson(personId: string) {
      if (!editedFaction) return;
      const person = editedFaction.notablePeople.find(p => p.id === personId);
      if (!person) return;
      
      removingPerson = person;
      showRemoveDialog = true;
   }
   
   async function handleRemoveConfirm(event: CustomEvent<{ deleteActor: boolean }>) {
      if (!editedFaction || !removingPerson) return;
      
      const { deleteActor } = event.detail;
      const personName = removingPerson.name;
      const actorId = removingPerson.actorId;
      
      // Remove from faction's list
      editedFaction.notablePeople = editedFaction.notablePeople.filter(p => p.id !== removingPerson?.id);
      editedFaction = { ...editedFaction };
      
      // Delete actor if requested
      if (deleteActor && actorId) {
         try {
            const actor = (globalThis as any).game?.actors?.get(actorId);
            if (actor) {
               await actor.delete();
               // @ts-ignore
               ui.notifications?.info(`Removed ${personName} and deleted NPC actor`);
            } else {
               // @ts-ignore
               ui.notifications?.info(`Removed ${personName} (actor already deleted)`);
            }
         } catch (error) {
            logger.error('Failed to delete actor:', error);
            // @ts-ignore
            ui.notifications?.warn(`Removed ${personName} but failed to delete actor`);
         }
      } else {
         // @ts-ignore
         ui.notifications?.info(`Removed ${personName} from notable people`);
      }
      
      removingPerson = null;
   }
   
   function handleRemoveCancel() {
      removingPerson = null;
   }
   
   // Actor linking functions
   function startLinking(personId: string) {
      linkingPersonId = personId;
      actorSearchTerm = '';
      isAddingNew = false; // Close add mode if open
   }
   
   function cancelLinking() {
      linkingPersonId = null;
      actorSearchTerm = '';
   }
   
   function handleSearchChange(term: string) {
      actorSearchTerm = term;
   }
   
   function selectActor(personId: string, actorId: string) {
      if (!editedFaction) return;
      
      // @ts-ignore - Get actor name
      const actor = game.actors?.get(actorId);
      const actorName = actor?.name || 'Unknown Actor';
      
      if (personId === 'new') {
         // Adding new person via link
         const newPerson: NotablePerson = {
            id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: actorName,
            actorId: actorId
         };
         
         editedFaction.notablePeople = [...editedFaction.notablePeople, newPerson];
         editedFaction = { ...editedFaction };
      } else {
         // Linking to existing person - update both actorId and name
         const person = editedFaction.notablePeople.find(p => p.id === personId);
         if (person) {
            person.actorId = actorId;
            person.name = actorName;
            editedFaction = { ...editedFaction };
         }
      }
      
      cancelLinking();
   }
   
   // Use shared actor linking logic
   $: availableActors = getAvailableActors();
   $: filteredActors = linkingPersonId ? filterActors(availableActors, actorSearchTerm) : [];
   $: groupedActors = groupActorsByType(filteredActors);
   
   async function createActorForPerson(personId: string) {
      if (!editedFaction) return;
      
      const person = editedFaction.notablePeople.find(p => p.id === personId);
      if (!person) return;
      
      try {
         // Route through GM via ActionDispatcher
         const { actionDispatcher } = await import('../../../../services/ActionDispatcher');
         
         if (!actionDispatcher.isAvailable()) {
            throw new Error('Action dispatcher not initialized. Please reload the game.');
         }
         
         const actor = await actionDispatcher.dispatch('createFactionActor', { name: person.name });
         
         if (actor) {
            person.actorId = actor.id;
            editedFaction = { ...editedFaction };
            // @ts-ignore
            ui.notifications?.info(`Created actor: ${person.name}`);
         }
      } catch (error) {
         logger.error('Failed to create actor:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to create actor');
      }
   }
   
   async function unlinkActor(personId: string) {
      if (!editedFaction) return;
      const person = editedFaction.notablePeople.find(p => p.id === personId);
      if (person) {
         person.actorId = undefined;
         editedFaction = { ...editedFaction };
      }
   }
   
   // Image picker
   async function selectImage() {
      // @ts-ignore - Foundry VTT FilePicker
      const fp = new FilePicker({
         type: 'image',
         callback: (path: string) => {
            if (editedFaction) {
               editedFaction.image = path;
               editedFaction = { ...editedFaction };
            }
         }
      });
      fp.browse();
   }
   
   // Progress clock functions
   let editingProgressMax = false;
   let tempProgressMax = '';
   
   async function incrementProgress() {
      if (!editedFaction) return;
      if (editedFaction.progressClock.current < editedFaction.progressClock.max) {
         editedFaction.progressClock.current++;
         editedFaction = { ...editedFaction };
      }
   }
   
   async function decrementProgress() {
      if (!editedFaction) return;
      if (editedFaction.progressClock.current > 0) {
         editedFaction.progressClock.current--;
         editedFaction = { ...editedFaction };
      }
   }
   
   function startEditingProgressMax() {
      if (!editedFaction) return;
      editingProgressMax = true;
      tempProgressMax = editedFaction.progressClock.max.toString();
   }
   
   function confirmProgressMax() {
      if (!editedFaction) return;
      const newMax = parseInt(tempProgressMax);
      if (!isNaN(newMax) && newMax > 0) {
         editedFaction.progressClock.max = newMax;
         // Ensure current doesn't exceed new max
         if (editedFaction.progressClock.current > newMax) {
            editedFaction.progressClock.current = newMax;
         }
         editedFaction = { ...editedFaction };
      }
      editingProgressMax = false;
   }
   
   function cancelEditingProgressMax() {
      editingProgressMax = false;
   }
   
   // Save/Cancel
   async function save() {
      if (!editedFaction) return;
      
      isSaving = true;
      try {
         const { factionService } = await import('../../../../services/factions');
         await factionService.updateFactionDetails(factionId, editedFaction);
         
         // @ts-ignore
         ui.notifications?.info(`Saved ${editedFaction.name}`);
         dispatch('back');
      } catch (error) {
         logger.error('Failed to save faction:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to save faction');
      } finally {
         isSaving = false;
      }
   }
   
   function startEditingName() {
      if (!editedFaction) return;
      isEditingName = true;
      tempName = editedFaction.name;
   }
   
   function saveNameChange() {
      if (!editedFaction || !tempName.trim()) return;
      
      // Validate faction name (prevent reserved names like "player")
      const validation = validateKingdomOrFactionName(tempName.trim());
      if (!validation.valid) {
         // @ts-ignore
         ui.notifications?.error(validation.error || 'Invalid faction name');
         return;
      }
      
      editedFaction.name = tempName.trim();
      editedFaction = { ...editedFaction };
      isEditingName = false;
   }
   
   function cancelNameEdit() {
      isEditingName = false;
      tempName = '';
   }
   
   function handleNameKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
         saveNameChange();
      } else if (event.key === 'Escape') {
         cancelNameEdit();
      }
   }
   
   function cancel() {
      dispatch('back');
   }
   
   function getActorName(actorId: string): string {
      return getActorNameUtil(actorId);
   }
   
   function openPersonActorSheet(actorId: string | undefined) {
      if (!actorId) return;
      const actor = (globalThis as any).game?.actors?.get(actorId);
      if (actor) actor.sheet.render(true);
   }
   
   // Attitude change
   function changeAttitude(attitude: AttitudeLevel) {
      if (!editedFaction) return;
      editedFaction.attitude = attitude;
      editedFaction = { ...editedFaction };
   }
   
   // Handle allies/enemies changes
   function handleAlliesChange(newAllies: string[]) {
      if (!editedFaction) return;
      editedFaction.allies = newAllies;
      editedFaction = { ...editedFaction };
   }
   
   function handleEnemiesChange(newEnemies: string[]) {
      if (!editedFaction) return;
      editedFaction.enemies = newEnemies;
      editedFaction = { ...editedFaction };
   }
   
   // Convert HSL to Hex for color picker
   function hslToHex(hsl: string): string {
      // Parse HSL string: "hsl(0, 70%, 60%)"
      const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (!match) return '#000000';
      
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      
      const hue2rgb = (p: number, q: number, t: number) => {
         if (t < 0) t += 1;
         if (t > 1) t -= 1;
         if (t < 1/6) return p + (q - p) * 6 * t;
         if (t < 1/2) return q;
         if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
         return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      const g = Math.round(hue2rgb(p, q, h) * 255);
      const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
   }
   
   // Convert Hex to HSL for storage
   function hexToHsl(hex: string): string {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
         const d = max - min;
         s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
         
         switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
         }
      }
      
      return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
   }
   
   // Reactive color picker value (hex format)
   $: colorPickerValue = editedFaction ? hslToHex(editedFaction.color) : '#000000';
   
   function handleColorChange(event: Event) {
      if (!editedFaction) return;
      const hex = (event.target as HTMLInputElement).value;
      editedFaction.color = hexToHsl(hex);
      editedFaction = { ...editedFaction };
   }
</script>

<!-- Remove Notable Person Dialog -->
{#if removingPerson}
   <RemoveNotablePersonDialog
      bind:show={showRemoveDialog}
      personName={removingPerson.name}
      factionName={editedFaction?.name || ''}
      hasLinkedActor={!!removingPerson.actorId}
      on:confirm={handleRemoveConfirm}
      on:cancel={handleRemoveCancel}
   />
{/if}

{#if editedFaction}
   <div class="faction-detail">
      <!-- Back Button and Action Buttons (Fixed) -->
      <div class="back-button-row">
         <Button 
            variant="secondary" 
            icon="fas fa-arrow-left" 
            iconPosition="left"
            on:click={cancel}
         >
            Back to List
         </Button>
         <div class="action-buttons">
            <Button variant="secondary" on:click={cancel} disabled={isSaving}>
               Cancel
            </Button>
            <Button variant="primary" on:click={save} disabled={isSaving}>
               {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
         </div>
      </div>
      
      <!-- Name and Attitude Header (Fixed) -->
      <div class="name-attitude-header">
         <div class="faction-name-section">
            {#if isEditingName}
               <div class="name-edit-wrapper">
                  <input 
                     type="text" 
                     bind:value={tempName}
                     on:keydown={handleNameKeydown}
                     on:blur={saveNameChange}
                     class="faction-name-input editing"
                     placeholder="Faction name"
                     autofocus
                  />
                  <button on:click={saveNameChange} class="name-edit-btn" title="Save">
                     <i class="fas fa-check"></i>
                  </button>
                  <button on:click={cancelNameEdit} class="name-edit-btn cancel" title="Cancel">
                     <i class="fas fa-times"></i>
                  </button>
               </div>
            {:else}
               <div class="name-display">
                  <h2>{editedFaction.name}</h2>
                  <button on:click={startEditingName} class="name-edit-btn" title="Edit faction name">
                     <i class="fa-solid fa-pen-fancy"></i>
                  </button>
               </div>
            {/if}
         </div>
         
      <div class="faction-attitude">
         <div class="attitude-icons">
            <span class="attitude-name">{editedFaction.attitude}</span>
            {#each ATTITUDE_ORDER as attitude}
               <button 
                  class="attitude-icon-compact {editedFaction.attitude === attitude ? 'active' : ''}"
                  on:click={() => changeAttitude(attitude)}
                  title={FACTION_ATTITUDE_DESCRIPTIONS[attitude]}
               >
                  <i 
                     class="fas {FACTION_ATTITUDE_ICONS[attitude]}" 
                     style="color: {editedFaction.attitude === attitude ? FACTION_ATTITUDE_COLORS[attitude] : 'rgba(255,255,255,0.2)'}"
                  ></i>
               </button>
            {/each}
         </div>
      </div>
      
      <div class="faction-color-picker">
         <label for="faction-color">Territory Color</label>
         <div class="color-picker-wrapper">
            <input 
               type="color" 
               id="faction-color"
               value={colorPickerValue}
               on:input={handleColorChange}
               class="color-input"
               title="Select faction territory color"
            />
            <span class="color-preview" style="background-color: {editedFaction.color}"></span>
         </div>
      </div>
   </div>
      
      <!-- Scrollable Content -->
      <div class="scrollable-content">
         <!-- Description and Image Section (50/50 Split) -->
         <div class="faction-header">
            <!-- Description on Left -->
            <div class="faction-description">
               <textarea 
                  bind:value={editedFaction.description}
                  class="faction-description-input"
                  placeholder="Enter faction description..."
                  rows="3"
               ></textarea>
            </div>
            
            <!-- Portrait Image on Right -->
            <div class="faction-portrait">
               {#if editedFaction.image}
                  <img src={editedFaction.image} alt={editedFaction.name} class="portrait-image" />
               {:else}
                  <div class="portrait-placeholder">
                     <i class="fas fa-image"></i>
                     <p>No image</p>
                  </div>
               {/if}
               <Button variant="secondary" on:click={selectImage}>
                  {editedFaction.image ? 'Change' : 'Select Image'}
               </Button>
            </div>
         </div>
         
      <!-- Detail Sections -->
      <div class="detail-sections">
            
            <!-- Notable People Section -->
            <section class="detail-section">
               <h3><i class="fas fa-users"></i> Notable NPCs</h3>
               <div class="notable-people">
                  <table class="people-table">
                     <thead>
                        <tr>
                           <th>Name</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {#each editedFaction.notablePeople as person}
                           <tr>
                              <td>
                                 {#if person.actorId}
                                    <button
                                       class="person-name-btn"
                                       on:click={() => openPersonActorSheet(person.actorId)}
                                       title="Open actor sheet"
                                    >
                                       {getActorName(person.actorId)}
                                       <i class="fas fa-link link-icon"></i>
                                    </button>
                                 {:else}
                                    <span class="person-name-unlinked">{person.name}</span>
                                 {/if}
                              </td>
                              <td>
                                 <div class="person-actions">
                                    {#if linkingPersonId === person.id}
                                       <!-- Inline actor search autosuggest -->
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
                                                            on:click={() => selectActor(person.id, actor.id)}
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
                                                            on:click={() => selectActor(person.id, actor.id)}
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
                                          
                                          <button class="action-btn" on:click={cancelLinking} title="Cancel">
                                             <i class="fas fa-times"></i>
                                          </button>
                                       </div>
                                    {:else if person.actorId}
                                       <button class="action-btn" on:click={() => unlinkActor(person.id)} title="Unlink Actor">
                                          <i class="fas fa-unlink"></i>
                                       </button>
                                    {:else}
                                       <button class="action-btn" on:click={() => startLinking(person.id)} title="Link Actor">
                                          <i class="fas fa-link"></i>
                                       </button>
                                       <button class="action-btn primary" on:click={() => createActorForPerson(person.id)} title="Create Actor">
                                          <i class="fas fa-plus"></i>
                                       </button>
                                    {/if}
                                    <button class="action-btn danger" on:click={() => removeNotablePerson(person.id)} title="Remove from list">
                                       <i class="fas fa-trash"></i>
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        {/each}
                        <!-- Add row -->
                        <tr class="add-row">
                           <td>
                              {#if linkingPersonId === 'new'}
                                 <!-- Inline actor search autosuggest for new person -->
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
                                                      on:click={() => selectActor('new', actor.id)}
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
                                                      on:click={() => selectActor('new', actor.id)}
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
                              {:else if isAddingNew}
                                 <input 
                                    type="text" 
                                    bind:value={newPersonName}
                                    bind:this={newPersonInputRef}
                                    class="text-input small"
                                    placeholder="Enter actor name..."
                                    on:keydown={(e) => e.key === 'Enter' && confirmAddPerson()}
                                 />
                        {:else}
                           <span class="add-prompt">Add NPC</span>
                        {/if}
                           </td>
                           <td>
                              <div class="person-actions">
                                 {#if linkingPersonId === 'new'}
                                    <button class="action-btn" on:click={cancelLinking} title="Cancel">
                                       <i class="fas fa-times"></i>
                                    </button>
                                 {:else if isAddingNew}
                                    <button class="action-btn primary" on:click={confirmAddPerson} title="Create Actor">
                                       <i class="fas fa-check"></i>
                                    </button>
                                    <button class="action-btn" on:click={cancelAddPerson} title="Cancel">
                                       <i class="fas fa-times"></i>
                                    </button>
                                 {:else}
                                    <button class="action-btn" on:click={() => startLinking('new')} title="Link Existing Actor">
                                       <i class="fas fa-link"></i>
                                    </button>
                                    <button class="action-btn primary" on:click={startAddingPerson} title="Create New Actor">
                                       <i class="fas fa-plus"></i>
                                    </button>
                                 {/if}
                              </div>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </section>
            
            <!-- Territory Section (Simplified) -->
            <section class="detail-section">
               <h3><i class="fas fa-map-marked-alt"></i> Territory</h3>
               <textarea 
                  bind:value={editedFaction.territory.territory}
                  class="textarea-input"
                  placeholder="Territory information, holdings, regions controlled..."
                  rows="3"
               ></textarea>
            </section>
            
            <!-- Assets Section -->
            <section class="detail-section">
               <h3><i class="fas fa-coins"></i> Assets</h3>
               <textarea 
                  bind:value={editedFaction.assets}
                  class="textarea-input"
                  placeholder="Military forces, resources, special capabilities..."
                  rows="3"
               ></textarea>
            </section>
            
            <!-- Allies & Enemies Section (Side by Side) -->
            <section class="detail-section">
               <div class="allies-enemies-row">
                  <div class="allies-column">
                     <h3><i class="fas fa-handshake"></i> Allies</h3>
                     <FactionTokenInput 
                        values={editedFaction.allies}
                        placeholder="Enter ally name..."
                        excludeValues={[editedFaction.name, ...editedFaction.enemies]}
                        onChange={handleAlliesChange}
                     />
                  </div>
                  <div class="enemies-column">
                     <h3><i class="fas fa-skull-crossbones"></i> Enemies</h3>
                     <FactionTokenInput 
                        values={editedFaction.enemies}
                        placeholder="Enter enemy name..."
                        excludeValues={[editedFaction.name, ...editedFaction.allies]}
                        onChange={handleEnemiesChange}
                     />
                  </div>
               </div>
            </section>
            
            <!-- Notes Section (Public) -->
            <section class="detail-section">
               <h3><i class="fas fa-sticky-note"></i> Notes</h3>
               <textarea 
                  bind:value={editedFaction.notes}
                  class="textarea-input"
                  placeholder="Public notes visible to all players..."
                  rows="3"
               ></textarea>
            </section>
            
            <!-- Goal & Progress Section (GM-ONLY) -->
            {#if isGM}
               <section class="detail-section gm-only">
                  <h3><i class="fas fa-lock"></i> Goal & Progress (GM Only)</h3>
                  <div class="goal-progress">
                     <div class="goal-input">
                        <label>Strategic Goal</label>
                        <textarea 
                           bind:value={editedFaction.goal}
                           class="textarea-input"
                           placeholder="What is this faction working towards?"
                           rows="2"
                        ></textarea>
                     </div>
                     <div class="progress-display">
                        <label>Progress Clock</label>
                        <div class="progress-clock">
                           {#if editingProgressMax}
                              <label class="clock-edit-label">Number of Steps:</label>
                              <input 
                                 type="number" 
                                 bind:value={tempProgressMax}
                                 class="clock-max-input"
                                 min="1"
                                 on:keydown={(e) => e.key === 'Enter' && confirmProgressMax()}
                              />
                              <button class="clock-btn small" on:click={confirmProgressMax} title="Confirm">
                                 <i class="fas fa-check"></i>
                              </button>
                              <button class="clock-btn small" on:click={cancelEditingProgressMax} title="Cancel">
                                 <i class="fas fa-times"></i>
                              </button>
                           {:else}
                              <button class="clock-btn" on:click={decrementProgress} title="Decrease">
                                 <i class="fas fa-minus"></i>
                              </button>
                              <span class="clock-value">
                                 {editedFaction.progressClock.current} / 
                                 <button class="clock-max-btn" on:click={startEditingProgressMax} title="Click to edit max">
                                    {editedFaction.progressClock.max}
                                 </button>
                              </span>
                              <button class="clock-btn" on:click={incrementProgress} title="Increase">
                                 <i class="fas fa-plus"></i>
                              </button>
                           {/if}
                        </div>
                     </div>
                  </div>
               </section>
            {/if}
            
            <!-- GM Notes Section (GM-ONLY) -->
            {#if isGM}
               <section class="detail-section gm-only">
                  <h3><i class="fas fa-lock"></i> GM Notes (GM Only)</h3>
                  <textarea 
                     bind:value={editedFaction.gmNotes}
                     class="textarea-input"
                     placeholder="Private GM notes (not visible to players)..."
                     rows="3"
                  ></textarea>
               </section>
            {/if}
         </div>
         
      </div>
   </div>
{:else}
   <div class="faction-detail">
      <div class="detail-header">
         <Button variant="secondary" icon="fas fa-arrow-left" iconPosition="left" on:click={cancel}>
            Back to List
         </Button>
         <h2>Faction Not Found</h2>
      </div>
      <div class="error-state">
         <i class="fas fa-exclamation-triangle"></i>
         <p>The requested faction could not be found.</p>
      </div>
   </div>
{/if}

<style lang="scss">
   .faction-detail {
      --color-gm-area: rgba(150, 80, 255, 0.1);
      --color-gm-border: var(--border-special-medium);
      
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--space-16);
      gap: var(--space-16);
   }
   
   .back-button-row {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-16);
   }
   
   .action-buttons {
      display: flex;
      gap: var(--space-8);
   }
   
   .scrollable-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }
   
   .name-attitude-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-16);
      background: var(--overlay-low);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-16);
      width: 100%;
   }
   
   .faction-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-24);
      background: var(--overlay-low);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-16);
   }
   
   .faction-portrait {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      align-items: center;
   }
   
   .portrait-image {
      width: 100%;
      height: auto;
      max-height: 25rem;
      object-fit: cover;
      border-radius: var(--radius-lg);
      border: 2px solid var(--border-default);
   }
   
   .portrait-placeholder {
      width: 100%;
      height: 18.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--overlay);
      border: 2px dashed var(--border-default);
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      
      i {
         font-size: var(--font-6xl);
         margin-bottom: var(--space-8);
      }
      
      p {
         margin: 0;
         font-size: var(--font-sm);
      }
   }
   
   .faction-description {
      display: flex;
      flex-direction: column;
   }
   
   .faction-name-section {
      flex: 1;
      min-width: 0;
   }
   
   .name-display {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      h2 {
         margin: 0;
         color: var(--color-accent);
         font-size: var(--font-4xl);
         font-weight: var(--font-weight-bold);
      }
   }
   
   .name-edit-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      width: 50%;
   }
   
   .faction-name-input {
      flex: 1;
      padding: var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--color-accent);
      font-size: var(--font-3xl);
      font-weight: var(--font-weight-semibold);
      
      &::placeholder {
         color: var(--text-tertiary);
         font-weight: var(--font-weight-normal);
         font-style: italic;
      }
      
      &:focus {
         outline: none;
         background: var(--overlay-high);
         border-color: var(--color-accent);
      }
   }
   
   .name-edit-btn {
      padding: var(--space-6) var(--space-8);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      font-size: var(--font-sm);
      
      &:hover {
         background: var(--hover);
         border-radius: var(--radius-md);
      }
      
      &.cancel {
         color: var(--text-secondary);
      }
   }
   
   .faction-description-input {
      width: 100%;
      height: 18.75rem;
      padding: var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: inherit;
      resize: none;
      
      &::placeholder {
         color: var(--text-tertiary);
         font-weight: var(--font-weight-normal);
         font-style: italic;
      }
      
      &:focus {
         outline: none;
         background: var(--overlay-high);
         border-color: var(--border-faint);
      }
   }
   
   .faction-attitude {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: auto;
   }
   
   .attitude-icons {
      display: flex;
      align-items: center;
      gap: var(--space-8);
   }
   
   .attitude-icon-compact {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;
      
      i {
         font-size: var(--font-2xl);
      }
      
      &:hover {
         transform: scale(1.15);
         background: var(--hover-low);
      }
      
      &.active {
         border-color: var(--border-medium);
         transform: scale(1.2);
      }
   }
   
   .attitude-name {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-right: var(--space-8);
   }
   
   .faction-color-picker {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      align-items: center;
      
      label {
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         color: var(--text-secondary);
      }
   }
   
   .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-8);
   }
   
   .color-input {
      width: 3.75rem;
      height: 2.25rem;
      border: 2px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      background: transparent;
      
      &:hover {
         border-color: var(--border-faint);
      }
   }
   
   .color-preview {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius-md);
      border: 2px solid var(--border-medium);
      display: inline-block;
   }
   
   .help-text-small {
      margin: 0;
      font-size: var(--font-sm);
      color: var(--text-secondary);
      font-style: italic;
   }
   
   .detail-header {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      padding-bottom: var(--space-16);
      border-bottom: 1px solid var(--border-subtle);
      
      h2 {
         margin: 0;
         color: var(--text-primary);
         flex: 1;
         text-align: center;
         
      }
   }
   
   .detail-sections {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }
   
   .detail-section {
      background: var(--overlay-low);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-16);
      overflow: visible;
      position: relative;
      z-index: auto;
      
      h3 {
         margin: 0 0 var(--space-16) 0;
         color: var(--color-accent);
         display: flex;
         align-items: center;
         gap: var(--space-8);
         font-size: var(--font-xl);
         
         i {
            color: rgba(255, 255, 255, 0.9);
            font-size: var(--font-md);
         }
      }
   }
   
   .image-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-16);
   }
   
   .faction-image {
      max-width: 18.75rem;
      max-height: 18.75rem;
      border-radius: var(--radius-lg);
      border: 2px solid var(--border-default);
   }
   
   .no-image {
      width: 18.75rem;
      height: 12.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--overlay);
      border: 2px dashed var(--border-default);
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      
      i {
         font-size: var(--font-6xl);
         margin-bottom: var(--space-8);
      }
   }
   
   .text-input,
   .textarea-input {
      width: 100%;
      padding: var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: inherit;
      font-size: var(--font-md);
      
      &::placeholder {
         color: var(--text-tertiary);
         font-weight: var(--font-weight-normal);
         font-style: italic;
      }
      
      &:focus {
         outline: none;
         background: var(--overlay-high);
         border-color: var(--border-faint);
      }
      
      &.small {
         padding: var(--space-4) var(--space-8);
         font-size: var(--font-sm);
      }
   }
   
   .textarea-input {
      resize: vertical;
      min-height: 3.75rem;
   }
   
   .attitude-display {
      display: flex;
      gap: var(--space-16);
      align-items: center;
      padding: var(--space-16);
      background: var(--overlay-low);
      border-radius: var(--radius-md);
   }
   
   .attitude-icon-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-8);
      
      i {
         font-size: var(--font-4xl);
      }
      
      .attitude-label {
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }
      
      &.active {
         transform: scale(1.1);
      }
   }
   
   .help-text {
      margin: var(--space-8) 0 0 0;
      font-size: var(--font-sm);
      color: var(--text-secondary);
      font-style: italic;
   }
   
   .goal-progress {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-16);
      align-items: start;
   }
   
   .goal-input {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
      label {
         font-size: var(--font-md);
         font-weight: var(--font-weight-normal);
         color: var(--text-secondary);
      }
   }
   
   .progress-display {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      align-items: flex-start;
      
      label {
         font-size: var(--font-md);
         font-weight: var(--font-weight-normal);
         color: var(--text-secondary);
      }
   }
   
   .progress-clock {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-8);
      background: var(--overlay);
      border-radius: var(--radius-md);
   }
   
   .clock-btn {
      padding: var(--space-4) var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         background: var(--hover);
      }
   }
   
   .clock-value {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-xl);
      min-width: 4rem;
      text-align: center;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: var(--space-4);
   }
   
   .clock-max-btn {
      background: none;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      text-decoration: underline;
      text-decoration-style: dotted;
      padding: 0;
      
      &:hover {
         color: var(--color-accent);
      }
   }
   
   .clock-edit-label {
      font-size: var(--font-md);
      font-weight: var(--font-weight-normal);
      color: var(--text-secondary);
      white-space: nowrap;
   }
   
   .clock-max-input {
      width: 3rem;
      padding: var(--space-4);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      text-align: center;
      
      &:focus {
         outline: none;
         border-color: var(--border-faint);
      }
   }
   
   .clock-btn.small {
      padding: var(--space-2) var(--space-4);
      font-size: var(--font-xs);
   }
   
   .notable-people {
      overflow: visible;
      position: relative;
      z-index: 1;
   }
   
   .people-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: visible;
      font-size: var(--font-md);
      position: relative;
      
      thead {
         background: var(--overlay);
         
         th {
            padding: var(--space-8);
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            border-bottom: 1px solid var(--border-subtle);
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid var(--border-faint);
            
            &.add-row {
               background: var(--overlay-low);
            }
         }
         
         td {
            padding: var(--space-8);
            color: var(--text-primary);
            overflow: visible;
         }
      }
   }
   
   .person-actions {
      display: flex;
      gap: var(--space-4);
      overflow: visible;
      position: relative;
   }
   
   .person-name-btn {
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
         background: var(--hover);
         text-decoration-style: solid;
      }
   }
   
   .person-name-unlinked {
      color: var(--text-secondary);
      font-style: italic;
      padding: var(--space-4) var(--space-8);
   }
   
   .link-icon {
      margin-left: var(--space-6);
      font-size: var(--font-xs);
      opacity: 0.7;
   }
   
   .person-actions {
      display: flex;
      gap: var(--space-4);
   }
   
   .action-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      background: var(--hover);
      color: var(--text-primary);
      
      &:hover {
         background: rgba(255, 255, 255, 0.2);
      }
      
      &.primary {
         background: rgba(144, 238, 144, 0.2);
         color: var(--color-success);
         
         &:hover {
            background: rgba(144, 238, 144, 0.3);
         }
      }
      
      &.danger {
         background: rgba(255, 107, 107, 0.2);
         color: var(--color-danger);
         
         &:hover {
            background: rgba(255, 107, 107, 0.3);
         }
      }
   }
   
   .add-person {
      display: flex;
      gap: var(--space-8);
      align-items: center;
   }
   
   .add-prompt {
      color: var(--text-tertiary, #5a5850);
      font-weight: var(--font-weight-thin, 300);
   }
   
   .allies-enemies-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-24);
   }
   
   .allies-column,
   .enemies-column {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
      h3 {
         margin: 0 0 var(--space-8) 0;
         color: var(--color-accent);
         display: flex;
         align-items: center;
         gap: var(--space-8);
         font-size: var(--font-xl);
         
         i {
            color: rgba(255, 255, 255, 0.9);
            font-size: var(--font-md);
         }
      }
   }
   
   
   .empty-state {
      text-align: center;
      padding: var(--space-24);
      color: var(--text-secondary);
      font-style: italic;
   }
   
   .error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      
      i {
         font-size: var(--font-6xl);
         margin-bottom: var(--space-16);
         color: var(--color-danger);
      }
   }
   
   /* GM-Only Section Styling */
   .gm-only {
      border: 1px solid var(--color-gm-border);
      background: var(--color-gm-area);
      
      h3 i.fa-lock {
         color: rgba(150, 80, 255, 0.9);
      }
   }
   
   /* Actor Autosuggest Styling */
   .actor-autosuggest {
      position: relative;
      display: flex;
      gap: var(--space-4);
      align-items: center;
      flex: 1;
      
      .autosuggest-input {
         flex: 1;
         padding: var(--space-4) var(--space-8);
         background: var(--overlay);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         color: var(--text-primary);
         
         &:focus {
            outline: none;
            background: var(--overlay-high);
            border-color: var(--border-faint);
         }
      }
      
      .suggestions-dropdown {
         position: absolute;
         top: 100%;
         left: 0;
         width: 50%;
         max-height: 12.5rem;
         overflow-y: scroll;
         background: var(--overlay-highest);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         margin-top: var(--space-4);
         z-index: 10000;
         box-shadow: 0 0.25rem 0.5rem var(--overlay);
         
         .suggestion-group {
            .group-header {
               padding: var(--space-8);
               font-size: var(--font-xs);
               font-weight: var(--font-weight-semibold);
               color: var(--text-secondary);
               text-transform: uppercase;
               background: var(--overlay);
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
            color: var(--text-primary);
            cursor: pointer;
            transition: background 0.2s;
            
            &:hover {
               background: var(--hover);
            }
         }
         
         .no-results {
            padding: var(--space-16);
            text-align: center;
            color: var(--text-secondary);
            font-style: italic;
         }
      }
   }
</style>
