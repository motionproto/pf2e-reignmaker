<script lang="ts">
  /**
   * BaseCheckCard - Unified component for all check-based cards
   * (actions, events, incidents)
   * 
   * This component handles the common UI pattern of:
   * - Skill selection
   * - Possible outcomes display
   * - Result display after resolution
   * 
   * All business logic is handled by the parent component through events
   * 
   * Feature flags control which features are enabled:
   * - expandable: Card can be collapsed/expanded (actions only)
   * - showCompletions: Show multi-player completion tracking (actions only)
   * - showAvailability: Show availability state and missing requirements (actions only)
   * - showSpecial: Show special rules and cost sections (actions only)
   * - showIgnoreButton: Show ignore button (events only)
   */
  
  import { createEventDispatcher } from 'svelte';
  import { getSkillBonuses } from '../../../services/pf2e';
  
  // Sub-components
  import CheckCardHeader from './CheckCard/components/CheckCardHeader.svelte';
  import CheckCardDescription from './CheckCard/components/CheckCardDescription.svelte';
  import CompletionNotifications from './CheckCard/components/CompletionNotifications.svelte';
  import SkillTag from './CheckCard/components/SkillTag.svelte';
  import PossibleOutcomes from './PossibleOutcomes.svelte';
  import OutcomesSection from './CheckCard/components/OutcomesSection.svelte';
  import AdditionalInfo from './CheckCard/components/AdditionalInfo.svelte';
  import OutcomeDisplay from './OutcomeDisplay/OutcomeDisplay.svelte';
  
  // Required props
  export let id: string;
  export let name: string;
  export let description: string;
  export let skills: Array<{ skill: string; description?: string }> = [];
  export let outcomes: Array<{
    type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    description: string;
    modifiers?: Array<{ resource: string; value: number }>;
  }>;
  export let checkType: 'action' | 'event' | 'incident' = 'action';
  export let traits: string[] = [];  // For events/incidents
  
  // Feature flags
  export let expandable: boolean = false;  // Actions only
  export let showCompletions: boolean = false;  // Actions only
  export let showAvailability: boolean = false;  // Actions only
  export let showSpecial: boolean = false;  // Actions only
  export let showIgnoreButton: boolean = false;  // Events only
  
  // Optional props for different check types
  export let brief: string = '';
  export let special: string | null = null;
  export let cost: Map<string, number> | null = null;
  
  // State props
  export let expanded: boolean = false;
  export let available: boolean = true;
  export let missingRequirements: string[] = [];
  export let resolved: boolean = false;
  export let resolution: {
    outcome: string;
    actorName: string;
    skillName?: string;
    effect: string;
    stateChanges?: Record<string, any>;
    modifiers?: any[];
    manualEffects?: string[];
    shortfallResources?: string[];
    rollBreakdown?: any;
    isIgnored?: boolean;  // Flag to hide reroll button for ignored events
  } | null = null;
  
  // Display configuration
  export let isViewingCurrentPhase: boolean = true;
  export let possibleOutcomes: any[] = [];
  export let showAidButton: boolean = false;
  export let aidResult: { outcome: string; bonus: number } | null = null;
  
  // UI customization props
  export let canPerformMore: boolean = true;  // NOT used for blocking, only for parent logic
  export let currentFame: number = 0;
  export let showFameReroll: boolean = true;
  export let resolvedBadgeText: string = 'Resolved';
  export let primaryButtonLabel: string = 'OK';
  export let skillSectionTitle: string = 'Choose Skill:';
  export let debugMode: boolean = true;
  
  // Computed: Don't show aid button on aid actions themselves
  $: isAidAction = id.startsWith('aid-');
  $: effectiveShowAidButton = showAidButton && !isAidAction;
  
  const dispatch = createEventDispatcher();
  
  // UI state only (not business logic)
  let isRolling: boolean = false;
  let localUsedSkill: string = '';
  let outcomeApplied: boolean = false;  // Track if outcome has been applied
  
  // Get skill bonuses for all skills
  $: skillBonuses = getSkillBonuses(skills.map(s => s.skill));
  
  // Get the skill that was used
  $: usedSkill = resolution?.skillName || localUsedSkill || '';
  
  // UI handlers - all delegate to parent
  function toggleExpanded() {
    if (expandable) {
      dispatch('toggle');
    }
  }
  
  function handleSkillClick(skill: string) {
    if (isRolling || !isViewingCurrentPhase || resolved) return;
    
    isRolling = true;
    localUsedSkill = skill;
    
    // Ensure the card stays expanded when rolling (if expandable)
    if (expandable && !expanded) {
      dispatch('toggle');
    }
    
    dispatch('executeSkill', {
      skill,
      checkId: id,
      checkName: name,
      checkType
    });
    
    // Parent will reset isRolling via resolved/resolution props
    setTimeout(() => { isRolling = false; }, 100);
  }
  
  function handleAidClick() {
    dispatch('aid', {
      checkId: id,
      checkName: name
    });
  }
  
  function handleIgnoreClick() {
    if (checkType !== 'event') return;
    
    dispatch('ignore', {
      checkId: id,
      checkName: name
    });
  }
  
  function handleApplyResult(event: CustomEvent) {
    // NEW ARCHITECTURE: Forward ResolutionData directly from OutcomeDisplay
    // event.detail is already a ResolutionData object (numericModifiers, manualEffects, complexActions)
    console.log('📤 [BaseCheckCard] Forwarding ResolutionData:', event.detail);
    
    dispatch('primary', {
      checkId: id,
      checkType,
      resolution: event.detail  // ResolutionData from OutcomeDisplay
    });
    
    // For player actions, reset resolution state to allow other players
    // (Events and Incidents don't reset - they're one-time)
    if (checkType === 'action') {
      resolved = false;
      resolution = null;
      localUsedSkill = '';
    } else {
      // For events/incidents, mark as applied (one-time only)
      outcomeApplied = true;
    }
  }
  
  function handleCancel() {
    dispatch('cancel', {
      checkId: id,
      checkType
    });
    
    // Reset local UI state
    isRolling = false;
    localUsedSkill = '';
  }
  
  function handlePerformReroll(event: CustomEvent) {
    const { skill, previousFame } = event.detail;
    dispatch('performReroll', {
      checkId: id,
      skill,
      previousFame,
      checkType
    });
  }
  
  function handleDebugOutcomeChange(event: CustomEvent) {
    dispatch('debugOutcomeChanged', {
      checkId: id,
      outcome: event.detail.outcome
    });
  }
  
  // Format possible outcomes for OutcomesSection (actions only)
  $: formattedOutcomes = outcomes.map(o => ({
    result: o.type,
    label: o.type === 'criticalSuccess' ? 'Critical Success' :
           o.type === 'success' ? 'Success' :
           o.type === 'failure' ? 'Failure' : 'Critical Failure',
    description: o.description,
    modifiers: o.modifiers || []
  }));
  
  // Get card state class - never show as fully resolved for actions
  $: cardStateClass = resolved && checkType !== 'action' ? 'result-state' : 'select-state';
