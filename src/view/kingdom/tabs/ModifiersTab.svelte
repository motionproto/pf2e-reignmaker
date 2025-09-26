<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState } from '../../../stores/gameState';
   import type { KingdomModifier } from '../../../models/Modifiers';
   
   // Get severity color classes
   function getSeverityClass(severity: string): string {
      switch(severity) {
         case 'beneficial': return 'tw-border-success tw-bg-success/10';
         case 'neutral': return 'tw-border-base-300 tw-bg-base-200';
         case 'dangerous': return 'tw-border-warning tw-bg-warning/10';
         case 'critical': return 'tw-border-error tw-bg-error/10';
         default: return 'tw-border-base-300 tw-bg-base-200';
      }
   }
   
   // Format duration display
   function formatDuration(modifier: KingdomModifier, currentTurn: number): string {
      if (modifier.duration === 'permanent') return 'Permanent';
      if (modifier.duration === 'until-resolved') return 'Until Resolved';
      if (modifier.duration === 'until-cancelled') return 'Until Cancelled';
      if (typeof modifier.duration === 'number') {
         const remaining = modifier.duration - (currentTurn - modifier.startTurn);
         return `${remaining} turn${remaining !== 1 ? 's' : ''} remaining`;
      }
      return 'Unknown';
   }
   
   // Format effects for display
   function formatEffects(effects: any): string[] {
      const result: string[] = [];
      
      // Resource effects
      if (effects.gold) result.push(`Gold: ${effects.gold > 0 ? '+' : ''}${effects.gold}/turn`);
      if (effects.food) result.push(`Food: ${effects.food > 0 ? '+' : ''}${effects.food}/turn`);
      if (effects.lumber) result.push(`Lumber: ${effects.lumber > 0 ? '+' : ''}${effects.lumber}/turn`);
      if (effects.stone) result.push(`Stone: ${effects.stone > 0 ? '+' : ''}${effects.stone}/turn`);
      if (effects.ore) result.push(`Ore: ${effects.ore > 0 ? '+' : ''}${effects.ore}/turn`);
      if (effects.luxuries) result.push(`Luxuries: ${effects.luxuries > 0 ? '+' : ''}${effects.luxuries}/turn`);
      
      // Kingdom stats
      if (effects.unrest) result.push(`Unrest: ${effects.unrest > 0 ? '+' : ''}${effects.unrest}/turn`);
      if (effects.fame) result.push(`Fame: ${effects.fame > 0 ? '+' : ''}${effects.fame}/turn`);
      if (effects.infamy) result.push(`Infamy: ${effects.infamy > 0 ? '+' : ''}${effects.infamy}/turn`);
      
      // Roll modifiers
      if (effects.rollModifiers && effects.rollModifiers.length > 0) {
         effects.rollModifiers.forEach((mod: any) => {
            const type = Array.isArray(mod.type) ? mod.type.join(', ') : mod.type;
            result.push(`${mod.value > 0 ? '+' : ''}${mod.value} to ${type} rolls`);
         });
      }
      
      return result;
   }
   
   $: currentTurn = $gameState.currentTurn || 1;
</script>

<div class="tw-h-full tw-flex tw-flex-col">
   <div class="tw-mb-4">
      <h2 class="tw-text-2xl tw-font-bold tw-text-base-content tw-mb-2">Modifiers</h2>
      <p class="tw-text-base-content/60">Active kingdom modifiers from unresolved events and ongoing effects</p>
   </div>
   
   <!-- Modifiers List -->
   <div class="tw-flex-1 tw-overflow-y-auto">
      {#if $kingdomState.modifiers && $kingdomState.modifiers.length > 0}
         <div class="tw-grid tw-gap-3">
            {#each $kingdomState.modifiers as modifier}
               <div class="tw-card tw-border-2 tw-shadow-md {getSeverityClass(modifier.severity)}">
                  <div class="tw-card-body">
                     <!-- Header with name and duration -->
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
                           {#if modifier.source}
                              <div class="tw-text-xs tw-text-base-content/50 tw-mt-2">
                                 Source: {modifier.source.name || modifier.source.id} ({modifier.source.type})
                              </div>
                           {/if}
                        </div>
                        
                        <!-- Duration Badge -->
                        <div class="tw-badge tw-badge-lg {modifier.duration === 'until-resolved' ? 'tw-badge-warning' : modifier.duration === 'permanent' ? 'tw-badge-accent' : 'tw-badge-secondary'}">
                           {formatDuration(modifier, currentTurn)}
                        </div>
                     </div>
                     
                     <!-- Effects -->
                     {#if modifier.effects}
                        {@const effects = formatEffects(modifier.effects)}
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
                     {#if modifier.resolution}
                        <div class="tw-divider tw-my-2"></div>
                        <div class="tw-text-sm">
                           <div class="tw-font-semibold tw-text-base-content/80 tw-mb-1">Resolution:</div>
                           {#if modifier.resolution.skills && modifier.resolution.skills.length > 0}
                              <div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
                                 <span class="tw-text-xs">Skills:</span>
                                 <div class="tw-flex tw-flex-wrap tw-gap-1">
                                    {#each modifier.resolution.skills as skill}
                                       <span class="tw-badge tw-badge-sm tw-badge-primary">{skill}</span>
                                    {/each}
                                 </div>
                              </div>
                           {/if}
                           {#if modifier.resolution.dc}
                              <div class="tw-text-xs">
                                 DC: {modifier.resolution.dc}
                              </div>
                           {/if}
                           {#if modifier.resolution.automatic}
                              <div class="tw-text-xs tw-text-info tw-mt-1">
                                 <i class="fas fa-info-circle"></i>
                                 Auto-resolves: {modifier.resolution.automatic.description}
                              </div>
                           {/if}
                        </div>
                     {/if}
                     
                     <!-- Escalation Warning -->
                     {#if modifier.escalation && !modifier.escalation.hasEscalated}
                        {@const turnsUntilEscalation = modifier.escalation.turnsUntilEscalation - (currentTurn - modifier.startTurn)}
                        {#if turnsUntilEscalation > 0}
                           <div class="tw-alert tw-alert-warning tw-mt-2">
                              <i class="fas fa-exclamation-triangle"></i>
                              <span class="tw-text-xs">
                                 Will escalate in {turnsUntilEscalation} turn{turnsUntilEscalation !== 1 ? 's' : ''}
                              </span>
                           </div>
                        {/if}
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
         <div class="tw-stat-value tw-text-2xl">{$kingdomState.modifiers?.length || 0}</div>
         <div class="tw-stat-desc">Currently affecting kingdom</div>
      </div>
      <div class="tw-stat">
         <div class="tw-stat-title">Temporary</div>
         <div class="tw-stat-value tw-text-2xl">
            {$kingdomState.modifiers?.filter(m => typeof m.duration === 'number').length || 0}
         </div>
         <div class="tw-stat-desc">Will expire over time</div>
      </div>
      <div class="tw-stat">
         <div class="tw-stat-title">Permanent</div>
         <div class="tw-stat-value tw-text-2xl">
            {$kingdomState.modifiers?.filter(m => m.duration === 'permanent').length || 0}
         </div>
         <div class="tw-stat-desc">Lasting effects</div>
      </div>
   </div>
</div>
