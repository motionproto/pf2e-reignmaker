<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="tw-h-full tw-flex tw-flex-col">
   <div class="tw-mb-4">
      <h2 class="tw-text-2xl tw-font-bold tw-text-base-content tw-mb-2">Factions</h2>
      <p class="tw-text-base-content/60">Track faction relationships, loyalty, and influence across your kingdom</p>
   </div>
   
   <!-- Placeholder Content -->
   <div class="tw-flex-1 tw-overflow-y-auto">
      <div class="tw-alert tw-alert-info">
         <i class="fas fa-info-circle"></i>
         <div>
            <h3 class="tw-font-bold">Coming Soon</h3>
            <div class="tw-text-xs">Faction management features will be available in a future update.</div>
         </div>
      </div>
      
      <!-- Feature Preview -->
      <div class="tw-card tw-bg-base-200 tw-mt-4">
         <div class="tw-card-body">
            <h3 class="tw-card-title tw-text-lg">Faction Management Features</h3>
            <p class="tw-text-sm tw-text-base-content/70 tw-mb-3">
               Once implemented, you'll be able to:
            </p>
            
            <div class="tw-grid tw-gap-3 md:tw-grid-cols-2">
               <div class="tw-card tw-bg-base-300 tw-card-compact">
                  <div class="tw-card-body">
                     <h4 class="tw-font-semibold tw-flex tw-items-center tw-gap-2">
                        <i class="fas fa-handshake tw-text-primary"></i>
                        Diplomacy
                     </h4>
                     <p class="tw-text-xs tw-text-base-content/60">
                        Manage relationships with noble houses, guilds, and foreign powers
                     </p>
                  </div>
               </div>
               
               <div class="tw-card tw-bg-base-300 tw-card-compact">
                  <div class="tw-card-body">
                     <h4 class="tw-font-semibold tw-flex tw-items-center tw-gap-2">
                        <i class="fas fa-crown tw-text-warning"></i>
                        Loyalty
                     </h4>
                     <p class="tw-text-xs tw-text-base-content/60">
                        Track faction loyalty and manage potential rebellions
                     </p>
                  </div>
               </div>
               
               <div class="tw-card tw-bg-base-300 tw-card-compact">
                  <div class="tw-card-body">
                     <h4 class="tw-font-semibold tw-flex tw-items-center tw-gap-2">
                        <i class="fas fa-balance-scale tw-text-info"></i>
                        Influence
                     </h4>
                     <p class="tw-text-xs tw-text-base-content/60">
                        Leverage faction influence for kingdom benefits
                     </p>
                  </div>
               </div>
               
               <div class="tw-card tw-bg-base-300 tw-card-compact">
                  <div class="tw-card-body">
                     <h4 class="tw-font-semibold tw-flex tw-items-center tw-gap-2">
                        <i class="fas fa-scroll tw-text-secondary"></i>
                        Treaties
                     </h4>
                     <p class="tw-text-xs tw-text-base-content/60">
                        Negotiate treaties and trade agreements
                     </p>
                  </div>
               </div>
            </div>
            
            <div class="tw-divider"></div>
            
            <div class="tw-stats tw-shadow tw-bg-base-100">
               <div class="tw-stat">
                  <div class="tw-stat-title">Active Factions</div>
                  <div class="tw-stat-value tw-text-2xl">0</div>
                  <div class="tw-stat-desc">No factions established</div>
               </div>
               <div class="tw-stat">
                  <div class="tw-stat-title">Average Loyalty</div>
                  <div class="tw-stat-value tw-text-2xl">--</div>
                  <div class="tw-stat-desc">Requires active factions</div>
               </div>
               <div class="tw-stat">
                  <div class="tw-stat-title">Total Influence</div>
                  <div class="tw-stat-value tw-text-2xl">0</div>
                  <div class="tw-stat-desc">Build influence over time</div>
               </div>
            </div>
         </div>
      </div>
   </div>
</div>
