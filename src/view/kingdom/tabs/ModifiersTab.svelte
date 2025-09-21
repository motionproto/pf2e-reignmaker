<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
</script>

<div class="tw-h-full tw-flex tw-flex-col">
   <div class="tw-mb-4">
      <h2 class="tw-text-2xl tw-font-bold tw-text-base-content tw-mb-2">Modifiers</h2>
      <p class="tw-text-base-content/60">Active kingdom modifiers, bonuses, and ongoing effects</p>
   </div>
   
   <!-- Modifiers List -->
   <div class="tw-flex-1 tw-overflow-y-auto">
      {#if $kingdomState.ongoingModifiers.length > 0}
         <div class="tw-grid tw-gap-3">
            {#each $kingdomState.ongoingModifiers as modifier}
               <div class="tw-card tw-bg-base-200 tw-card-compact tw-shadow-md">
                  <div class="tw-card-body">
                     <div class="tw-flex tw-justify-between tw-items-start">
                        <div>
                           <h4 class="tw-card-title tw-text-lg tw-text-primary">{modifier.name}</h4>
                           <p class="tw-text-sm tw-text-base-content/70 tw-mt-1">{modifier.description}</p>
                        </div>
                        
                        {#if modifier.duration > 0}
                           <div class="tw-badge tw-badge-secondary tw-badge-lg">
                              {modifier.remainingTurns} turns
                           </div>
                        {:else}
                           <div class="tw-badge tw-badge-accent tw-badge-lg">
                              Permanent
                           </div>
                        {/if}
                     </div>
                     
                     {#if modifier.effect}
                        <div class="tw-divider tw-my-2"></div>
                        <div class="tw-badge tw-badge-outline">
                           {modifier.effect}
                        </div>
                     {/if}
                  </div>
               </div>
            {/each}
         </div>
      {:else}
         <div class="tw-alert tw-alert-info">
            <i class="fas fa-info-circle"></i>
            <div>
               <h3 class="tw-font-bold">No Active Modifiers</h3>
               <div class="tw-text-xs">Modifiers can be gained through events, buildings, and kingdom actions.</div>
            </div>
         </div>
         
         <!-- Modifier Types Info -->
         <div class="tw-card tw-bg-base-200 tw-mt-4">
            <div class="tw-card-body">
               <h3 class="tw-card-title tw-text-lg">Types of Modifiers</h3>
               <p class="tw-text-sm tw-text-base-content/70 tw-mb-3">
                  Your kingdom can gain various modifiers that affect gameplay:
               </p>
               
               <div class="tw-grid tw-gap-3 md:tw-grid-cols-2">
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-chart-line tw-text-success"></i>
                           Economic Bonuses
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Increase resource production and reduce costs
                        </p>
                     </div>
                  </div>
                  
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-shield-alt tw-text-primary"></i>
                           Military Advantages
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Strengthen armies and improve defense
                        </p>
                     </div>
                  </div>
                  
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-heart tw-text-error"></i>
                           Social Effects
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Affect unrest, loyalty, and population growth
                        </p>
                     </div>
                  </div>
                  
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-exclamation-triangle tw-text-warning"></i>
                           Curses & Penalties
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Negative effects from events or poor decisions
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      {/if}
   </div>
   
   <!-- Summary Stats -->
   <div class="tw-divider"></div>
   <div class="tw-stats tw-shadow tw-bg-base-300 tw-w-full">
      <div class="tw-stat">
         <div class="tw-stat-title">Active Modifiers</div>
         <div class="tw-stat-value tw-text-2xl">{$kingdomState.ongoingModifiers.length}</div>
         <div class="tw-stat-desc">Currently affecting kingdom</div>
      </div>
      <div class="tw-stat">
         <div class="tw-stat-title">Temporary</div>
         <div class="tw-stat-value tw-text-2xl">
            {$kingdomState.ongoingModifiers.filter(m => m.duration > 0).length}
         </div>
         <div class="tw-stat-desc">Will expire over time</div>
      </div>
      <div class="tw-stat">
         <div class="tw-stat-title">Permanent</div>
         <div class="tw-stat-value tw-text-2xl">
            {$kingdomState.ongoingModifiers.filter(m => m.duration === 0).length}
         </div>
         <div class="tw-stat-desc">Lasting effects</div>
      </div>
   </div>
</div>
