<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import { kingdomData } from '../../../../stores/KingdomStore';
   import type { Faction, NotablePerson, AttitudeLevel } from '../../../../models/Faction';
   import { AttitudeLevelConfig, ATTITUDE_ORDER } from '../../../../models/Faction';
   import Button from '../../components/baseComponents/Button.svelte';

   export let factionId: string;

   const dispatch = createEventDispatcher();

   // Local state for editing
   let editedFaction: Faction | null = null;
   let isSaving = false;
   
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
         notablePeople: faction.notablePeople || [],
         territory: faction.territory || {
            territory: '',
            economy: '',
            religion: '',
            fame: ''
         },
         assets: faction.assets || '',
         quirks: faction.quirks || '',
         allies: faction.allies || '',
         enemies: faction.enemies || ''
      };
   }
   
   // Notable people editing
   let editingPersonId: string | null = null;
   let newPersonName = '';
   
   function addNotablePerson() {
      if (!newPersonName.trim() || !editedFaction) return;
      
      const newPerson: NotablePerson = {
         id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         name: newPersonName.trim()
      };
      
      editedFaction.notablePeople = [...editedFaction.notablePeople, newPerson];
      newPersonName = '';
   }
   
   function removeNotablePerson(personId: string) {
      if (!editedFaction) return;
      editedFaction.notablePeople = editedFaction.notablePeople.filter(p => p.id !== personId);
   }
   
   async function linkActorToPerson(personId: string) {
      // @ts-ignore - Foundry VTT API
      const actors = game.actors?.filter(a => a.type === 'character' || a.type === 'npc') || [];
      
      // @ts-ignore - Foundry VTT Dialog
      const actorId = await new Promise((resolve) => {
         new Dialog({
            title: 'Select Actor',
            content: `
               <div class="form-group">
                  <label>Choose an actor to link:</label>
                  <select id="actor-select" style="width: 100%;">
                     <option value="">-- Select Actor --</option>
                     ${actors.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                  </select>
               </div>
            `,
            buttons: {
               ok: {
                  label: 'Link',
                  callback: (html) => {
                     const select = html.find('#actor-select')[0] as HTMLSelectElement;
                     resolve(select.value || null);
                  }
               },
               cancel: {
                  label: 'Cancel',
                  callback: () => resolve(null)
               }
            },
            default: 'ok'
         }).render(true);
      });
      
      if (actorId && editedFaction) {
         const person = editedFaction.notablePeople.find(p => p.id === personId);
         if (person) {
            person.actorId = actorId;
            editedFaction = { ...editedFaction };
         }
      }
   }
   
   async function createActorForPerson(personId: string) {
      if (!editedFaction) return;
      
      const person = editedFaction.notablePeople.find(p => p.id === personId);
      if (!person) return;
      
      try {
         // @ts-ignore - Foundry VTT API
         const actor = await Actor.create({
            name: person.name,
            type: 'npc',
            folder: null
         });
         
         if (actor) {
            person.actorId = actor.id;
            editedFaction = { ...editedFaction };
            // @ts-ignore
            ui.notifications?.info(`Created actor: ${person.name}`);
         }
      } catch (error) {
         console.error('Failed to create actor:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create actor');
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
         console.error('Failed to save faction:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to save faction');
      } finally {
         isSaving = false;
      }
   }
   
   function cancel() {
      dispatch('back');
   }
   
   function getActorName(actorId: string): string {
      // @ts-ignore - Foundry VTT API
      const actor = game.actors?.get(actorId);
      return actor?.name || 'Unknown Actor';
   }
</script>

