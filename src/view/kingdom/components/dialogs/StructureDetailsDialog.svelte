<script lang="ts">
   import Dialog from '../baseComponents/Dialog.svelte';
   import type { Structure } from '../../../../models/Structure';
   import { generateEffectMessages } from '../../../../models/Structure';
   import { getResourceIcon, getResourceColor, getStructureImagePath } from '../../utils/presentation';

   export let show: boolean = false;
   export let structure: Structure | null = null;

   function handleClose() {
      show = false;
   }

   // Get additional effect messages
   $: effectMessages = structure ? generateEffectMessages(structure) : [];

   // Get image path
   $: imagePath = structure ? getStructureImagePath(structure.name) : '';
</script>

<Dialog
   bind:show
   title={structure?.name || 'Structure Details'}
   showConfirm={false}
   cancelLabel="Close"
   width="900px"
   onCancel={handleClose}
>
   {#if structure}
      <div class="structure-details">
         <!-- Left: Large Image -->
         <div class="image-column">
            <img
               src={imagePath}
               alt={structure.name}
               class="structure-image"
            />
         </div>

         <!-- Right: All Content -->
         <div class="content-column">
            <!-- Tier and Costs -->
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
                  {#if !structure.constructionCost || Object.values(structure.constructionCost).every(v => !v || v === 0)}
                     <span class="free-text">Free</span>
                  {/if}
               </div>
            </div>

            <!-- Description -->
            {#if structure.description}
               <p class="description">{structure.description}</p>
            {/if}

            <!-- Benefits -->
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
                        <div class="effect-item">
                           <i class="fas fa-bolt"></i>
                           <span>{msg}</span>
                        </div>
                     {/each}
                  </div>
               {/if}
            </div>

            <!-- Skill Support (for skill structures) -->
            {#if structure.type === 'skill' && structure.effects.skillsSupported}
               <div class="skills-footer">
                  <span class="footer-label">Supported Skills:</span>
                  {#each structure.effects.skillsSupported as skill}
                     <span class="skill-badge">{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                  {/each}
               </div>
            {/if}
         </div>
      </div>
   {/if}
</Dialog>

<style lang="scss">
   .structure-details {
      display: flex;
      gap: var(--space-24);
   }

   .image-column {
      flex-shrink: 0;
   }

   .structure-image {
      width: 20rem;
      height: 20rem;
      object-fit: cover;
      border-radius: var(--radius-lg);
   }

   .content-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
      min-width: 0;
   }

   .costs-tier-row {
      display: flex;
      align-items: center;
      gap: var(--space-12);
   }

   .tier-badge {
      display: inline-block;
      padding: var(--space-4) var(--space-12);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
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

   .free-text {
      font-size: var(--font-md);
      color: var(--text-tertiary);
   }

   .description {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.6;
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
      border-left: 3px solid var(--color-amber);
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
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
      display: flex;
      align-items: flex-start;
      gap: var(--space-8);
      font-size: var(--font-md);
      color: var(--text-primary);

      i {
         color: var(--color-amber);
         font-size: var(--font-sm);
         margin-top: 0.2rem;
      }
   }

   .skills-footer {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-wrap: wrap;
      margin-top: auto;
      padding-top: var(--space-8);
      border-top: 1px solid var(--border-faint);
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
