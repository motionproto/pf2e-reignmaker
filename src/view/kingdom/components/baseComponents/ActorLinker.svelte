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
      gap: var(--space-4);
      align-items: center;
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
      gap: var(--space-4);
      align-items: center;
      flex: 1;
      
      .autosuggest-input {
         flex: 1;
         padding: var(--space-4) var(--space-8);
         background: rgba(0, 0, 0, 0.3);
         border: 0.0625rem solid rgba(255, 255, 255, 0.3);
         border-radius: var(--radius-md);
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
         max-height: 12.5000rem;
         overflow-y: scroll;
         background: rgba(0, 0, 0, 0.95);
         border: 0.0625rem solid rgba(255, 255, 255, 0.3);
         border-radius: var(--radius-md);
         margin-top: var(--space-4);
         z-index: 10000;
         box-shadow: 0 0.2500rem 0.5000rem rgba(0, 0, 0, 0.3);
         
         .suggestion-group {
            .group-header {
               padding: var(--space-8);
               font-size: var(--font-xs);
               font-weight: var(--font-weight-semibold, 600);
               color: var(--color-text-dark-secondary, #7a7971);
               text-transform: uppercase;
               background: rgba(0, 0, 0, 0.3);
               border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
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
</style>
