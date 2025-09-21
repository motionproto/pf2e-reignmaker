<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="tw-h-full tw-flex tw-flex-col">
   <div class="tw-mb-4">
      <h2 class="tw-text-2xl tw-font-bold tw-text-base-content tw-mb-2">Settlements</h2>
      <p class="tw-text-base-content/60">Manage your kingdom's settlements and infrastructure</p>
   </div>
   
   <!-- Settlements List -->
   <div class="tw-flex-1 tw-overflow-y-auto">
      {#if $kingdomState.settlements.length > 0}
         <div class="tw-grid tw-gap-4 tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3">
            {#each $kingdomState.settlements as settlement}
               <div class="tw-card tw-bg-base-200 tw-card-compact tw-shadow-lg tw-hover:shadow-xl tw-transition-shadow">
                  <div class="tw-card-body">
                     <h3 class="tw-card-title tw-text-primary">{settlement.name}</h3>
                     
                     <div class="tw-flex tw-flex-col tw-gap-2">
                        <div class="tw-badge tw-badge-lg tw-badge-secondary">
                           {settlement.tier}
                        </div>
                        
                        <div class="tw-stats tw-stats-vertical tw-shadow tw-bg-base-300">
                           <div class="tw-stat tw-py-2">
                              <div class="tw-stat-title tw-text-xs">Population</div>
                              <div class="tw-stat-value tw-text-sm">--</div>
                           </div>
                           <div class="tw-stat tw-py-2">
                              <div class="tw-stat-title tw-text-xs">Buildings</div>
                              <div class="tw-stat-value tw-text-sm">0</div>
                           </div>
                        </div>
                     </div>
                     
                     <div class="tw-card-actions tw-justify-end tw-mt-2">
                        <button class="tw-btn tw-btn-sm tw-btn-ghost">
                           <i class="fas fa-edit"></i>
                           Manage
                        </button>
                     </div>
                  </div>
               </div>
            {/each}
         </div>
      {:else}
         <div class="tw-alert tw-alert-info">
            <i class="fas fa-info-circle"></i>
            <div>
               <h3 class="tw-font-bold">No Settlements Yet</h3>
               <div class="tw-text-xs">Establish your first settlement to begin building your kingdom's infrastructure.</div>
            </div>
         </div>
         
         <div class="tw-card tw-bg-base-200 tw-mt-4">
            <div class="tw-card-body">
               <h3 class="tw-card-title tw-text-lg">Getting Started</h3>
               <p class="tw-text-sm tw-text-base-content/70">
                  Settlements are the heart of your kingdom. They provide:
               </p>
               <ul class="tw-list-disc tw-list-inside tw-text-sm tw-text-base-content/60 tw-space-y-1 tw-mt-2">
                  <li>Resource production through buildings</li>
                  <li>Population growth and workforce</li>
                  <li>Defense against threats</li>
                  <li>Trade and commerce opportunities</li>
               </ul>
               
               <div class="tw-card-actions tw-justify-end tw-mt-4">
                  <button class="tw-btn tw-btn-primary tw-btn-sm">
                     <i class="fas fa-plus"></i>
                     Found Settlement
                  </button>
               </div>
            </div>
         </div>
      {/if}
   </div>
   
   <!-- Summary Stats -->
   {#if $kingdomState.settlements.length > 0}
      <div class="tw-divider"></div>
      <div class="tw-stats tw-shadow tw-bg-base-300 tw-w-full">
         <div class="tw-stat">
            <div class="tw-stat-title">Total Settlements</div>
            <div class="tw-stat-value tw-text-2xl">{$kingdomState.settlements.length}</div>
         </div>
         <div class="tw-stat">
            <div class="tw-stat-title">Villages</div>
            <div class="tw-stat-value tw-text-2xl">
               {$kingdomState.settlements.filter(s => s.tier === 'Village').length}
            </div>
         </div>
         <div class="tw-stat">
            <div class="tw-stat-title">Towns</div>
            <div class="tw-stat-value tw-text-2xl">
               {$kingdomState.settlements.filter(s => s.tier === 'Town').length}
            </div>
         </div>
         <div class="tw-stat">
            <div class="tw-stat-title">Cities</div>
            <div class="tw-stat-value tw-text-2xl">
               {$kingdomState.settlements.filter(s => s.tier === 'City').length}
            </div>
         </div>
      </div>
   {/if}
</div>
