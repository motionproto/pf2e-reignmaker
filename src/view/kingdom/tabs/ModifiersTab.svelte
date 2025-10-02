<script lang="ts">
   import { kingdomData } from '../../../stores/KingdomStore';
   import type { ActiveModifier } from '../../../models/Modifiers';
   
   // Format duration display
   function formatDuration(modifier: ActiveModifier, currentTurn: number): string {
      // ActiveModifier doesn't have duration field - modifiers are removed when expired
      // This is managed by ModifierService.cleanupExpiredModifiers()
      return 'Active';
   }
   
   // Format effects for display (from EventModifier array)
   function formatEffects(modifiers: any[]): string[] {
      const result: string[] = [];
      
      if (!modifiers || !Array.isArray(modifiers)) return result;
      
      for (const mod of modifiers) {
         if (mod.type === 'resource') {
            const sign = mod.value > 0 ? '+' : '';
            result.push(`${mod.resource}: ${sign}${mod.value}`);
         } else if (mod.type === 'stat') {
            const sign = mod.value > 0 ? '+' : '';
            result.push(`${mod.stat}: ${sign}${mod.value}`);
         } else if (mod.type === 'skill') {
            const sign = mod.value > 0 ? '+' : '';
            result.push(`${sign}${mod.value} to ${mod.skill} checks`);
         }
      }
      
      return result;
   }
   
   $: currentTurn = $kingdomData.currentTurn || 1;
   $: activeModifiers = ($kingdomData.activeModifiers || []) as ActiveModifier[];
</script>

<div class="tw-h-full tw-flex tw-flex-col">
   <div class="tw-mb-4">
      <h2 class="tw-text-2xl tw-font-bold tw-text-base-content tw-mb-2">Modifiers</h2>
      <p class="tw-text-base-content/60">Active kingdom modifiers from unresolved events and ongoing effects</p>
   </div>
   
   <!-- Modifiers List -->
   <div class="tw-flex-1 tw-overflow-y-auto">
      {#if activeModifiers.length > 0}
         <div class="tw-grid tw-gap-3">
            {#each activeModifiers as modifier}
               <div class="tw-card tw-border-2 tw-shadow-md tw-border-base-300 tw-bg-base-200">
                  <div class="tw-card-body">
                     <!-- Header with name and tier -->
                     <div class="tw-flex tw-justify-between tw-items-start">
                        <div class="tw-flex-1">
                           <h4 class="tw-card-title tw-text-lg tw-flex tw-items-center tw-gap-2">
                              {#if modifier.icon}
                                 <i class="{modifier.icon}"></i>
                              {/if}
                              {modifier.name}
                           </h4>
                           <p class="tw-text-sm tw-text-base-content/70 tw-mt-1">{modifier.description}</p>
                           
                           <!-- Source -->
                           <div class="tw-text-xs tw-text-base-content/50 tw-mt-2">
                              Source: {modifier.sourceName} ({modifier.sourceType})
                           </div>
                        </div>
                        
                        <!-- Tier Badge -->
                        <div class="tw-badge tw-badge-lg tw-badge-primary">
                           Tier {modifier.tier}
                        </div>
                     </div>
                     
                     <!-- Effects -->
                     {#if modifier.modifiers && modifier.modifiers.length > 0}
                        {@const effects = formatEffects(modifier.modifiers)}
                        {#if effects.length > 0}
                           <div class="tw-divider tw-my-2"></div>
                           <div class="tw-flex tw-flex-wrap tw-gap-2">
                              {#each effects as effect}
                                 <div class="tw-badge tw-badge-outline tw-badge-sm">
                                    {effect}
                                 </div>
                              {/each}
                           </div>
                        {/if}
                     {/if}
                     
                     <!-- Resolution Info -->
                     {#if modifier.resolvedWhen}
                        <div class="tw-divider tw-my-2"></div>
                        <div class="tw-text-sm">
                           <div class="tw-font-semibold tw-text-base-content/80 tw-mb-1">Can be resolved:</div>
                           {#if modifier.resolvedWhen.type === 'skill' && modifier.resolvedWhen.skillResolution}
                              <div class="tw-text-xs tw-text-info">
                                 <i class="fas fa-dice-d20"></i>
                                 Skill check with DC adjustment: {modifier.resolvedWhen.skillResolution.dcAdjustment > 0 ? '+' : ''}{modifier.resolvedWhen.skillResolution.dcAdjustment}
                              </div>
                           {/if}
                           {#if modifier.resolvedWhen.type === 'condition' && modifier.resolvedWhen.conditionResolution}
                              <div class="tw-text-xs tw-text-info tw-mt-1">
                                 <i class="fas fa-info-circle"></i>
                                 {modifier.resolvedWhen.conditionResolution.description}
                              </div>
                           {/if}
                        </div>
                     {/if}
                     
                     <!-- Start Turn Info -->
                     <div class="tw-text-xs tw-text-base-content/50 tw-mt-2">
                        Started: Turn {modifier.startTurn}
                     </div>
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
                           <i class="fas fa-calendar-times tw-text-warning"></i>
                           Unresolved Events
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Events that were failed or ignored
                        </p>
                     </div>
                  </div>
                  
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-fire tw-text-error"></i>
                           Unrest Incidents
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Ongoing effects from unrest incidents
                        </p>
                     </div>
                  </div>
                  
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-building tw-text-primary"></i>
                           Structures
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Ongoing bonuses from kingdom structures
                        </p>
                     </div>
                  </div>
                  
                  <div class="tw-card tw-bg-base-300 tw-card-compact">
                     <div class="tw-card-body">
                        <h4 class="tw-flex tw-items-center tw-gap-2 tw-font-semibold">
                           <i class="fas fa-handshake tw-text-success"></i>
                           Diplomatic Relations
                        </h4>
                        <p class="tw-text-xs tw-text-base-content/60">
                           Effects from alliances and treaties
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
         <div class="tw-stat-value tw-text-2xl">{activeModifiers.length}</div>
         <div class="tw-stat-desc">Currently affecting kingdom</div>
      </div>
      <div class="tw-stat">
         <div class="tw-stat-title">From Events</div>
         <div class="tw-stat-value tw-text-2xl">
            {activeModifiers.filter(m => m.sourceType === 'event').length}
         </div>
         <div class="tw-stat-desc">Unresolved events</div>
      </div>
      <div class="tw-stat">
         <div class="tw-stat-title">From Incidents</div>
         <div class="tw-stat-value tw-text-2xl">
            {activeModifiers.filter(m => m.sourceType === 'incident').length}
         </div>
         <div class="tw-stat-desc">Unrest incidents</div>
      </div>
   </div>
</div>
