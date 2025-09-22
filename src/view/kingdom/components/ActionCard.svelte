<script lang="ts">
   import type { PlayerAction } from '../../../models/PlayerActions';
   
   export let action: PlayerAction;
   export let expanded: boolean = false;
   export let available: boolean = true;
   export let selectedSkills: Set<string> = new Set();
   export let canSelectMore: boolean = true;
   
   // Events
   import { createEventDispatcher } from 'svelte';
   const dispatch = createEventDispatcher();
   
   function toggleExpanded() {
      if (available) {
         dispatch('toggle');
      }
   }
   
   function selectSkill(skill: string) {
      dispatch('selectSkill', { skill });
   }
   
   function formatOutcome(outcome: any): string {
      if (!outcome) return '—';
      return outcome.description || '—';
   }
</script>

<div class="action-card {!available ? 'disabled' : ''} {expanded ? 'expanded' : ''}">
   <button 
      class="action-header-btn"
      on:click={toggleExpanded}
      disabled={!available}
   >
      <div class="action-header-content">
         <div class="action-main">
            <strong class="action-name">{action.name}</strong>
            {#if action.brief}
               <span class="action-brief">{action.brief}</span>
            {/if}
         </div>
         <i class="fas fa-chevron-{expanded ? 'down' : 'right'} expand-icon"></i>
      </div>
   </button>
   
   {#if expanded}
      <div class="action-details">
         <!-- Description -->
         <p class="action-full-description">{action.description}</p>
         
         <!-- Skills section -->
         <div class="skills-section">
            <h4 class="section-title">Choose Skill:</h4>
            <div class="skills-list">
               {#each action.skills as skillOption}
                  <button 
                     class="skill-button {selectedSkills.has(skillOption.skill) ? 'selected' : ''}"
                     on:click={() => selectSkill(skillOption.skill)}
                     disabled={!selectedSkills.has(skillOption.skill) && !canSelectMore}
                  >
                     <span class="skill-name">{skillOption.skill}</span>
                     <span class="skill-desc">— {skillOption.description}</span>
                  </button>
               {/each}
            </div>
         </div>
         
         <!-- Outcomes section -->
         <div class="outcomes-section">
            <h4 class="section-title">Possible Outcomes:</h4>
            <div class="outcomes-grid">
               <div class="outcome critical-success">
                  <div class="outcome-header">
                     <i class="fas fa-star"></i>
                     Critical Success
                  </div>
                  <div class="outcome-text">{formatOutcome(action.criticalSuccess)}</div>
               </div>
               <div class="outcome success">
                  <div class="outcome-header">
                     <i class="fas fa-check"></i>
                     Success
                  </div>
                  <div class="outcome-text">{formatOutcome(action.success)}</div>
               </div>
               <div class="outcome failure">
                  <div class="outcome-header">
                     <i class="fas fa-times"></i>
                     Failure
                  </div>
                  <div class="outcome-text">{formatOutcome(action.failure)}</div>
               </div>
               <div class="outcome critical-failure">
                  <div class="outcome-header">
                     <i class="fas fa-skull"></i>
                     Critical Failure
                  </div>
                  <div class="outcome-text">{formatOutcome(action.criticalFailure)}</div>
               </div>
            </div>
         </div>
         
         <!-- Special rules or costs -->
         {#if action.special || action.cost}
            <div class="additional-info">
               {#if action.special}
                  <div class="info-box special-section">
                     <i class="fas fa-info-circle"></i>
                     <span>{action.special}</span>
                  </div>
               {/if}
               
               {#if action.cost}
                  <div class="info-box cost-section">
                     <i class="fas fa-tag"></i>
                     <span>Cost: 
                        {#each Array.from(action.cost.entries()) as [resource, amount], i}
                           {#if i > 0}, {/if}
                           {amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                        {/each}
                     </span>
                  </div>
               {/if}
            </div>
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .action-card {
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      min-height: min-content; // Allow card to be at least as tall as its content
      
      &:hover:not(.disabled) {
         border-color: var(--border-medium);
         transform: translateY(-1px);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      &.expanded {
         border-color: var(--color-amber);
         box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
      }
      
      &.disabled {
         opacity: 0.5;
         cursor: not-allowed;
         
         .action-header-btn {
            cursor: not-allowed;
         }
      }
   }
   
   .action-header-btn {
      display: flex; // Use flex to ensure proper layout
      width: 100%;
      background: transparent;
      border: none;
      margin: 0; // Reset any default margins
      padding: 1em;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s ease;
      box-sizing: border-box; // Ensure padding is included in width
      flex-shrink: 0; // Prevent button from shrinking
      min-height: min-content; // Ensure button expands to fit content
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.02);
      }
      
      &:disabled {
         cursor: not-allowed;
      }
   }
   
   .action-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      width: 100%;
      
      .action-main {
         flex: 1;
         display: flex;
         flex-direction: column;
         gap: 4px;
         text-align: left;
         min-width: 0; // Allow text truncation if needed
         
         .action-name {
            color: var(--text-primary);
            font-size: var(--font-lg);
            line-height: 1.3;
            text-align: left;
            display: block;
         }
         
         .action-brief {
            color: var(--text-secondary);
            font-size: var(--font-md);
            line-height: 1.4;
            opacity: 0.8;
            text-align: left;
            display: block;
         }
      }
      
      .expand-icon {
         color: var(--text-tertiary);
         transition: transform 0.3s ease;
         flex-shrink: 0;
         font-size: 14px;
         margin-top: 4px; // Align with first line of text
         margin-left: auto; // Push to the right
      }
   }
   
   .action-details {
      padding: 16px;
      animation: slideDown 0.3s ease-out;
      border-top: 1px solid var(--border-subtle);
      text-align: left;
      
      .action-full-description {
         margin: 0 0 16px 0;
         color: var(--text-secondary);
         font-size: var(--font-sm);
         line-height: 1.6;
         font-style: italic;
         text-align: left;
      }
   }
   
   @keyframes slideDown {
      from {
         opacity: 0;
         max-height: 0;
      }
      to {
         opacity: 1;
         max-height: 2000px; // Large enough for content but not infinite
      }
   }
   
   .skills-section,
   .outcomes-section {
      margin-top: 20px;
   }
   
   .section-title {
      margin: 0 0 12px 0;
      color: var(--text-primary);
      font-size: var(--font-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
   }
   
   .skills-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   
   .skill-button {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      
      &:hover:not(:disabled) {
         background: rgba(0, 0, 0, 0.3);
         border-color: var(--color-amber);
         transform: translateX(2px);
      }
      
      &.selected {
         background: rgba(251, 191, 36, 0.15);
         border-color: var(--color-amber);
         
         .skill-name {
            color: var(--color-amber-light);
         }
      }
      
      &:disabled:not(.selected) {
         opacity: 0.5;
         cursor: not-allowed;
         
         &:hover {
            transform: none;
            border-color: var(--border-subtle);
         }
      }
      
      .skill-name {
         font-weight: 600;
         color: var(--text-primary);
         text-transform: capitalize;
         white-space: nowrap;
         min-width: 120px;
      }
      
      .skill-desc {
         color: var(--text-tertiary);
         font-size: var(--font-sm);
         font-style: italic;
         opacity: 0.9;
         flex: 1;
      }
   }
   
   .outcomes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
   }
   
   .outcome {
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      
      .outcome-header {
         display: flex;
         align-items: center;
         gap: 6px;
         font-weight: 600;
         font-size: var(--font-xs);
         text-transform: uppercase;
         letter-spacing: 0.3px;
         margin-bottom: 8px;
         
         i {
            font-size: 10px;
            opacity: 0.7;
         }
      }
      
      .outcome-text {
         font-size: var(--font-sm);
         color: var(--text-secondary);
         line-height: 1.5;
      }
      
      &.critical-success {
         background: rgba(34, 197, 94, 0.05);
         border-color: rgba(34, 197, 94, 0.3);
         
         .outcome-header {
            color: var(--color-green);
         }
      }
      
      &.success {
         background: rgba(34, 197, 94, 0.03);
         
         .outcome-header {
            color: var(--color-green-light);
         }
      }
      
      &.failure {
         background: rgba(249, 115, 22, 0.03);
         
         .outcome-header {
            color: var(--color-orange);
         }
      }
      
      &.critical-failure {
         background: rgba(239, 68, 68, 0.05);
         border-color: rgba(239, 68, 68, 0.3);
         
         .outcome-header {
            color: var(--color-red);
         }
      }
   }
   
   .additional-info {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   
   .info-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      
      i {
         margin-top: 2px;
         flex-shrink: 0;
      }
      
      span {
         font-size: var(--font-sm);
         line-height: 1.5;
      }
      
      &.special-section {
         background: rgba(59, 130, 246, 0.1);
         border: 1px solid rgba(59, 130, 246, 0.3);
         
         i {
            color: var(--color-blue);
         }
         
         span {
            color: var(--color-blue-light);
         }
      }
      
      &.cost-section {
         background: rgba(251, 191, 36, 0.1);
         border: 1px solid rgba(251, 191, 36, 0.3);
         
         i {
            color: var(--color-amber);
         }
         
         span {
            color: var(--color-amber-light);
         }
      }
   }
</style>
