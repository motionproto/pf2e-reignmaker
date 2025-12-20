<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import type { NotablePerson } from '../../../models/Faction';
   import RemoveNotablePersonDialog from './RemoveNotablePersonDialog.svelte';
   import { getAvailableActors, filterActors, groupActorsByType, getActorName as getActorNameUtil } from '../logic/actorLinkingLogic';
   import { logger } from '../../../utils/Logger';

   // Props
   export let notablePeople: NotablePerson[] = [];
   export let entityName: string; // Name of the faction/settlement for dialog display
   export let createActorAction: string = 'createFactionActor'; // ActionDispatcher action name

   const dispatch = createEventDispatcher<{
      update: { notablePeople: NotablePerson[] };
   }>();

   // Local state for notable people management
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
      if (!newPersonName.trim()) return;
      createActorAndAdd(newPersonName.trim());
      isAddingNew = false;
      newPersonName = '';
   }

   function cancelAddPerson() {
      isAddingNew = false;
      newPersonName = '';
   }

   async function createActorAndAdd(name: string) {
      try {
         // Route through GM via ActionDispatcher
         const { actionDispatcher } = await import('../../../services/ActionDispatcher');

         if (!actionDispatcher.isAvailable()) {
            throw new Error('Action dispatcher not initialized. Please reload the game.');
         }

         const actor = await actionDispatcher.dispatch(createActorAction, { name });

         if (actor) {
            const newPerson: NotablePerson = {
               id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
               name: name,
               actorId: actor.id
            };

            const updatedPeople = [...notablePeople, newPerson];
            dispatch('update', { notablePeople: updatedPeople });
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
      const person = notablePeople.find(p => p.id === personId);
      if (!person) return;

      removingPerson = person;
      showRemoveDialog = true;
   }

   async function handleRemoveConfirm(event: CustomEvent<{ deleteActor: boolean }>) {
      if (!removingPerson) return;

      const { deleteActor } = event.detail;
      const personName = removingPerson.name;
      const actorId = removingPerson.actorId;

      // Remove from list
      const updatedPeople = notablePeople.filter(p => p.id !== removingPerson?.id);
      dispatch('update', { notablePeople: updatedPeople });

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

         const updatedPeople = [...notablePeople, newPerson];
         dispatch('update', { notablePeople: updatedPeople });
      } else {
         // Linking to existing person - update both actorId and name
         const person = notablePeople.find(p => p.id === personId);
         if (person) {
            person.actorId = actorId;
            person.name = actorName;
            dispatch('update', { notablePeople: [...notablePeople] });
         }
      }

      cancelLinking();
   }

   // Use shared actor linking logic
   $: availableActors = getAvailableActors();
   $: filteredActors = linkingPersonId ? filterActors(availableActors, actorSearchTerm) : [];
   $: groupedActors = groupActorsByType(filteredActors);

   async function createActorForPerson(personId: string) {
      const person = notablePeople.find(p => p.id === personId);
      if (!person) return;

      try {
         // Route through GM via ActionDispatcher
         const { actionDispatcher } = await import('../../../services/ActionDispatcher');

         if (!actionDispatcher.isAvailable()) {
            throw new Error('Action dispatcher not initialized. Please reload the game.');
         }

         const actor = await actionDispatcher.dispatch(createActorAction, { name: person.name });

         if (actor) {
            person.actorId = actor.id;
            dispatch('update', { notablePeople: [...notablePeople] });
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
      const person = notablePeople.find(p => p.id === personId);
      if (person) {
         person.actorId = undefined;
         dispatch('update', { notablePeople: [...notablePeople] });
      }
   }

   function getActorName(actorId: string): string {
      return getActorNameUtil(actorId);
   }

   function openPersonActorSheet(actorId: string | undefined) {
      if (!actorId) return;
      const actor = (globalThis as any).game?.actors?.get(actorId);
      if (actor) actor.sheet.render(true);
   }
</script>

<!-- Remove Notable Person Dialog -->
{#if removingPerson}
   <RemoveNotablePersonDialog
      bind:show={showRemoveDialog}
      personName={removingPerson.name}
      factionName={entityName}
      hasLinkedActor={!!removingPerson.actorId}
      on:confirm={handleRemoveConfirm}
      on:cancel={handleRemoveCancel}
   />
{/if}

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
            {#each notablePeople as person}
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

<style lang="scss">
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

   .text-input {
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