{#if editedFaction}
   <div class="faction-detail">
      <!-- Header with Back Button -->
      <div class="detail-header">
         <Button 
            variant="secondary" 
            icon="fas fa-arrow-left" 
            iconPosition="left"
            on:click={cancel}
         >
            Back to List
         </Button>
         <h2>{editedFaction.name}</h2>
      </div>
      
      <!-- Content Container -->
      <div class="detail-content">
         <div class="detail-sections">
            <!-- Image Section -->
            <section class="detail-section">
               <h3><i class="fas fa-image"></i> Faction Image</h3>
               <div class="image-section">
                  {#if editedFaction.image}
                     <img src={editedFaction.image} alt={editedFaction.name} class="faction-image" />
                  {:else}
                     <div class="no-image">
                        <i class="fas fa-image"></i>
                        <p>No image selected</p>
                     </div>
                  {/if}
                  <Button variant="secondary" on:click={selectImage}>
                     {editedFaction.image ? 'Change Image' : 'Select Image'}
                  </Button>
               </div>
            </section>
            
            <!-- Name Section -->
            <section class="detail-section">
               <h3><i class="fas fa-tag"></i> Name</h3>
               <input 
                  type="text" 
                  bind:value={editedFaction.name}
                  class="text-input large"
                  placeholder="Faction name"
               />
            </section>
            
            <!-- Description Section -->
            <section class="detail-section">
               <h3><i class="fas fa-align-left"></i> Description</h3>
               <textarea 
                  bind:value={editedFaction.description}
                  class="textarea-input large"
                  placeholder="Enter faction description..."
                  rows="5"
               ></textarea>
            </section>
            
            <!-- Attitude Section (Read-only reference) -->
            <section class="detail-section">
               <h3><i class="fas fa-heart"></i> Current Attitude</h3>
               <div class="attitude-display">
                  {#each ATTITUDE_ORDER as attitude}
                     <div class="attitude-icon-display {editedFaction.attitude === attitude ? 'active' : ''}">
                        <i 
                           class="fas {AttitudeLevelConfig[attitude].icon}" 
                           style="color: {editedFaction.attitude === attitude ? AttitudeLevelConfig[attitude].color : 'rgba(255,255,255,0.2)'}"
                        ></i>
                        {#if editedFaction.attitude === attitude}
                           <span class="attitude-label">{attitude}</span>
                        {/if}
                     </div>
                  {/each}
               </div>
               <p class="help-text">Change attitude from the factions list view</p>
            </section>
            
            <!-- Goal & Progress Section -->
            <section class="detail-section">
               <h3><i class="fas fa-bullseye"></i> Goal & Progress</h3>
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
                        <button class="clock-btn" on:click={decrementProgress} title="Decrease">
                           <i class="fas fa-minus"></i>
                        </button>
                        <span class="clock-value">{editedFaction.progressClock.current} / {editedFaction.progressClock.max}</span>
                        <button class="clock-btn" on:click={incrementProgress} title="Increase">
                           <i class="fas fa-plus"></i>
                        </button>
                     </div>
                  </div>
               </div>
            </section>
            
            <!-- Notable People Section -->
            <section class="detail-section">
               <h3><i class="fas fa-users"></i> Notable People</h3>
               <div class="notable-people">
                  <table class="people-table">
                     <thead>
                        <tr>
                           <th>Name</th>
                           <th>Linked Actor</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {#each editedFaction.notablePeople as person}
                           <tr>
                              <td>
                                 <input 
                                    type="text" 
                                    bind:value={person.name}
                                    class="text-input small"
                                 />
                              </td>
                              <td>
                                 {#if person.actorId}
                                    <span class="linked-actor">
                                       <i class="fas fa-link"></i>
                                       {getActorName(person.actorId)}
                                    </span>
                                 {:else}
                                    <span class="no-link">Not linked</span>
                                 {/if}
                              </td>
                              <td>
                                 <div class="person-actions">
                                    {#if person.actorId}
                                       <button class="action-btn" on:click={() => unlinkActor(person.id)} title="Unlink Actor">
                                          <i class="fas fa-unlink"></i>
                                       </button>
                                    {:else}
                                       <button class="action-btn" on:click={() => linkActorToPerson(person.id)} title="Link Actor">
                                          <i class="fas fa-link"></i>
                                       </button>
                                       <button class="action-btn" on:click={() => createActorForPerson(person.id)} title="Create Actor">
                                          <i class="fas fa-plus-circle"></i>
                                       </button>
                                    {/if}
                                    <button class="action-btn danger" on:click={() => removeNotablePerson(person.id)} title="Remove">
                                       <i class="fas fa-trash"></i>
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        {/each}
                        <!-- Add row -->
                        <tr class="add-row">
                           <td colspan="3">
                              <div class="add-person">
                                 <input 
                                    type="text" 
                                    bind:value={newPersonName}
                                    class="text-input small"
                                    placeholder="New person name"
                                    on:keydown={(e) => e.key === 'Enter' && addNotablePerson()}
                                 />
                                 <button class="action-btn primary" on:click={addNotablePerson} title="Add Person">
                                    <i class="fas fa-plus"></i> Add
                                 </button>
                              </div>
                           </td>
                        </tr>
                     </tbody>
                  </table>
                  {#if editedFaction.notablePeople.length === 0}
                     <p class="empty-state">No notable people yet</p>
                  {/if}
               </div>
            </section>
            
            <!-- Territory Section (TERF) -->
            <section class="detail-section">
               <h3><i class="fas fa-map-marked-alt"></i> Territory</h3>
               <div class="territory-grid">
                  <div class="territory-field">
                     <label>Territory</label>
                     <textarea 
                        bind:value={editedFaction.territory.territory}
                        class="textarea-input"
                        placeholder="Geographic holdings..."
                        rows="2"
                     ></textarea>
                  </div>
                  <div class="territory-field">
                     <label>Economy</label>
                     <textarea 
                        bind:value={editedFaction.territory.economy}
                        class="textarea-input"
                        placeholder="Economic resources..."
                        rows="2"
                     ></textarea>
                  </div>
                  <div class="territory-field">
                     <label>Religion</label>
                     <textarea 
                        bind:value={editedFaction.territory.religion}
                        class="textarea-input"
                        placeholder="Religious affiliations..."
                        rows="2"
                     ></textarea>
                  </div>
                  <div class="territory-field">
                     <label>Fame</label>
                     <textarea 
                        bind:value={editedFaction.territory.fame}
                        class="textarea-input"
                        placeholder="Reputation and renown..."
                        rows="2"
                     ></textarea>
                  </div>
               </div>
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
            
            <!-- Quirks Section -->
            <section class="detail-section">
               <h3><i class="fas fa-star"></i> Quirks</h3>
               <textarea 
                  bind:value={editedFaction.quirks}
                  class="textarea-input"
                  placeholder="Unique characteristics, traditions, or idiosyncrasies..."
                  rows="3"
               ></textarea>
            </section>
            
            <!-- Allies Section -->
            <section class="detail-section">
               <h3><i class="fas fa-handshake"></i> Allies</h3>
               <textarea 
                  bind:value={editedFaction.allies}
                  class="textarea-input"
                  placeholder="Friendly factions, comma-separated..."
                  rows="2"
               ></textarea>
            </section>
            
            <!-- Enemies Section -->
            <section class="detail-section">
               <h3><i class="fas fa-skull-crossbones"></i> Enemies</h3>
               <textarea 
                  bind:value={editedFaction.enemies}
                  class="textarea-input"
                  placeholder="Hostile factions, comma-separated..."
                  rows="2"
               ></textarea>
            </section>
            
            <!-- Notes Section -->
            <section class="detail-section">
               <h3><i class="fas fa-sticky-note"></i> Notes</h3>
               <textarea 
                  bind:value={editedFaction.notes}
                  class="textarea-input"
                  placeholder="Additional notes..."
                  rows="3"
               ></textarea>
            </section>
         </div>
      </div>
      
      <!-- Footer Buttons -->
      <div class="detail-footer">
         <Button variant="secondary" on:click={cancel} disabled={isSaving}>
            Cancel
         </Button>
         <Button variant="primary" on:click={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
         </Button>
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
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
      padding: 1rem;
   }
   
   .detail-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      h2 {
         margin: 0;
         color: var(--color-text-dark-primary, #b5b3a4);
         flex: 1;
         text-align: center;
      }
   }
   
   .detail-content {
      flex: 1;
      overflow-y: auto;
   }
   
   .detail-sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
   }
   
   .detail-section {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.375rem;
      padding: 1rem;
      
      h3 {
         margin: 0 0 1rem 0;
         color: var(--color-text-dark-primary, #b5b3a4);
         display: flex;
         align-items: center;
         gap: 0.5rem;
         font-size: 1.1rem;
         
         i {
            color: var(--color-primary, #5e0000);
         }
      }
   }
   
   .image-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
   }
   
   .faction-image {
      max-width: 300px;
      max-height: 300px;
      border-radius: 0.375rem;
      border: 2px solid rgba(255, 255, 255, 0.2);
   }
   
   .no-image {
      width: 300px;
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      border: 2px dashed rgba(255, 255, 255, 0.2);
      border-radius: 0.375rem;
      color: var(--color-text-dark-secondary, #7a7971);
      
      i {
         font-size: 3rem;
         margin-bottom: 0.5rem;
      }
   }
   
   .text-input,
   .textarea-input {
      width: 100%;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      font-family: inherit;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
         border-color: rgba(255, 255, 255, 0.5);
      }
      
      &.large {
         font-size: 1.1rem;
      }
      
      &.small {
         padding: 0.25rem 0.5rem;
      }
   }
   
   .textarea-input {
      resize: vertical;
      min-height: 60px;
      
      &.large {
         min-height: 120px;
      }
   }
   
   .attitude-display {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.25rem;
   }
   
   .attitude-icon-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      
      i {
         font-size: 2rem;
      }
      
      .attitude-label {
         font-size: 0.875rem;
         font-weight: var(--font-weight-semibold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      &.active {
         transform: scale(1.1);
      }
   }
   
   .help-text {
      margin: 0.5rem 0 0 0;
      font-size: 0.875rem;
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
   }
   
   .goal-progress {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      align-items: start;
   }
   
   .goal-input,
   .progress-display {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      
      label {
         font-size: 0.875rem;
         font-weight: var(--font-weight-semibold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .progress-clock {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0.25rem;
   }
   
   .clock-btn {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .clock-value {
      font-weight: var(--font-weight-bold);
      min-width: 4rem;
      text-align: center;
      color: var(--color-text-dark-primary, #b5b3a4);
   }
   
   .people-table {
      width: 100%;
      border-collapse: collapse;
      
      thead {
         background: rgba(0, 0, 0, 0.3);
         
         th {
            padding: 0.5rem;
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-dark-primary, #b5b3a4);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            &.add-row {
               background: rgba(0, 0, 0, 0.2);
            }
         }
         
         td {
            padding: 0.5rem;
            color: var(--color-text-dark-primary, #b5b3a4);
         }
      }
   }
   
   .linked-actor {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      i {
         color: #90ee90;
      }
   }
   
   .no-link {
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
   }
   
   .person-actions {
      display: flex;
      gap: 0.25rem;
   }
   
   .action-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.2s;
      background: rgba(255, 255, 255, 0.1);
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: rgba(255, 255, 255, 0.2);
      }
      
      &.primary {
         background: rgba(144, 238, 144, 0.2);
         color: #90ee90;
         
         &:hover {
            background: rgba(144, 238, 144, 0.3);
         }
      }
      
      &.danger {
         background: rgba(255, 107, 107, 0.2);
         color: #ff6b6b;
         
         &:hover {
            background: rgba(255, 107, 107, 0.3);
         }
      }
   }
   
   .add-person {
      display: flex;
      gap: 0.5rem;
      align-items: center;
   }
   
   .territory-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
   }
   
   .territory-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      
      label {
         font-size: 0.875rem;
         font-weight: var(--font-weight-semibold);
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .detail-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
   }
   
   .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-dark-secondary, #7a7971);
      font-style: italic;
   }
   
   .error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-text-dark-secondary, #7a7971);
      
      i {
         font-size: 3rem;
         margin-bottom: 1rem;
         color: #ff6b6b;
      }
   }
</style>
