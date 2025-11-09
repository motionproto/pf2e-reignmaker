<script lang="ts">
   import { kingdomData } from '../../../../stores/KingdomStore';
   
   export let values: string[] = [];
   export let placeholder: string = 'Add item...';
   export let excludeValues: string[] = [];
   export let onChange: (newValues: string[]) => void;
   
   let isDropdownOpen = false;
   let textInput = '';
   let dropdownRef: HTMLDivElement | null = null;
   
   // Get all factions from kingdom data
   $: allFactions = $kingdomData.factions?.map(f => f.name) || [];
   
   // Filter out factions already in values or excludeValues
   $: availableFactions = allFactions.filter(name => 
      !values.includes(name) && !excludeValues.includes(name)
   );
   
   function toggleDropdown() {
      isDropdownOpen = !isDropdownOpen;
      if (isDropdownOpen) {
         textInput = '';
      }
   }
   
   function selectFaction(factionName: string) {
      const newValues = [...values, factionName];
      onChange(newValues);
      isDropdownOpen = false;
      textInput = '';
   }
   
   function removeToken(index: number) {
      const newValues = values.filter((_, i) => i !== index);
      onChange(newValues);
   }
   
   function handleTextInputKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter' && textInput.trim()) {
         event.preventDefault();
         const trimmedInput = textInput.trim();
         if (!values.includes(trimmedInput)) {
            const newValues = [...values, trimmedInput];
            onChange(newValues);
         }
         textInput = '';
         isDropdownOpen = false;
      } else if (event.key === 'Escape') {
         isDropdownOpen = false;
         textInput = '';
      }
   }
   
   // Close dropdown when clicking outside
   function handleClickOutside(event: MouseEvent) {
      if (isDropdownOpen && dropdownRef && !dropdownRef.contains(event.target as Node)) {
         isDropdownOpen = false;
         textInput = '';
      }
   }
   
   // Setup/cleanup click outside listener
   $: if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
   } else {
      document.removeEventListener('mousedown', handleClickOutside);
   }
</script>

<div class="faction-token-input" bind:this={dropdownRef}>
   <!-- Token Display -->
   <div class="tokens-container">
      {#each values as value, index}
         <div class="token">
            <span class="token-text">{value}</span>
            <button 
               class="token-remove" 
               on:click={() => removeToken(index)}
               title="Remove"
            >
               <i class="fas fa-times"></i>
            </button>
         </div>
      {/each}
      
      <!-- Add Button -->
      <button 
         class="add-token-btn" 
         on:click={toggleDropdown}
         title="Add faction"
      >
         <i class="fas fa-plus"></i>
      </button>
   </div>
   
   <!-- Dropdown Menu -->
   {#if isDropdownOpen}
      <div class="dropdown-menu">
         <!-- Text Input for Custom Entry -->
         <div class="dropdown-input-section">
            <input 
               type="text" 
               bind:value={textInput}
               on:keydown={handleTextInputKeydown}
               class="dropdown-text-input"
               placeholder={placeholder}
               autofocus
            />
            <span class="input-hint">Press Enter to add</span>
         </div>
         
         <!-- Faction Selection -->
         {#if availableFactions.length > 0}
            <div class="dropdown-divider"></div>
            <div class="dropdown-section-header">Select from Factions</div>
            <div class="dropdown-items">
               {#each availableFactions as factionName}
                  <button 
                     class="dropdown-item"
                     on:click={() => selectFaction(factionName)}
                  >
                     {factionName}
                  </button>
               {/each}
            </div>
         {:else}
            <div class="dropdown-divider"></div>
            <div class="dropdown-empty">No available factions</div>
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .faction-token-input {
      position: relative;
      width: 100%;
   }
   
   .tokens-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-8);
      align-items: center;
      min-height: 2.5rem;
   }
   
   .token {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      background: rgba(100, 149, 237, 0.2);
      border: 1px solid var(--border-info);
      border-radius: var(--radius-lg);
      padding: var(--space-6) var(--space-12);
      color: var(--text-primary);
      font-size: var(--font-sm);
      transition: all 0.2s;
      
      &:hover {
         background: rgba(100, 149, 237, 0.3);
         border-color: var(--border-info-medium);
      }
   }
   
   .token-text {
      white-space: nowrap;
   }
   
   .token-remove {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: var(--font-xs);
      
      &:hover {
         color: var(--color-danger);
         transform: scale(1.2);
      }
   }
   
   .add-token-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         background: rgba(100, 149, 237, 0.2);
         border-color: var(--border-info);
         color: var(--text-primary);
      }
   }
   
   .dropdown-menu {
      position: absolute;
      top: calc(100% + var(--space-8));
      left: 0;
      width: 100%;
      max-width: 25rem;
      max-height: 18.75rem;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-lg);
      box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.5);
      z-index: 1000;
      padding: var(--space-8);
   }
   
   .dropdown-input-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
   }
   
   .dropdown-text-input {
      width: 100%;
      padding: var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-sm);
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
         border-color: var(--border-info-medium);
      }
      
      &::placeholder {
         color: var(--text-tertiary);
         font-style: italic;
      }
   }
   
   .input-hint {
      font-size: var(--font-xs);
      color: var(--text-tertiary);
      font-style: italic;
      padding: 0 var(--space-4);
   }
   
   .dropdown-divider {
      height: 0.0625rem;
      background: rgba(255, 255, 255, 0.1);
      margin: var(--space-8) 0;
   }
   
   .dropdown-section-header {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      text-transform: uppercase;
      padding: var(--space-8) var(--space-8) var(--space-4);
   }
   
   .dropdown-items {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
   }
   
   .dropdown-item {
      display: block;
      width: 100%;
      padding: var(--space-8);
      text-align: left;
      background: transparent;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      transition: all 0.2s;
      
      &:hover {
         background: rgba(100, 149, 237, 0.2);
      }
   }
   
   .dropdown-empty {
      padding: var(--space-16);
      text-align: center;
      color: var(--text-tertiary);
      font-style: italic;
      font-size: var(--font-sm);
   }
</style>
