<script lang="ts">
  /**
   * @deprecated This component has been replaced by BaseCheckCard.svelte
   * 
   * EventCard - Pure presentation component for event/incident resolution
   * 
   * This component handles the common UI pattern of:
   * - Skill selection
   * - Possible outcomes display
   * - Result display after resolution
   * 
   * All business logic is handled by the parent component through events
   * 
   * **Migration Path:**
   * - Replace EventCard usage with BaseCheckCard
   * - Map props: item → id, name, description, skills
   * - Build outcomes array from item.effects
   * - Change on:applyResult → on:primary
   * - See EventsPhase.svelte, UnrestPhase.svelte, or OngoingEventCard.svelte for examples
   */
  
  import { createEventDispatcher } from 'svelte';
  import SkillTag from './CheckCard/components/SkillTag.svelte';
  import PossibleOutcomes from './PossibleOutcomes.svelte';
  import OutcomeDisplay from './OutcomeDisplay/OutcomeDisplay.svelte';
  
  // Required props
  export let checkType: 'event' | 'incident';
  export let item: any;  // Event or Incident data
  export let isViewingCurrentPhase: boolean = true;
  
  // Display configuration
  export let showPossibleOutcomes: boolean = true;
  export let possibleOutcomes: any[] = [];
  export let showAidButton: boolean = false;
  export let aidResult: { outcome: string; bonus: number } | null = null;
  export let showIgnoreButton: boolean = false;  // For events only
  
  // State from parent (resolution data)
  export let resolved: boolean = false;
  export let resolution: {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName: string;
    effect: string;
    stateChanges?: Record<string, any>;
    modifiers?: any[];
    manualEffects?: string[];
    shortfallResources?: string[];
    rollBreakdown?: any;
  } | null = null;
  
  // UI customization
  export let showFameReroll: boolean = true;
  export let debugMode: boolean = false;
  
  // Check if current user is GM
  $: isGM = (globalThis as any).game?.user?.isGM || false;
  $: effectiveDebugMode = debugMode || isGM;
  
  const dispatch = createEventDispatcher();
  
  // UI state only (not business logic)
  let isRolling = false;
  let localSelectedSkill = '';
  
  // Get the skill that was used
  $: usedSkill = resolution?.skillName || localSelectedSkill || '';
  
  // UI handlers - all delegate to parent
  function handleSkillClick(skill: string) {
    if (isRolling || !isViewingCurrentPhase || resolved) return;
    
    isRolling = true;
    localSelectedSkill = skill;
    
    dispatch('executeSkill', { 
      skill,
      checkId: item.id,
      checkName: item.name,
      checkType
    });
    
    // Parent will reset isRolling via resolved/resolution props
    setTimeout(() => { isRolling = false; }, 100);
  }
  
  function handleAidClick() {
    dispatch('aid', {
      checkId: item.id,
      checkName: item.name
    });
  }
  
  function handleIgnoreClick() {
    if (checkType !== 'event') return;
    
    dispatch('ignore', {
      checkId: item.id,
      checkName: item.name
    });
  }
  
  function handleApplyResult() {
    dispatch('applyResult', {
      checkId: item.id,
      checkType,
      resolution
    });
  }
  
  function handleCancel() {
    dispatch('cancel', {
      checkId: item.id,
      checkType
    });
    
    // Reset local UI state
    isRolling = false;
    localSelectedSkill = '';
  }
  
  function handleReroll() {
    dispatch('reroll', {
      checkId: item.id,
      skill: usedSkill,
      checkType
    });
  }
  
  function handleDebugOutcomeChange(event: CustomEvent) {
    dispatch('debugOutcomeChanged', {
      checkId: item.id,
      outcome: event.detail.outcome
    });
  }
</script>

<div class="event-card">
  {#if !resolved}
    <!-- Before resolution: Show skills and possible outcomes -->
    {#if showPossibleOutcomes && possibleOutcomes.length > 0}
      <PossibleOutcomes outcomes={possibleOutcomes} showTitle={false} />
    {/if}
    
    {#if item?.skills && item.skills.length > 0}
      <div class="skill-options">
        <div class="skill-options-header">
          <div class="skill-options-title">Choose Your Response:</div>
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
          <!-- Aid Another button/badge as first item if enabled -->
          {#if showAidButton}
            {#if aidResult}
              <!-- Aid result badge - shown after aid check completes -->
              <div class="aid-result-badge-inline {aidResult.outcome === 'criticalSuccess' ? 'critical-success' : aidResult.outcome === 'success' ? 'success' : 'failure'}">
                <i class="fas fa-hands-helping"></i>
                <span>
                  Aid - {aidResult.outcome === 'criticalSuccess' ? `Critical (+${aidResult.bonus}, keep higher)` : `+${aidResult.bonus}`}
                </span>
              </div>
            {:else}
              <!-- Aid Another button - shown before aid check -->
              <button 
                class="aid-button-inline"
                on:click={handleAidClick}
                disabled={isRolling || !isViewingCurrentPhase || resolved}
              >
                <i class="fas fa-hands-helping"></i>
                Aid Another
              </button>
            {/if}
          {/if}
          
          {#each item.skills as skillOption}
            <SkillTag
              skill={skillOption.skill}
              description={skillOption.description || ''}
              selected={localSelectedSkill === skillOption.skill}
              disabled={isRolling || !isViewingCurrentPhase || resolved}
              loading={isRolling && localSelectedSkill === skillOption.skill}
              on:execute={() => handleSkillClick(skillOption.skill)}
            />
          {/each}
        </div>
      </div>
    {/if}
  {:else if resolution}
    <!-- After resolution: Show OutcomeDisplay -->
    <OutcomeDisplay
      checkId={item.id}
      outcome={resolution.outcome}
      actorName={resolution.actorName}
      skillName={usedSkill}
      effect={resolution.effect}
      stateChanges={resolution.stateChanges || {}}
      modifiers={resolution.modifiers || []}
      manualEffects={resolution.manualEffects || []}
      shortfallResources={resolution.shortfallResources || []}
      rollBreakdown={resolution.rollBreakdown}
      applied={false}
      primaryButtonLabel="Apply Result"
      {showFameReroll}
      debugMode={effectiveDebugMode}
      on:primary={handleApplyResult}
      on:cancel={handleCancel}
      on:reroll={handleReroll}
      on:debugOutcomeChanged={handleDebugOutcomeChange}
    />
  {/if}
</div>

<style lang="scss">
  .event-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-20);
  }
  
  .skill-options {
    margin: var(--space-20) 0;
    
    .skill-options-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-16);
      gap: var(--space-16);
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
      gap: var(--space-6);
      padding: var(--space-6) var(--space-12);
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--border-primary);
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
        border-color: var(--border-primary-medium);
        transform: translateY(-0.0625rem);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
    background: rgba(59, 130, 246, 0.15);
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
    background: rgba(59, 130, 246, 0.25);
    border-color: var(--border-info-strong);
    color: rgb(191, 219, 254);
    transform: translateY(-0.0625rem);
  }
  
  .aid-button-inline:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .aid-result-badge-inline {
    padding: var(--space-10) var(--space-16);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  
  .aid-result-badge-inline.critical-success {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid var(--border-info);
    color: rgb(59, 130, 246);
  }
  
  .aid-result-badge-inline.success {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid var(--border-success);
    color: rgb(34, 197, 94);
  }
  
  .aid-result-badge-inline.failure {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid var(--border-primary);
    color: rgb(239, 68, 68);
  }
</style>
