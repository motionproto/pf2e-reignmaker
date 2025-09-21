<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import type { KingdomState } from '../../../models/KingdomState';
   
   // Kingdom name state
   let isEditingName = false;
   let kingdomName = localStorage.getItem('kingdomName') || 'Kingdom Name';
   let editNameInput = kingdomName;
   
   // Save kingdom name
   function saveKingdomName() {
      if (editNameInput.trim()) {
         kingdomName = editNameInput.trim();
         localStorage.setItem('kingdomName', kingdomName);
      }
      isEditingName = false;
   }
   
   // Cancel name editing
   function cancelEditName() {
      editNameInput = kingdomName;
      isEditingName = false;
   }
   
   // Fame adjustment
   function adjustFame(delta: number) {
      const newFame = $kingdomState.fame + delta;
      if (newFame >= 0 && newFame <= 3) {
         $kingdomState.fame = newFame;
      }
   }
   
   // War status
   $: isAtWar = $kingdomState.isAtWar || false;
   
   function toggleWarStatus() {
      $kingdomState.isAtWar = !$kingdomState.isAtWar;
      localStorage.setItem('kingdomWarStatus', $kingdomState.isAtWar ? 'war' : 'peace');
   }
   
   // Calculate unrest sources
   $: sizeUnrest = Math.floor($kingdomState.size / 8);
   $: warUnrest = isAtWar ? 1 : 0;
   $: structureBonus = 0; // TODO: Calculate from actual structures
   $: unrestPerTurn = Math.max(0, sizeUnrest + warUnrest - structureBonus);
   
   // Calculate production (simplified for now)
   $: foodProduction = $kingdomState.worksiteCount.get('farmlands') || 0;
   $: lumberProduction = $kingdomState.worksiteCount.get('lumberCamps') || 0;
   $: stoneProduction = $kingdomState.worksiteCount.get('quarries') || 0;
   $: oreProduction = $kingdomState.worksiteCount.get('mines') || 0;
   
   // Total worksites
   $: totalWorksites = foodProduction + lumberProduction + stoneProduction + oreProduction;
</script>

