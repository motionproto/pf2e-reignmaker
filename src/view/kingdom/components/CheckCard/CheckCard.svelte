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
  import CheckCardHeader from './components/CheckCardHeader.svelte';
  import CheckCardDescription from './components/CheckCardDescription.svelte';
  import SkillsSection from './components/SkillsSection.svelte';
  import OutcomesSection from './components/OutcomesSection.svelte';
  import AdditionalInfo from './components/AdditionalInfo.svelte';
  import OutcomeDisplay from '../OutcomeDisplay/OutcomeDisplay.svelte';
  import type { PossibleOutcome } from '../PossibleOutcomes.svelte';
  
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
  function toggleExpanded() {
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
  
</script>

<div class="check-card {checkType}-card {!available ? 'not-available' : ''} {expanded ? 'expanded' : ''} {cardStateClass}">
  <CheckCardHeader
    {name}
    {brief}
    {resolved}
    {available}
    {expanded}
    {resolvedBadgeText}
    {missingRequirements}
    {resolutionHistory}
    on:toggle={toggleExpanded}
  />
  
  {#if expanded}
    <div class="card-details">
      <!-- Description -->
      <CheckCardDescription {description} />
      
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
        <SkillsSection
          {skills}
          {skillSectionTitle}
          {canPerformMore}
          {resolved}
          {isRolling}
          {localUsedSkill}
          on:execute={handleSkillExecute}
        />
        
        <!-- Outcomes section - only show when not resolved -->
        <OutcomesSection {possibleOutcomes} />
      {/if}
      
      <!-- Special rules or costs (primarily for actions) -->
      <AdditionalInfo {special} {cost} />
      
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
    }
    
    // Style for unavailable actions
    &.not-available {
      opacity: 0.85;
      background: linear-gradient(135deg,
        rgba(24, 24, 27, 0.5),
        rgba(31, 31, 35, 0.4));
      border-color: var(--border-subtle);
      
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
  
  :global(.check-card.expanded .card-header-btn) {
    background: rgba(255, 255, 255, 0.03);
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
    }
  }
  
  .card-details {
    padding: 16px;
    border-top: 1px solid var(--border-subtle);
    text-align: left;
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
</style>
