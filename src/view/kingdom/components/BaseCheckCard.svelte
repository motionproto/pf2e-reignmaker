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
  import { getSkillBonuses, getCurrentUserCharacter } from '../../../services/pf2e';
  import { pf2eSkillService } from '../../../services/pf2e/PF2eSkillService';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { TurnPhase } from '../../../actors/KingdomActor';
  import { structuresService } from '../../../services/structures';
  
  // Sub-components
  import CheckCardHeader from './CheckCard/components/CheckCardHeader.svelte';
  import CheckCardDescription from './CheckCard/components/CheckCardDescription.svelte';
  import CompletionNotifications from './CheckCard/components/CompletionNotifications.svelte';
  import SkillTag from './CheckCard/components/SkillTag.svelte';
  import PossibleOutcomes from './PossibleOutcomes.svelte';
  import OutcomesSection from './CheckCard/components/OutcomesSection.svelte';
  import AdditionalInfo from './CheckCard/components/AdditionalInfo.svelte';
  import OutcomeRenderer from './OutcomeRenderer.svelte';
  import ActionConfirmDialog from './ActionConfirmDialog.svelte';
  import PreRollChoiceSelector from './CheckCard/components/PreRollChoiceSelector.svelte';
  
  import type { OutcomePreview } from '../../../models/OutcomePreview';
  
  // Required props
  export let id: string;
  export let name: string;
  export let description: string;
  export let skills: Array<{ skill: string; description?: string }> = [];
  export let conditionalSkills: any[] | undefined = undefined;  // Conditional skills (type from action-types.ts)
  export let outcomes: Array<{
    type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    description: string;
    modifiers?: Array<{ resource: string; value: number }>;
    gameCommands?: any[];
  }>;
  export let checkType: 'action' | 'event' | 'incident' = 'action';
  export let traits: string[] = [];  // For events/incidents
  export let outcomePreview: OutcomePreview | null = null;  // Full preview for resolution state
  
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
  
  // Migration status tracking
  export let actionStatus: 'untested' | 'testing' | 'tested' | null = null;
  export let actionNumber: number | undefined = undefined;  // Action number for migration badge (1-26)
  
  // Incident status tracking
  export let incidentStatus: 'untested' | 'testing' | 'tested' | null = null;
  export let incidentNumber: number | undefined = undefined;  // Incident number for testing badge (1-30)
  
  // Event status tracking
  export let eventStatus: 'untested' | 'testing' | 'tested' | null = null;
  export let eventNumber: number | undefined = undefined;  // Event number for testing badge (1-37)
  
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
    effectsApplied?: boolean;  // Track if "Apply Result" was clicked (syncs across clients)
  } | null = null;
  
  // Display configuration
  export let isViewingCurrentPhase: boolean = true;
  export let possibleOutcomes: any[] = [];
  export let showAidButton: boolean = false;
  export let aidResult: { outcome: string; bonus: number; characterName?: string } | null = null;
  export let hideUntrainedSkills: boolean = true;
  
  // UI customization props
  export let canPerformMore: boolean = true;  // NOT used for blocking, only for parent logic
  export let currentFame: number = 0;
  export let resolvedBadgeText: string = 'Resolved';
  export let skillSectionTitle: string = 'Choose Skill:';
  export let statusBadge: { text: string; type: 'ongoing' | 'resolved' } | null = null;
  
  // Multi-player coordination props
  export let resolutionInProgress: boolean = false;
  export let resolvingPlayerName: string = '';
  export let isBeingResolvedByOther: boolean = false;
  
  // Custom resolution UI component (for inline action-specific UIs)
  export let customResolutionComponent: any = null;  // Svelte component constructor
  export let customResolutionProps: Record<string, any> = {};  // Props to pass to custom component
  
  // NEW: Pre-roll choice configuration
  export let preRollChoice: any = null;  // Pre-roll choice configuration from pipeline (actions)
  export let strategicChoice: any = null;  // Strategic choice configuration from pipeline (events)
  
  // Check if current user is GM
  $: isGM = (globalThis as any).game?.user?.isGM || false;
  
  // Computed: Don't show aid button on aid actions themselves
  $: isAidAction = id?.startsWith('aid-') || false;
  $: effectiveShowAidButton = showAidButton && !isAidAction;
  
  const dispatch = createEventDispatcher();
  
  // UI state only (not business logic)
  let isRolling: boolean = false;
  let localUsedSkill: string = '';
  
  // NEW: Track choice state - read from kingdom store for strategic choices (events)
  // This ensures both debug and production events use the same code path
  $: selectedApproach = isStrategicChoice 
    ? ($kingdomData.turnState?.eventsPhase?.selectedApproach || null)
    : null;
  
  // Computed: Which choice system are we using?
  $: activeChoice = strategicChoice || preRollChoice;
  $: isStrategicChoice = !!strategicChoice;  // Events use strategic choice (affects when to show outcomes)
  
  // Computed: Display name with strategic choice appended (e.g., "Criminal Trial: Harsh Punishment")
  $: displayName = (() => {
    if (!selectedApproach || !activeChoice?.options) return name;
    
    const option = activeChoice.options.find((o: any) => o.id === selectedApproach);
    if (!option) return name;
    
    return `${name}: ${option.label}`;
  })();
  
  // Build display preview from outcomePreview (reactive to kingdom store) OR resolution (fallback)
  // IMPORTANT: Use outcomePreview when available as it's reactive to store updates in Step 5
  $: displayPreview = (outcomePreview || resolution) ? (outcomePreview ? {
    // Use outcomePreview (reactive to kingdom store updates)
    previewId: outcomePreview.previewId,
    checkType: outcomePreview.checkType,
    checkId: outcomePreview.checkId,
    checkData: outcomePreview.checkData,
    createdTurn: outcomePreview.createdTurn,
    status: outcomePreview.status,
    appliedOutcome: outcomePreview.appliedOutcome,
    metadata: outcomePreview.metadata
  } as OutcomePreview : {
    // Fallback to resolution (non-reactive)
    previewId: `${id}-${Date.now()}`,
    checkType: checkType,
    checkId: id,
    checkData: { name, description },
    createdTurn: $kingdomData.currentTurn || 0,
    status: 'resolved' as const,
    appliedOutcome: {
      outcome: resolution!.outcome as any,
      actorName: resolution!.actorName,
      skillName: usedSkill,
      effect: resolution!.effect,
      stateChanges: resolution!.stateChanges || {},
      modifiers: resolution!.modifiers || [],
      manualEffects: resolution!.manualEffects || [],
      shortfallResources: resolution!.shortfallResources || [],
      rollBreakdown: resolution!.rollBreakdown,
      isIgnored: resolution!.isIgnored || false,
      effectsApplied: outcomeApplied,
      
      componentName: (resolution! as any).componentName || 
        (customResolutionComponent 
          ? (customResolutionComponent.name || '').replace(/^Proxy<(.+)>$/, '$1')
          : undefined),
      componentProps: customResolutionProps
    }
  } satisfies OutcomePreview) : null;
  
  // Internal confirmation dialog state
  let showOwnConfirmDialog: boolean = false;
  let pendingSkill: string = '';
  
  // ✅ READ applied state from resolution (synced across all clients via KingdomActor)
  $: outcomeApplied = resolution?.effectsApplied || false;
  
  /**
   * Check if a skill condition is met
   */
  function isConditionMet(condition: any): boolean {
    if (condition.type === 'structure') {
      return structuresService.checkStructureCondition(condition.family, condition.minTier);
    }
    return false;
  }
  
  /**
   * Filter skills based on conditional requirements
   */
  $: availableSkills = conditionalSkills
    ? skills.filter(skillOption => {
        // Check if this skill has any conditional requirements
        for (const group of conditionalSkills) {
          if (group.skills.includes(skillOption.skill)) {
            // This skill requires a condition to be met
            return isConditionMet(group.condition);
          }
        }
        // No conditional requirement = always available
        return true;
      })
    : skills;
  
  // Inject "applicable-lore" as a global option for all checks, then filter untrained if needed
  let baseSkillsWithLore: Array<{ skill: string; description?: string }> = [];
  $: baseSkillsWithLore = [
    ...availableSkills,
    { skill: 'applicable lore', description: 'relevant expertise' }
  ];
  
  // Filter untrained skills if hideUntrainedSkills is enabled
  $: skillsWithLore = (() => {
    if (!hideUntrainedSkills) {
      return baseSkillsWithLore;
    }
    
    const currentCharacter = getCurrentUserCharacter();
    if (!currentCharacter) {
      return baseSkillsWithLore;
    }
    
    return baseSkillsWithLore.filter(skillOption => {
      const skillName = skillOption.skill.toLowerCase();
      
      // Always show lore skills (hard to determine proficiency dynamically)
      if (skillName.includes('lore')) {
        return true;
      }
      
      // Check proficiency for other skills
      return pf2eSkillService.isCharacterProficientInSkill(currentCharacter, skillOption.skill);
    });
  })();
  
  // NEW: Filter skills based on selected approach (for choice-based events/actions)
  $: effectiveSkills = selectedApproach && activeChoice?.options
    ? skillsWithLore.filter(s => {
        const option = activeChoice.options.find((o: any) => o.id === selectedApproach);
        return option?.skills?.includes(s.skill);
      })
    : skillsWithLore;
  
  // Get skill bonuses for all skills (including injected lore)
  $: skillBonuses = getSkillBonuses(skillsWithLore.map(s => s.skill));
  
  // Get the skill that was used
  $: usedSkill = resolution?.skillName || localUsedSkill || '';
  
  // Check if player has already acted (read from Single Source of Truth)
  function hasPlayerActedCheck(): boolean {
    const game = (globalThis as any).game;
    if (!game?.user?.id) return false;
    
    const actionLog = $kingdomData.turnState?.actionLog || [];
    return actionLog.some((entry: any) => 
      entry.playerId === game.user.id && 
      (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
    );
  }
  
  // UI handlers - all delegate to parent
  function toggleExpanded() {
    if (expandable) {
      dispatch('toggle');
    }
  }
  
  function handleSkillClick(skill: string) {
    if (isRolling || !isViewingCurrentPhase || resolved) return;
    
    // Check if player has already acted (for actions and events, not incidents)
    if (hasPlayerActedCheck() && (checkType === 'action' || checkType === 'event') && !resolved) {
      // Show own confirmation dialog
      pendingSkill = skill;
      showOwnConfirmDialog = true;
      return;
    }
    
    // Proceed with skill execution
    executeSkillNow(skill);
  }
  
  function handleConfirmationApproved() {
    showOwnConfirmDialog = false;
    executeSkillNow(pendingSkill);
    pendingSkill = '';
  }
  
  function handleConfirmationCancelled() {
    showOwnConfirmDialog = false;
    pendingSkill = '';
  }
  
  function executeSkillNow(skill: string) {
    isRolling = true;
    localUsedSkill = skill;
    
    // Ensure the card stays expanded when rolling (if expandable)
    if (expandable && !expanded) {
      dispatch('toggle');
    }
    
    dispatch('executeSkill', {
      skill,
      checkId: id,
      eventId: id,  // For events/incidents, eventId is the same as checkId
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
    console.log('🔵 [BaseCheckCard] handleApplyResult called', {
      checkId: id,
      checkType,
      resolutionData: event.detail
    });

    dispatch('primary', {
      checkId: id,
      checkType,
      resolution: event.detail  // ResolutionData from OutcomeDisplay
    });
    
    console.log('🔵 [BaseCheckCard] Dispatched primary event to parent');
    
    // ✅ DON'T reset state here - let PipelineCoordinator handle cleanup
    // PipelineCoordinator will delete the instance in step9_cleanup after Steps 7-9 complete
    // This prevents the flash where the card reverts to default state prematurely
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
  
  // NEW: Handle approach selection
  function handleApproachSelect(event: CustomEvent) {
    const { optionId } = event.detail;
    selectedApproach = optionId;
    
    // Dispatch to parent to store in metadata
    dispatch('approachSelected', { approach: optionId });
  }
  
  // Format possible outcomes for OutcomesSection (actions only)
  $: formattedOutcomes = (outcomes || []).map(o => ({
    result: o.type,
    label: o.type === 'criticalSuccess' ? 'Critical Success' :
           o.type === 'success' ? 'Success' :
           o.type === 'failure' ? 'Failure' : 'Critical Failure',
    description: o.description,
    modifiers: (o.modifiers || []) as any,  // Cast to any - old format compatibility
    gameCommands: o.gameCommands || [],
    manualEffects: [],  // No manual effects for basic outcomes
    outcomeBadges: []   // No outcome badges for basic outcomes
  }));
  
  // Get card state class - never show as fully resolved for actions
  $: cardStateClass = resolved && checkType !== 'action' ? 'result-state' : 'select-state';
</script>

<div class="base-check-card {checkType}-card {!available ? 'not-available' : ''} {expandable && expanded ? 'expanded' : ''} {cardStateClass}">
  <!-- Header for all card types -->
  <CheckCardHeader
    name={displayName}
    {brief}
    {resolved}
    {available}
    {expanded}
    {resolvedBadgeText}
    {missingRequirements}
    {traits}
    {expandable}
    {statusBadge}
    {actionStatus}
    {actionNumber}
    {incidentStatus}
    {incidentNumber}
    {eventStatus}
    {eventNumber}
    on:toggle={toggleExpanded}
  />
  
  {#if !expandable || expanded}
    <div class="card-details" class:no-border={!expandable}>
      <!-- Description -->
      <CheckCardDescription {description} {brief} />
      
      <!-- Slot for content before completion tracking (e.g., CommerceTierInfo) -->
      <slot name="pre-completion-content"></slot>
      
      {#if resolved && displayPreview}
        <!-- After resolution: Show OutcomeRenderer -->
        <OutcomeRenderer
          preview={displayPreview}
          instance={outcomePreview}
          on:primary={handleApplyResult}
          on:cancel={handleCancel}
          on:performReroll={handlePerformReroll}
          on:customSelection
        />
      {:else}
        <!-- Availability notice for expandable cards (actions) when expanded -->
        {#if expandable && !available && missingRequirements.length > 0}
          <div class="availability-notice-banner">
            <i class="fas fa-exclamation-triangle"></i>
            <span class="requirements-label">Requirements not met:</span>
            <span class="requirements-text">{missingRequirements.join(', ')}</span>
          </div>
        {/if}
        
        <!-- Availability notice for non-expandable cards (events/incidents) -->
        {#if !expandable && !available && missingRequirements.length > 0}
          <div class="availability-notice-banner">
            <i class="fas fa-exclamation-triangle"></i>
            <span class="requirements-label">Requires:</span>
            <span class="requirements-text">{missingRequirements.join(', ')}</span>
          </div>
        {/if}
        
        <!-- Completion notifications (actions only) -->
        {#if showCompletions}
          <CompletionNotifications actionId={id} />
        {/if}
        
        <!-- Skills section (MOVED BEFORE OUTCOMES) -->
        {#if skills && skills.length > 0 && (!resolved || checkType === 'action')}
          <div class="skill-options">
            <slot name="pre-skill-content"></slot>
            
            <!-- Choice selector OR skill tags -->
            {#if activeChoice && !selectedApproach && !resolved}
              <PreRollChoiceSelector
                label={activeChoice.label}
                options={activeChoice.options}
                disabled={isRolling || !isViewingCurrentPhase}
                showIgnoreButton={showIgnoreButton && checkType === 'event'}
                eventId={id}
                enableVoting={checkType === 'event'}
                on:select={handleApproachSelect}
                on:ignore={handleIgnoreClick}
              />
            {:else}
              <div class="skill-options-header">
                <div class="skill-options-title">{skillSectionTitle}</div>
              </div>
              <div class="skill-tags">
                {#if effectiveShowAidButton}
                  {#if aidResult && aidResult.bonus !== 0}
                    <div class="aid-result-badge-inline {aidResult.outcome === 'criticalSuccess' ? 'critical-success' : aidResult.outcome === 'success' ? 'success' : 'failure'}">
                      <i class="fas fa-hands-helping"></i>
                      <span>
                        {#if aidResult.outcome === 'criticalSuccess'}
                          Aid by {aidResult.characterName || 'Unknown'}: +{aidResult.bonus} (keep higher)
                        {:else if aidResult.bonus > 0}
                          Aid by {aidResult.characterName || 'Unknown'}: +{aidResult.bonus}
                        {:else}
                          Aid by {aidResult.characterName || 'Unknown'}: {aidResult.bonus}
                        {/if}
                      </span>
                    </div>
                  {:else}
                    <button 
                      class="aid-button-inline"
                      on:click={handleAidClick}
                      disabled={isRolling || !isViewingCurrentPhase || (resolved && checkType !== 'action') || (!available && showAvailability) || isBeingResolvedByOther}
                    >
                      <i class="fas fa-hands-helping"></i>
                      Aid Another
                    </button>
                  {/if}
                {/if}
                
                {#each effectiveSkills as skillOption}
                  {@const bonus = skillBonuses.get(skillOption.skill) ?? null}
                  <SkillTag
                    skill={skillOption.skill}
                    description={skillOption.description || ''}
                    bonus={bonus}
                    selected={localUsedSkill === skillOption.skill}
                    disabled={isRolling || !isViewingCurrentPhase || (resolved && checkType !== 'action') || (!available && showAvailability) || isBeingResolvedByOther}
                    loading={isRolling && localUsedSkill === skillOption.skill}
                    on:execute={() => handleSkillClick(skillOption.skill)}
                  />
                {/each}
              </div>
            {/if}
            
            {#if isBeingResolvedByOther}
              <div class="resolution-progress-notice">
                <i class="fas fa-user-clock"></i>
                <span>{resolvingPlayerName} is currently resolving this event...</span>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Possible Outcomes section (MOVED AFTER SKILLS) -->
        {#if isStrategicChoice && !selectedApproach}
          <!-- STATE 1: Strategic choice only (hide outcomes until choice made) -->
        {:else}
          <!-- STATE 2: Show possible outcomes (after choice or no choice needed) -->
          {#if (possibleOutcomes?.length || 0) > 0 || (expandable && (formattedOutcomes?.length || 0) > 0)}
            {#if expandable}
              <!-- Actions use OutcomesSection -->
              <OutcomesSection possibleOutcomes={formattedOutcomes} />
            {:else}
              <!-- Events/Incidents use PossibleOutcomes -->
              <PossibleOutcomes outcomes={possibleOutcomes} showTitle={false} />
            {/if}
          {/if}
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

<!-- Internal Confirmation Dialog (for actions only) -->
<ActionConfirmDialog
  bind:show={showOwnConfirmDialog}
  on:confirm={handleConfirmationApproved}
  on:cancel={handleConfirmationCancelled}
/>

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
        height: 0.1875rem;
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
      border-color: var(--border-faint);
    }
    
    // Hover states for select state
    &.select-state:hover:not(.disabled):not(.expanded) {
      border-color: var(--border-strong);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    &.select-state.expanded {
      border-color: var(--accent-color);
      box-shadow: 0 0.25rem 0.75rem rgba(var(--accent-color), 0.1);
      
      &:hover:not(.disabled) {
        transform: translateY(-0.0625rem);
        box-shadow: 0 0.375rem 1rem rgba(var(--accent-color), 0.15);
      }
    }
    
    // Result state has different hover behavior
    &.result-state:hover:not(.disabled) {
      transform: none;
      box-shadow: 0 0.125rem 0.25rem var(--overlay-lower);
    }
    
    &.result-state.expanded {
      border-color: var(--border-success-subtle);
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    // Style for unavailable actions
    &.not-available {
      // Remove parent opacity - apply targeted opacity to children instead
      background: linear-gradient(135deg,
        rgba(24, 24, 27, 0.5),
        rgba(31, 31, 35, 0.4));
      border-color: var(--border-faint);
      
      // Dim header content except requirements badge
      :global(.card-header-content) {
        opacity: 0.85;
      }
      
      // Keep requirements badge at full opacity (overrides header opacity)
      :global(.requirements-badge) {
        opacity: 1;
      }
      
      // Dim card details content except warning banner
      .card-details > :not(.skill-options) {
        opacity: 0.85;
      }
      
      // For skill-options section, dim all children except the warning banner
      .skill-options > * {
        opacity: 0.85;
      }
      
      // Keep warning banner at full opacity (overrides above)
      .availability-notice-banner {
        opacity: 1;
      }
    }
  }
  
  .card-details {
    padding: var(--space-16);
    border-top: 1px solid var(--border-faint);
    text-align: left;
    
    &.no-border {
      border-top: none;
      padding-top: 0;
    }
  }
  
  .skill-options {
    margin: var(--space-16) 0;
    
    .skill-options-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-12);
      gap: var(--space-16);
      flex-wrap: wrap;
    }
    
    .skill-options-title {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      line-height: 1.4;
      color: var(--text-primary);
      flex: 1;
    }
    
    .ignore-button-inline {
      padding: var(--space-10) var(--space-16);
      background: var(--surface-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      color: var(--color-red);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      
      &:hover:not(:disabled) {
        background: var(--surface-primary-high);
        border-color: var(--border-primary-medium);
        transform: translateY(-0.0625rem);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .availability-notice-banner {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-12) var(--space-16);
      margin-bottom: var(--space-16);
      background: var(--surface-accent);
      border: 1px solid var(--border-accent);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      opacity: 1;  // Reset parent's 0.85 opacity to keep warning visible
      
      i {
        color: var(--color-amber);
        font-size: var(--font-sm);
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
    gap: var(--space-10);
  }
  
  .aid-button-inline {
    padding: var(--space-10) var(--space-16);
    background: var(--surface-info);
    border: 1px solid var(--border-info-medium);
    border-radius: var(--radius-sm);
    color: rgb(147, 197, 253);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    font-family: inherit;
    white-space: nowrap;
  }
  
  .aid-button-inline:hover:not(:disabled) {
    background: var(--surface-info-high);
    border-color: var(--border-info-strong);
    color: rgb(191, 219, 254);
    transform: translateY(-0.0625rem);
  }
  
  .aid-button-inline:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .aid-result-badge-inline {
    display: inline-flex;  /* Match SkillTag display */
    align-items: center;
    gap: var(--space-6);  /* Match SkillTag gap */
    padding: var(--space-6) var(--space-16);
    border-radius: 9999px;  /* Pill shape with fully rounded corners */
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    line-height: 1;  /* Match SkillTag line-height */
    white-space: nowrap;
    
    /* Ensure nested span doesn't add height */
    span {
      line-height: 1;
      display: inline;
    }
    
    /* Match icon size to text to prevent extra height */
    i {
      line-height: 1;
      font-size: var(--font-md);  /* Match text size */
    }
  }
  
  .aid-result-badge-inline.critical-success {
    background: var(--surface-info-lower);
    border: 1px solid var(--border-info);
    color: rgb(59, 130, 246);
  }
  
  .aid-result-badge-inline.success {
    background: var(--surface-success-lower);
    border: 1px solid var(--border-success);
    color: rgb(34, 197, 94);
  }
  
  .aid-result-badge-inline.failure {
    background: var(--surface-danger-lower);
    border: 1px solid var(--border-danger);
    color: rgb(239, 68, 68);
  }
  
  .traits-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    margin-top: var(--space-12);
    margin-bottom: var(--space-8);
  }
  
  .trait-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-8);
    background: rgba(100, 116, 139, 0.1);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1.2;
      letter-spacing: 0.05rem;
      color: var(--text-tertiary);
    text-transform: capitalize;
  }
  
  .resolution-progress-notice {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10) var(--space-12);
    margin-top: var(--space-12);
    background: var(--surface-info-low);
    border: 1px solid var(--border-info-subtle);
    border-radius: var(--radius-md);
    color: var(--color-blue-light);
    font-size: var(--font-sm);
    font-style: italic;
    
    i {
      font-size: var(--font-md);
      opacity: 0.8;
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
</style>