<div class="tw-flex tw-flex-col tw-h-full">
   <!-- Kingdom Name Header -->
   <div class="tw-bg-primary tw-p-3 tw-rounded-t">
      {#if !isEditingName}
         <div class="tw-flex tw-items-center tw-justify-between">
            <h3 class="tw-text-primary-content tw-text-xl tw-font-modesto tw-m-0">{kingdomName}</h3>
            <button 
               class="tw-btn tw-btn-ghost tw-btn-sm tw-btn-circle"
               on:click={() => isEditingName = true}
               title="Edit kingdom name"
            >
               <i class="fa-solid fa-pen-fancy tw-text-primary-content"></i>
            </button>
         </div>
      {:else}
         <input
            bind:value={editNameInput}
            on:keydown={(e) => {
               if (e.key === 'Enter') saveKingdomName();
               if (e.key === 'Escape') cancelEditName();
            }}
            on:blur={saveKingdomName}
            class="tw-input tw-input-bordered tw-input-sm tw-w-full tw-bg-base-100 tw-text-base-content"
         />
      {/if}
   </div>
   
   <div class="tw-flex-1 tw-overflow-y-auto tw-p-3 tw-space-y-3">
      
      <!-- Core Trackers -->
      <div class="tw-card tw-bg-base-300 tw-card-compact">
         <div class="tw-card-body">
            <h4 class="tw-card-title tw-text-sm tw-border-b tw-border-secondary tw-pb-2">Turn {$kingdomState.currentTurn}</h4>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">Fame:</span>
               <div class="tw-join">
                  <button 
                     class="tw-btn tw-btn-xs tw-join-item" 
                     on:click={() => adjustFame(-1)}
                     disabled={$kingdomState.fame <= 0}
                  >
                     <i class="fas fa-minus"></i>
                  </button>
                  <div class="tw-join-item tw-px-3 tw-bg-base-200 tw-flex tw-items-center">
                     <span class="tw-font-bold">{$kingdomState.fame}</span>
                  </div>
                  <button 
                     class="tw-btn tw-btn-xs tw-join-item" 
                     on:click={() => adjustFame(1)}
                     disabled={$kingdomState.fame >= 3}
                  >
                     <i class="fas fa-plus"></i>
                  </button>
               </div>
            </div>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">Gold:</span>
               <span class="tw-badge tw-badge-lg tw-badge-warning">{$kingdomState.resources.get('gold') || 0}</span>
            </div>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">War Status:</span>
               <select 
                  class="tw-select tw-select-bordered tw-select-xs tw-max-w-xs" 
                  on:change={toggleWarStatus} 
                  value={isAtWar ? 'war' : 'peace'}
               >
                  <option value="peace">Peace</option>
                  <option value="war">War</option>
               </select>
            </div>
         </div>
      </div>
      
      <!-- Unrest -->
      <div class="tw-card tw-bg-base-300 tw-card-compact">
         <div class="tw-card-body">
            <h4 class="tw-card-title tw-text-sm tw-border-b tw-border-secondary tw-pb-2">Unrest</h4>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">Current Unrest:</span>
               <span class="tw-badge {$kingdomState.unrest > 5 ? 'tw-badge-error' : 'tw-badge-neutral'}">
                  {$kingdomState.unrest}
               </span>
            </div>
            
            {#if $kingdomState.imprisonedUnrest > 0}
               <div class="tw-stat-custom">
                  <span class="tw-text-sm">Imprisoned:</span>
                  <span class="tw-badge tw-badge-ghost">{$kingdomState.imprisonedUnrest}</span>
               </div>
            {/if}
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">From Size:</span>
               <span class="tw-text-warning">+{sizeUnrest}</span>
            </div>
            
            {#if isAtWar}
               <div class="tw-stat-custom">
                  <span class="tw-text-sm">From War:</span>
                  <span class="tw-text-error">+{warUnrest}</span>
               </div>
            {/if}
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">Structure Bonus:</span>
               <span class="tw-text-success">-{structureBonus}</span>
            </div>
            
            <div class="tw-divider tw-my-2"></div>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm tw-font-bold">Per Turn:</span>
               <span class="tw-badge {unrestPerTurn > 0 ? 'tw-badge-error' : unrestPerTurn < 0 ? 'tw-badge-success' : 'tw-badge-neutral'}">
                  {unrestPerTurn >= 0 ? '+' : ''}{unrestPerTurn}
               </span>
            </div>
         </div>
      </div>
      
      <!-- Kingdom Size -->
      <div class="tw-card tw-bg-base-300 tw-card-compact">
         <div class="tw-card-body">
            <h4 class="tw-card-title tw-text-sm tw-border-b tw-border-secondary tw-pb-2">Kingdom Size</h4>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">Hexes Claimed:</span>
               <span class="tw-badge tw-badge-info">{$kingdomState.size}</span>
            </div>
            
            <div class="tw-stat-custom">
               <span class="tw-text-sm">Total Settlements:</span>
               <span class="tw-font-bold">{$kingdomState.settlements.length}</span>
            </div>
            
            <div class="tw-divider tw-my-1"></div>
            
            <div class="tw-grid tw-grid-cols-2 tw-gap-2">
               <div class="tw-stat-custom">
                  <span class="tw-text-xs">Villages:</span>
                  <span class="tw-text-sm tw-font-semibold">{$kingdomState.settlements.filter(s => s.tier === 'Village').length}</span>
               </div>
               <div class="tw-stat-custom">
                  <span class="tw-text-xs">Towns:</span>
                  <span class="tw-text-sm tw-font-semibold">{$kingdomState.settlements.filter(s => s.tier === 'Town').length}</span>
               </div>
               <div class="tw-stat-custom">
                  <span class="tw-text-xs">Cities:</span>
                  <span class="tw-text-sm tw-font-semibold">{$kingdomState.settlements.filter(s => s.tier === 'City').length}</span>
               </div>
               <div class="tw-stat-custom">
                  <span class="tw-text-xs">Metropolises:</span>
                  <span class="tw-text-sm tw-font-semibold">{$kingdomState.settlements.filter(s => s.tier === 'Metropolis').length}</span>
               </div>
            </div>
         </div>
      </div>
      
      <!-- Resources -->
      <div class="tw-card tw-bg-base-300 tw-card-compact">
         <div class="tw-card-body">
            <h4 class="tw-card-title tw-text-sm tw-border-b tw-border-secondary tw-pb-2">Resources</h4>
            
            <!-- Food Section -->
            <div class="tw-alert tw-alert-info tw-py-2">
               <div class="tw-w-full">
                  <div class="tw-font-bold tw-text-sm tw-mb-2">Food</div>
                  <div class="tw-space-y-1">
                     <div class="tw-stat-custom">
                        <span class="tw-text-xs">Current:</span>
                        <span class="tw-badge tw-badge-sm">{$kingdomState.resources.get('food') || 0}</span>
                     </div>
                     <div class="tw-stat-custom">
                        <span class="tw-text-xs">Farmlands:</span>
                        <span class="tw-text-sm">{foodProduction}</span>
                     </div>
                     <div class="tw-stat-custom">
                        <span class="tw-text-xs">Production:</span>
                        <span class="tw-text-sm tw-text-success">{foodProduction * 2}/turn</span>
                     </div>
                  </div>
               </div>
            </div>
            
            <!-- Resource Income -->
            <div class="tw-mt-3">
               <div class="tw-font-bold tw-text-sm tw-mb-2">Resource Income</div>
               <div class="tw-grid tw-grid-cols-3 tw-gap-2">
                  <div class="tw-card tw-bg-base-200 tw-text-center tw-py-2">
                     <div class="tw-text-xs tw-text-base-content/70">Lumber</div>
                     <div class="tw-font-bold">{$kingdomState.resources.get('lumber') || 0}</div>
                  </div>
                  <div class="tw-card tw-bg-base-200 tw-text-center tw-py-2">
                     <div class="tw-text-xs tw-text-base-content/70">Stone</div>
                     <div class="tw-font-bold">{$kingdomState.resources.get('stone') || 0}</div>
                  </div>
                  <div class="tw-card tw-bg-base-200 tw-text-center tw-py-2">
                     <div class="tw-text-xs tw-text-base-content/70">Ore</div>
                     <div class="tw-font-bold">{$kingdomState.resources.get('ore') || 0}</div>
                  </div>
               </div>
               
               <div class="tw-stat-custom tw-mt-2">
                  <span class="tw-text-sm">Total Worksites:</span>
                  <span class="tw-badge tw-badge-primary">{totalWorksites}</span>
               </div>
            </div>
         </div>
      </div>
      
   </div>
</div>
