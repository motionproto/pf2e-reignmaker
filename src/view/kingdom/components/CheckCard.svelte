<script lang="ts">
   /**
    * CheckCard - A reusable component for any check-based card
    * (actions, events, incidents)
    * 
    * This component handles the common UI pattern of:
    * - Title and description
    * - Skill selection
    * - Possible outcomes display
    * - Result display after resolution
    * 
    * The parent component handles all business logic through events
    */
   
   import { createEventDispatcher } from 'svelte';
   import SkillTag from './SkillTag.svelte';
   import PossibleOutcomes from './PossibleOutcomes.svelte';
   import type { PossibleOutcome } from './PossibleOutcomes.svelte';
   import OutcomeDisplay from './OutcomeDisplay.svelte';
   
   // Required props
   export let id: string;
   export let name: string;
   export let description: string;
   export let skills: Array<{ skill: string; description?: string }> = [];
   export let outcomes: Array<{
      type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      description: string;
   }>;
   
   // Optional props for different check types
   export let checkType: 'action' | 'event' | 'incident' = 'action';
   export let brief: string = '';
   export let special: string | null = '';
   export let cost: Map<string, number> | null = null;
   
   // State props
   export let expanded: boolean = false;
   export let available: boolean = true;
   export let missingRequirements: string[] = [];
   export let resolved: boolean = false;
   export let resolution: { 
      outcome: string, 
      actorName: string, 
      skillName?: string,
      stateChanges?: Record<string, any>
   } | undefined = undefined;
   export const character: any = null; // Unused - marked as const
   export let canPerformMore: boolean = true;
   export let currentFame: number = 0;
   
   // Track resolution history for player actions (multiple players can do the same action)
   let resolutionHistory: Array<{ actor: string; outcome: string }> = [];
   
   // UI customization props
   export let showFameReroll: boolean = checkType === 'action';
   export let resolvedBadgeText: string = 'Resolved';
   export let primaryButtonLabel: string = 'OK';
   export let skillSectionTitle: string = 'Choose Skill:';
   export const hideCharacterHint: boolean = false; // Unused - marked as const
   
   const dispatch = createEventDispatcher();
   
   // UI state only
   let isRolling: boolean = false;
   let localUsedSkill: string = '';
   
   // Get the skill that was used
   $: usedSkill = resolution?.skillName || localUsedSkill || '';
   
   // UI handlers
   function toggleExpanded(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      // Always allow expansion to see action details, regardless of availability
      dispatch('toggle');
   }
   
   function handleSkillExecute(event: CustomEvent) {
      const skill = event.detail.skill;
      
      if (resolved || isRolling) {
         return;
      }
      
      isRolling = true;
      localUsedSkill = skill;
      
      // Ensure the card stays expanded when rolling
      if (!expanded) {
         dispatch('toggle');
      }
      
      // Delegate all roll logic to the parent
      dispatch('executeSkill', { 
         skill,
         checkId: id,
         checkName: name,
         checkType
      });
      
      isRolling = false;
   }
   
   function formatOutcome(outcomeType: string): string {
      const outcome = outcomes.find(o => o.type === outcomeType);
      return outcome?.description || '—';
   }
   
   function handleRerollWithFame() {
      if (currentFame > 0 && resolution && showFameReroll) {
         const skillToUse = usedSkill || localUsedSkill;
         if (skillToUse) {
            dispatch('rerollWithFame', { 
               checkId: id,
               skill: skillToUse,
               checkType
            });
         }
      }
   }
   
   function handlePrimaryAction() {
      // Add current resolution to history before resetting
      if (resolution) {
         resolutionHistory = [...resolutionHistory, { 
            actor: resolution.actorName, 
            outcome: resolution.outcome 
         }];
      }
      
      // Dispatch the primary action event to parent
      dispatch('primaryAction', { checkId: id, checkType });
      
      // For player actions, reset state to allow other players to use the action
      // (Events and Incidents don't use CheckCard, so this only affects actions)
      resolved = false;
      resolution = undefined;
      localUsedSkill = '';
      
      // Collapse the card to show the default state
      expanded = false;
   }
   
   function handleCancel() {
      dispatch('cancel', { checkId: id, checkType });
      
      // Reset resolution state when cancelled
      resolved = false;
      resolution = undefined;
      localUsedSkill = '';
   }
   
   // Format possible outcomes for display
   $: possibleOutcomes = outcomes.map(o => ({
      result: o.type,
      label: o.type === 'criticalSuccess' ? 'Critical Success' :
             o.type === 'success' ? 'Success' :
             o.type === 'failure' ? 'Failure' : 'Critical Failure',
      description: o.description
   }));
   
   // Get card state class
   $: cardStateClass = resolved ? 'resolved result-state' : 'select-state';
   
   // Helper to format outcome for badge display
   function getOutcomeBadgeClass(outcome: string): string {
      switch (outcome) {
         case 'criticalSuccess':
            return 'badge-crit-success';
         case 'success':
            return 'badge-success';
         case 'failure':
            return 'badge-failure';
         case 'criticalFailure':
            return 'badge-crit-failure';
         default:
            return 'badge-neutral';
      }
   }
   
   function getOutcomeBadgeLabel(outcome: string): string {
      switch (outcome) {
         case 'criticalSuccess':
            return 'Crit Success';
         case 'success':
            return 'Success';
         case 'failure':
            return 'Failure';
         case 'criticalFailure':
            return 'Crit Fail';
         default:
            return outcome;
      }
   }
