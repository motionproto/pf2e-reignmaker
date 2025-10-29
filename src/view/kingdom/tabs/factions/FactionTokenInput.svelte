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
      gap: 0.5rem;
      align-items: center;
      min-height: 2.5rem;
   }
   
   .token {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(100, 149, 237, 0.2);
      border: 1px solid rgba(100, 149, 237, 0.4);
      border-radius: 0.375rem;
      padding: 0.375rem 0.75rem;
      color: var(--text-primary);
      font-size: var(--font-sm);
      transition: all 0.2s;
      
      &:hover {
         background: rgba(100, 149, 237, 0.3);
         border-color: rgba(100, 149, 237, 0.6);
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
      font-size: 0.75rem;
      
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
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.375rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         background: rgba(100, 149, 237, 0.2);
         border-color: rgba(100, 149, 237, 0.4);
         color: var(--text-primary);
      }
   }
   
   .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      width: 100%;
      max-width: 400px;
      max-height: 300px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.375rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      padding: 0.5rem;
   }
   
   .dropdown-input-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
   }
   
   .dropdown-text-input {
      width: 100%;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--text-primary);
      font-size: var(--font-sm);
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
         border-color: rgba(100, 149, 237, 0.6);
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
      padding: 0 0.25rem;
   }
   
   .dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 0.5rem 0;
   }
   
   .dropdown-section-header {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      text-transform: uppercase;
      padding: 0.5rem 0.5rem 0.25rem;
   }
   
   .dropdown-items {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
   }
   
   .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.5rem;
      text-align: left;
      background: transparent;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      border-radius: 0.25rem;
      font-size: var(--font-sm);
      transition: all 0.2s;
      
      &:hover {
         background: rgba(100, 149, 237, 0.2);
      }
   }
   
   .dropdown-empty {
      padding: 1rem;
      text-align: center;
      color: var(--text-tertiary);
      font-style: italic;
      font-size: var(--font-sm);
   }
</style>
