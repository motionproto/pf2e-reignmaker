<script lang="ts">
   import { createEventDispatcher, onMount } from 'svelte';
   
   const dispatch = createEventDispatcher();
   
   // Display state (from parent)
   export let linkedActorName: string | undefined = undefined;
   export let isLinking: boolean = false;
   
   // Actor data (computed by parent using actorLinkingLogic)
   export let filteredActors: any[] = [];
   export let groupedActors: { characters: any[], npcs: any[] } = { characters: [], npcs: [] };
   
   // Search state (managed by parent)
   export let searchTerm: string = '';
   
   // Optional features
   export let showDeleteButton: boolean = false;
   
   // Callbacks (all business logic in parent)
   export let onLink: (actorId: string) => Promise<void>;
   export let onCreate: () => Promise<void>;
   export let onUnlink: () => Promise<void>;
   export let onDelete: (() => Promise<void>) | undefined = undefined;
   export let onStartLinking: () => void;
   export let onCancelLinking: () => void;
   export let onSearchChange: (term: string) => void;
   
   // Focus management
   let searchInputRef: HTMLInputElement | null = null;
   
   onMount(() => {
      if (isLinking && searchInputRef) {
         searchInputRef.focus();
      }
   });
   
   // Auto-focus when linking state changes
   $: if (isLinking && searchInputRef) {
      setTimeout(() => searchInputRef?.focus(), 10);
   }
   
   // Handle actor selection
   async function handleActorSelect(actorId: string) {
      await onLink(actorId);
   }
</script>

<div class="actor-linking-actions">
   {#if isLinking}
      <!-- Linking mode: Actor search autosuggest -->
      <div class="actor-autosuggest">
         <input 
            type="text" 
            bind:value={searchTerm}
            bind:this={searchInputRef}
            on:input={(e) => onSearchChange(e.currentTarget.value)}
            placeholder="Search actors..."
            class="autosuggest-input"
         />
         
         <div class="suggestions-dropdown">
            {#if filteredActors.length > 0}
               {#if groupedActors.characters.length > 0}
                  <div class="suggestion-group">
                     <div class="group-header">Characters ({groupedActors.characters.length})</div>
                     {#each groupedActors.characters as actor}
                        <button 
                           class="suggestion-item"
                           on:click={() => handleActorSelect(actor.id)}
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
                           on:click={() => handleActorSelect(actor.id)}
                        >
                           {actor.name}
                        </button>
                     {/each}
                  </div>
               {/if}
            {:else}
               <div class="no-results">
                  {searchTerm.trim() ? 'No actors found' : 'No actors available'}
               </div>
            {/if}
         </div>
         
         <button class="action-btn" on:click={onCancelLinking} title="Cancel">
            <i class="fas fa-times"></i>
         </button>
      </div>
   {:else if linkedActorName}
      <!-- Linked: Show unlink button -->
      <button 
         class="action-btn" 
         on:click={onUnlink}
         title="Unlink actor"
      >
         <i class="fas fa-unlink"></i>
      </button>
   {:else}
      <!-- Not linked: Show link + create buttons -->
      <button 
         class="action-btn" 
         on:click={onStartLinking}
         title="Link existing actor"
      >
         <i class="fas fa-link"></i>
      </button>
      <button 
         class="action-btn primary" 
         on:click={onCreate}
         title="Create new actor"
      >
         <i class="fas fa-plus"></i>
      </button>
   {/if}
   
   <!-- Optional delete button -->
   {#if showDeleteButton && onDelete}
      <button 
         class="action-btn delete" 
         on:click={onDelete}
         title="Delete"
      >
         <i class="fas fa-trash"></i>
      </button>
   {/if}
</div>

<style lang="scss">
   .actor-linking-actions {
      display: flex;
      gap: 0.25rem;
      align-items: center;
   }
   
   .action-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
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
      
      &.delete {
         color: #ff6b6b;
         
         &:hover {
            background: rgba(255, 107, 107, 0.1);
         }
      }
   }
   
   /* Actor Autosuggest */
   .actor-autosuggest {
      position: relative;
      display: flex;
      gap: 0.25rem;
      align-items: center;
      flex: 1;
      
      .autosuggest-input {
         flex: 1;
         padding: 0.25rem 0.5rem;
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid rgba(255, 255, 255, 0.3);
         border-radius: 0.25rem;
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            background: rgba(0, 0, 0, 0.5);
            border-color: rgba(255, 255, 255, 0.5);
         }
      }
      
      .suggestions-dropdown {
         position: absolute;
         top: 100%;
         left: 0;
         width: 50%;
         max-height: 200px;
         overflow-y: scroll;
         background: rgba(0, 0, 0, 0.95);
         border: 1px solid rgba(255, 255, 255, 0.3);
         border-radius: 0.25rem;
         margin-top: 0.25rem;
         z-index: 10000;
         box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
         
         .suggestion-group {
            .group-header {
               padding: 0.5rem;
               font-size: 0.75rem;
               font-weight: var(--font-weight-semibold, 600);
               color: var(--color-text-dark-secondary, #7a7971);
               text-transform: uppercase;
               background: rgba(0, 0, 0, 0.3);
               border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
         }
         
         .suggestion-item {
            display: block;
            width: 100%;
            padding: 0.5rem;
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
            padding: 1rem;
            text-align: center;
            color: var(--color-text-dark-secondary, #7a7971);
            font-style: italic;
         }
      }
   }
</style>