</script>

<div class="check-card {checkType}-card {!available ? 'not-available' : ''} {expanded ? 'expanded' : ''} {cardStateClass}">
   <button 
      class="card-header-btn"
      on:click={toggleExpanded}
      disabled={false}
   >
      <div class="card-header-content">
         <div class="card-main">
            <strong class="card-name">
               {name}
               {#if resolved}
                  <span class="resolved-badge">
                     <i class="fas fa-check-circle"></i>
                     {resolvedBadgeText}
                  </span>
               {/if}
               {#if !available && missingRequirements.length > 0}
                  <span class="requirements-badge">
                     <i class="fas fa-exclamation-triangle"></i>
                     Requires: {missingRequirements.join(', ')}
                  </span>
               {/if}
            </strong>
            {#if resolutionHistory.length > 0 && !expanded}
               <div class="resolution-history-badges">
                  {#each resolutionHistory as res}
                     <span class="history-badge {getOutcomeBadgeClass(res.outcome)}">
                        {res.actor} - {getOutcomeBadgeLabel(res.outcome)}
                     </span>
                  {/each}
               </div>
            {/if}
            {#if brief}
               <span class="card-brief">{brief}</span>
            {/if}
         </div>
         <i class="fas fa-chevron-{expanded ? 'down' : 'right'} expand-icon"></i>
      </div>
   </button>
   
   {#if expanded}
      <div class="card-details">
         <!-- Description -->
         <p class="card-full-description">{description}</p>
         
         <!-- Outcome display if resolved -->
         {#if resolved && resolution}
            <OutcomeDisplay
               outcome={resolution.outcome}
               actorName={resolution.actorName}
               skillName={usedSkill}
               effect={formatOutcome(resolution.outcome)}
               stateChanges={resolution.stateChanges}
               {showFameReroll}
               {primaryButtonLabel}
               on:reroll={handleRerollWithFame}
               on:primary={handlePrimaryAction}
               on:cancel={handleCancel}
            />
         {:else}
            <!-- Skills section - only show when not resolved -->
            <div class="skills-section">
               <h4 class="section-title">{skillSectionTitle}</h4>
               <div class="skills-tags">
                  {#each skills as skillOption}
                     {@const isDisabled = !canPerformMore || resolved}
                     <SkillTag
                        skill={skillOption.skill}
                        description={skillOption.description || ''} 
                        selected={false}
                        disabled={isDisabled}
                        loading={isRolling && skillOption.skill === localUsedSkill}
                        faded={false}
                        on:execute={handleSkillExecute}
                     />
                  {/each}
               </div>
      
            </div>
            
            <!-- Outcomes section - only show when not resolved -->
            <div class="outcomes-section">
               <PossibleOutcomes 
                  outcomes={possibleOutcomes}
                  showTitle={false}
               />
            </div>
         {/if}
         
         <!-- Special rules or costs (primarily for actions) -->
         {#if special || cost}
            <div class="additional-info">
               {#if special}
                  <div class="info-box special-section">
                     <i class="fas fa-info-circle"></i>
                     <span>{special}</span>
                  </div>
               {/if}
               
               {#if cost}
                  <div class="info-box cost-section">
                     <i class="fas fa-tag"></i>
                     <span>Cost: 
                        {#each Array.from(cost.entries()) as [resource, amount], i}
                           {#if i > 0}, {/if}
                           {amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                        {/each}
                     </span>
                  </div>
               {/if}
            </div>
         {/if}
         
         <!-- Slot for additional content specific to check type -->
         <slot name="additional-content"></slot>
      </div>
   {/if}
</div>

<style lang="scss">
   .check-card {
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-medium);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      min-height: min-content;
      position: relative;
      
      // Type-specific theming
      &.action-card {
         --accent-color: var(--color-amber);
         --accent-color-light: var(--color-amber-light);
      }
      
      &.event-card {
         --accent-color: var(--color-blue);
         --accent-color-light: var(--color-blue-light);
      }
      
      &.incident-card {
         --accent-color: var(--color-purple);
         --accent-color-light: var(--color-purple-light);
      }
      
      // Select State (default) - Check not yet performed
      &.select-state {
         &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, 
               transparent, 
               var(--accent-color), 
               transparent);
            border-radius: var(--radius-md) var(--radius-md) 0 0;
            opacity: 0;
            transition: opacity 0.3s ease;
         }
         
         &.expanded::before {
            opacity: 0.6;
         }
      }
      
      // Result State - Check has been performed and resolved
      &.result-state {
         background: linear-gradient(135deg,
            rgba(20, 20, 23, 0.7),
            rgba(15, 15, 17, 0.5));
         border-color: var(--border-subtle);
         
         &::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-green);
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
            animation: pulse 2s infinite;
         }
      }
      
      &.resolved {
         background: linear-gradient(135deg,
            rgba(24, 24, 27, 0.4),
            rgba(31, 31, 35, 0.3));
         border-color: var(--border-subtle);
      }
      
      // Hover states for select state
      &.select-state:hover:not(.disabled):not(.expanded) {
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      &.select-state.expanded {
         border-color: var(--accent-color);
         box-shadow: 0 4px 12px rgba(var(--accent-color), 0.1);
         
         &:hover:not(.disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(var(--accent-color), 0.15);
         }
      }
      
      // Result state has different hover behavior
      &.result-state:hover:not(.disabled) {
         transform: none;
         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      &.result-state.expanded {
         border-color: rgba(34, 197, 94, 0.3);
      }
      
      &.disabled {
         opacity: 0.5;
         cursor: not-allowed;
         
         .card-header-btn {
            cursor: not-allowed;
         }
      }
      
      // Style for unavailable actions
      &.not-available {
         opacity: 0.85; // Less faded so it's more readable
         background: linear-gradient(135deg,
            rgba(24, 24, 27, 0.5),
            rgba(31, 31, 35, 0.4));
         border-color: var(--border-subtle);
         
         .card-name {
            color: var(--text-secondary);
         }
         
         .card-brief {
            color: var(--text-secondary);
         }
         
         // Add a subtle visual indicator for unavailable state
         &::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--color-amber);
            opacity: 0.6;
         }
      }
   }
   
   .card-header-btn {
      display: flex;
      width: 100%;
      background: transparent;
      border: none;
      margin: 0;
      padding: 0.75em 1em;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s ease;
      box-sizing: border-box;
      flex-shrink: 0;
      min-height: min-content;
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.02);
      }
      
      &:disabled {
         cursor: not-allowed;
      }
   }
   
   .check-card.expanded .card-header-btn {
      background: rgba(255, 255, 255, 0.03);
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.05);
      }
   }
   
   .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      width: 100%;
      
      .card-main {
         flex: 1;
         display: flex;
         flex-direction: column;
         gap: 4px;
         text-align: left;
         min-width: 0;
         
         .card-name {
            color: var(--text-primary);
            font-size: var(--font-3xl);
            font-weight: var(--font-weight-semibold);
            line-height: 1.3;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 12px;
            
            .resolved-badge {
               display: inline-flex;
               align-items: center;
               gap: 4px;
               padding: 2px 8px;
               background: rgba(34, 197, 94, 0.15);
               border: 1px solid rgba(34, 197, 94, 0.3);
               border-radius: var(--radius-sm);
               font-size: var(--font-xs);
               font-weight: var(--font-weight-medium);
               line-height: 1.2;
               letter-spacing: 0.05em;
               color: var(--color-green);
               text-transform: uppercase;
               
               i {
                  font-size: 12px;
               }
            }
            
            .requirements-badge {
               display: inline-flex;
               align-items: center;
               gap: 4px;
               padding: 2px 8px;
               background: rgba(251, 191, 36, 0.15);
               border: 1px solid rgba(251, 191, 36, 0.3);
               border-radius: var(--radius-sm);
               font-size: var(--font-xs);
               font-weight: var(--font-weight-medium);
               line-height: 1.2;
               letter-spacing: 0.05em;
               color: var(--color-amber);
               text-transform: none;
               
               i {
                  font-size: 12px;
               }
            }
         }
         
         .resolution-history-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
         }
         
         .history-badge {
            display: inline-flex;
            align-items: center;
            padding: 3px 8px;
            border-radius: var(--radius-sm);
            font-size: var(--font-xs);
            font-weight: var(--font-weight-medium);
            line-height: 1.2;
            border: 1px solid;
            
            &.badge-crit-success {
               background: rgba(34, 197, 94, 0.15);
               border-color: rgba(34, 197, 94, 0.4);
               color: var(--color-green);
            }
            
            &.badge-success {
               background: rgba(34, 197, 94, 0.1);
               border-color: rgba(34, 197, 94, 0.3);
               color: var(--color-green-light);
            }
            
            &.badge-failure {
               background: rgba(249, 115, 22, 0.1);
               border-color: rgba(249, 115, 22, 0.3);
               color: var(--color-orange);
            }
            
            &.badge-crit-failure {
               background: rgba(239, 68, 68, 0.15);
               border-color: rgba(239, 68, 68, 0.4);
               color: var(--color-red);
            }
            
            &.badge-neutral {
               background: rgba(100, 116, 139, 0.1);
               border-color: rgba(100, 116, 139, 0.3);
               color: var(--text-secondary);
            }
         }
         
         .card-brief {
            color: var(--text-secondary);
            font-size: var(--font-md);
            line-height: 1.5;
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
         margin-top: 4px;
         margin-left: auto;
      }
   }
   
   .card-details {
      padding: 16px;
      border-top: 1px solid var(--border-subtle);
      text-align: left;
      
      .card-full-description {
         margin: 0 0 16px 0;
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
         text-align: left;
      }
   }
   
   @keyframes pulse {
      0% {
         opacity: 1;
         transform: scale(1);
      }
      50% {
         opacity: 0.6;
         transform: scale(1.1);
      }
      100% {
         opacity: 1;
         transform: scale(1);
      }
   }
   
   .skills-section {
      margin-top: 20px;
   }
   
   .outcomes-section {
      margin-top: 20px;
   }
   
   .section-title {
      margin: 0 0 12px 0;
      color: var(--text-primary);
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      opacity: 0.8;
   }
   
   .skills-tags {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
   }
   
   .no-character-info {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: var(--radius-sm);
      color: var(--color-blue-light);
      font-size: var(--font-md);
      line-height: 1.5;
      display: flex;
      align-items: center;
      gap: 8px;
      
      i {
         font-size: 14px;
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
         font-size: var(--font-md);
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
