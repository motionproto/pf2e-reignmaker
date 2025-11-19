<script lang="ts">
   import Dialog from '../baseComponents/Dialog.svelte';
   import type { Structure } from '../../../../models/Structure';
   import { generateEffectMessages } from '../../../../models/Structure';
   import { getResourceIcon, getResourceColor } from '../../utils/presentation';
   
   export let show: boolean = false;
   export let structure: Structure | null = null;
   
   function handleClose() {
      show = false;
   }
   
   // Get additional effect messages
   $: effectMessages = structure ? generateEffectMessages(structure) : [];
</script>

<Dialog 
   bind:show 
   title={structure?.name || 'Structure Details'}
   showConfirm={false}
   cancelLabel="Close"
   width="600px"
   onCancel={handleClose}
>
   {#if structure}
      <div class="structure-details">
         <!-- Two-Column Layout: Thumbnail+Costs | Description -->
         <div class="top-section">
            <!-- Left: Thumbnail and Costs/Tier -->
            <div class="left-column">
               <div class="thumbnail">
                  <i class="fas fa-image"></i>
               </div>
               
               <!-- Tier and Costs (below thumbnail) -->
               <div class="costs-tier-row">
                  <div class="tier-badge">
                     Tier {structure.tier}
                  </div>
                  <div class="costs">
                     {#each Object.entries(structure.constructionCost || {}) as [resource, amount]}
                        {#if amount && amount > 0}
                           <div class="cost-item">
                              <i class="fas {getResourceIcon(resource)}" style="color: {getResourceColor(resource)}"></i>
                              <span>{amount}</span>
                           </div>
                        {/if}
                     {/each}
                  </div>
               </div>
            </div>
            
            <!-- Right: Description -->
            <div class="right-content">
               {#if structure.description}
                  <p class="description">{structure.description}</p>
               {/if}
            </div>
         </div>
         
         <!-- Benefits Section (full width) -->
         <div class="benefits">
            <p class="benefit-text">{structure.effect}</p>
            
            {#if structure.special}
               <div class="special-section">
                  <strong>Special:</strong> {structure.special}
               </div>
            {/if}
            
            {#if effectMessages.length > 0}
               <div class="additional-effects">
                  {#each effectMessages as msg}
                     <div class="effect-item">• {msg}</div>
                  {/each}
               </div>
            {/if}
         </div>
         
         <!-- Skill Support (for skill structures) - Single Row at Bottom -->
         {#if structure.type === 'skill' && structure.effects.skillsSupported}
            <div class="skills-footer">
               <span class="footer-label">Supported Skills:</span>
               {#each structure.effects.skillsSupported as skill}
                  <span class="skill-badge">{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
               {/each}
            </div>
         {/if}
         
      </div>
   {/if}
</Dialog>

<style lang="scss">
   .structure-details {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }
   
   .top-section {
      display: flex;
      gap: var(--space-16);
      margin-bottom: var(--space-12);
   }
   
   .left-column {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .thumbnail {
      width: 8rem;
      height: 8rem;
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      
      i {
         font-size: var(--font-2xl);
      }
   }
   
   .costs-tier-row {
      display: flex;
      align-items: center;
      gap: var(--space-12);
   }
   
   .right-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }
   
   .tier-badge {
      display: inline-block;
      padding: var(--space-4) var(--space-12);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
   }
   
   
   .section-title {
      margin: 0 0 var(--space-8) 0;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-accent);
   }
   
   .description {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.6;
   }
   
   .costs {
      display: flex;
      gap: var(--space-12);
      align-items: center;
   }
   
   .cost-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      
      i {
         font-size: var(--font-lg);
      }
   }
   
   .benefits {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .benefit-text {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-md);
      line-height: 1.6;
      white-space: pre-line;
   }
   
   .special-section {
      padding: var(--space-12);
      background: var(--surface);
      border-left: 3px solid var(--border-medium);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      color: var(--text-secondary);
      
      strong {
         color: var(--text-primary);
      }
   }
   
   .additional-effects {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
   }
   
   .effect-item {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      padding-left: var(--space-8);
   }
   
   .skills-footer {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-wrap: wrap;
   }
   
   .footer-label {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-accent);
   }
   
   .skill-badge {
      padding: var(--space-4) var(--space-12);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-full);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
   }
   
</style>