</script>

<div class="base-check-card {checkType}-card {!available ? 'not-available' : ''} {expandable && expanded ? 'expanded' : ''} {cardStateClass}">
  <!-- Header for all card types -->
  <CheckCardHeader
    {name}
    {brief}
    {resolved}
    {available}
    {expanded}
    {resolvedBadgeText}
    {missingRequirements}
    {traits}
    {expandable}
    on:toggle={toggleExpanded}
  />
  
  {#if !expandable || expanded}
    <div class="card-details" class:no-border={!expandable}>
      <!-- Description -->
      <CheckCardDescription {description} />
      
      <!-- Completion notifications (actions only, stacked results from all players) -->
      {#if showCompletions}
        <CompletionNotifications actionId={id} />
      {/if}
      
      {#if resolved && resolution}
        <!-- After resolution: Show OutcomeDisplay -->
        <OutcomeDisplay
          outcome={resolution.outcome}
          actorName={resolution.actorName}
          skillName={usedSkill}
          effect={resolution.effect}
          stateChanges={resolution.stateChanges || {}}
          modifiers={resolution.modifiers || []}
          manualEffects={resolution.manualEffects || []}
          shortfallResources={resolution.shortfallResources || []}
          rollBreakdown={resolution.rollBreakdown}
          isIgnored={resolution.isIgnored || false}
          applied={outcomeApplied}
          {primaryButtonLabel}
          {showFameReroll}
          {debugMode}
          on:primary={handleApplyResult}
          on:cancel={handleCancel}
          on:performReroll={handlePerformReroll}
          on:debugOutcomeChanged={handleDebugOutcomeChange}
        />
      {:else}
        <!-- Before resolution: Show skills and possible outcomes -->
        {#if possibleOutcomes.length > 0}
          {#if expandable}
            <!-- Actions use OutcomesSection -->
            <OutcomesSection possibleOutcomes={formattedOutcomes} />
          {:else}
            <!-- Events/Incidents use PossibleOutcomes -->
            <PossibleOutcomes outcomes={possibleOutcomes} showTitle={false} />
          {/if}
        {/if}
        
        <!-- Availability notice for non-expandable cards (events/incidents) -->
        {#if !expandable && !available && missingRequirements.length > 0}
          <div class="availability-notice-banner">
            <i class="fas fa-exclamation-triangle"></i>
            <span class="requirements-label">Requires:</span>
            <span class="requirements-text">{missingRequirements.join(', ')}</span>
          </div>
        {/if}
        
        <!-- Skills section - only show when not resolved or when action (actions can have multiple resolutions) -->
        {#if skills && skills.length > 0 && (!resolved || checkType === 'action')}
          <div class="skill-options">
            <div class="skill-options-header">
              <div class="skill-options-title">{skillSectionTitle}</div>
              {#if showIgnoreButton && checkType === 'event'}
                <button
                  class="ignore-button-inline"
                  disabled={isRolling || !isViewingCurrentPhase || resolved}
                  on:click={handleIgnoreClick}
                  title="Ignore this event and apply failure effects"
                >
                  <i class="fas fa-times-circle"></i>
                  Ignore Event
                </button>
              {/if}
            </div>
            <div class="skill-tags">
              <!-- Aid Another button/badge as first item if enabled (but not on aid actions themselves) -->
              {#if effectiveShowAidButton}
                {#if aidResult && aidResult.bonus > 0}
                  <!-- Aid result badge - shown after successful aid check completes -->
                  <div class="aid-result-badge-inline {aidResult.outcome === 'criticalSuccess' ? 'critical-success' : aidResult.outcome === 'success' ? 'success' : 'failure'}">
                    <i class="fas fa-hands-helping"></i>
                    <span>
                      Aid - {aidResult.outcome === 'criticalSuccess' ? `Critical (+${aidResult.bonus}, keep higher)` : `+${aidResult.bonus}`}
                    </span>
                  </div>
                {:else}
                  <!-- Aid Another button - shown before aid check or if aid failed -->
                  <button 
                    class="aid-button-inline"
                    on:click={handleAidClick}
                    disabled={isRolling || !isViewingCurrentPhase || (resolved && checkType !== 'action')}
                  >
                    <i class="fas fa-hands-helping"></i>
                    Aid Another
                  </button>
                {/if}
              {/if}
              
              {#each skills as skillOption}
                {@const bonus = skillBonuses.get(skillOption.skill) ?? null}
                <SkillTag
                  skill={skillOption.skill}
                  description={skillOption.description || ''}
                  bonus={bonus}
                  selected={localUsedSkill === skillOption.skill}
                  disabled={isRolling || !isViewingCurrentPhase || (resolved && checkType !== 'action') || (!available && showAvailability)}
                  loading={isRolling && localUsedSkill === skillOption.skill}
                  on:execute={() => handleSkillClick(skillOption.skill)}
                />
              {/each}
            </div>
          </div>
        {/if}
      {/if}
      
      <!-- Special rules or costs (actions only) -->
      {#if showSpecial}
        <AdditionalInfo {special} {cost} />
      {/if}
      
      <!-- Slot for additional content specific to check type -->
      <slot name="additional-content"></slot>
    </div>
  {/if}
</div>

<style lang="scss">
  .base-check-card {
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
    }
  }
  
  .card-details {
    padding: 16px;
    border-top: 1px solid var(--border-subtle);
    text-align: left;
    
    &.no-border {
      border-top: none;
    }
  }
  
  .skill-options {
    margin: 20px 0;
    
    .skill-options-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      gap: 15px;
      flex-wrap: wrap;
    }
    
    .skill-options-title {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.4;
      color: var(--text-primary);
      flex: 1;
    }
    
    .ignore-button-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: var(--radius-md);
      color: var(--color-red);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      
      i {
        font-size: var(--font-md);
      }
      
      &:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.6);
        transform: translateY(-1px);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .availability-notice-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      
      i {
        color: var(--color-amber);
        font-size: var(--font-md);
      }
      
      .requirements-label {
        color: var(--color-amber);
        font-weight: var(--font-weight-medium);
      }
      
      .requirements-text {
        color: var(--text-secondary);
      }
    }
  }
  
  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .aid-button-inline {
    padding: 10px 16px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(96, 165, 250, 0.5);
    border-radius: var(--radius-sm);
    color: rgb(147, 197, 253);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    white-space: nowrap;
  }
  
  .aid-button-inline:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(96, 165, 250, 0.7);
    color: rgb(191, 219, 254);
    transform: translateY(-1px);
  }
  
  .aid-button-inline:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .aid-result-badge-inline {
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  
  .aid-result-badge-inline.critical-success {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: rgb(59, 130, 246);
  }
  
  .aid-result-badge-inline.success {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.4);
    color: rgb(34, 197, 94);
  }
  
  .aid-result-badge-inline.failure {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: rgb(239, 68, 68);
  }
  
  .traits-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
    margin-bottom: 8px;
  }
  
  .trait-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(100, 116, 139, 0.1);
    border: 1px solid rgba(100, 116, 139, 0.2);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1.2;
    letter-spacing: 0.05em;
    color: var(--text-tertiary);
    text-transform: capitalize;
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
