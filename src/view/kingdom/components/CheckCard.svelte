<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createCheckHandler, type CheckConfig, type CheckResult } from '../../../controllers/shared/CheckHandler';
  import { createCheckResultHandler, type DisplayData } from '../../../controllers/shared/CheckResultHandler';
  import SkillTag from './CheckCard/components/SkillTag.svelte';
  import PossibleOutcomes from './PossibleOutcomes.svelte';
  import OutcomeDisplay from './OutcomeDisplay/OutcomeDisplay.svelte';
  
  // Props
  export let checkType: 'event' | 'incident' | 'action';
  export let item: any;
  export let isViewingCurrentPhase: boolean = true;
  export let controller: any;  // Phase-specific controller
  export let showPossibleOutcomes: boolean = true;
  export let possibleOutcomes: any[] = [];
  
  // Check handlers
  let checkHandler: ReturnType<typeof createCheckHandler>;
  let resultHandler: ReturnType<typeof createCheckResultHandler>;
  
  // Internal copy of item - preserves it even if parent clears the prop
  let displayItem: any = null;
  
  // UI state
  let isRolling = false;
  let selectedSkill = '';
  let showResult = false;
  let applied = false;
  
  // Result data for OutcomeDisplay
  let outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' | null = null;
  let actorName = '';
  let effectMessage = '';
  let stateChanges: Record<string, any> = {};
  let modifiers: any[] = [];
  let manualEffects: string[] = [];
  let rollBreakdown: any = null;
  let pendingOutcome: {
    item: any;
    outcome: string;
    effects: Map<string, any>;
  } | null = null;
  
  onMount(() => {
    checkHandler = createCheckHandler();
    resultHandler = createCheckResultHandler(checkType, controller);
  });
  
  // Preserve item when first set or when it changes (unless we're showing an applied result)
  $: if (item && (!displayItem || !applied)) {
    displayItem = item;
  }
  
  async function handleSkillClick(skill: string) {
    if (!displayItem || isRolling || !isViewingCurrentPhase) return;
    
    await checkHandler.executeCheck({
      checkType,
      item: displayItem,
      skill,
      
      onStart: () => {
        console.log(`🎬 [CheckCard] Starting ${checkType} check with skill: ${skill}`);
        isRolling = true;
        selectedSkill = skill;
        showResult = false;
      },
      
      onComplete: async (result: CheckResult) => {
        console.log(`✅ [CheckCard] ${checkType} check completed:`, result.outcome);
        isRolling = false;
        showResult = true;
        outcome = result.outcome;
        actorName = result.actorName;
        rollBreakdown = result.rollBreakdown;
        
        // Get display data from controller
        const displayData: DisplayData = await resultHandler.getDisplayData(
          displayItem, 
          result.outcome, 
          result.actorName
        );
        
        effectMessage = displayData.effect;
        stateChanges = displayData.stateChanges || {};
        modifiers = displayData.modifiers || [];
        manualEffects = displayData.manualEffects || [];
        
        // Store pending outcome for later application
        pendingOutcome = {
          item: displayItem,
          outcome: result.outcome,
          effects: new Map(Object.entries(displayData.stateChanges || {}))
        };
      },
      
      onCancel: () => {
        console.log(`🚫 [CheckCard] ${checkType} check cancelled - resetting to default state`);
        // Reset to default state - THIS IS THE KEY FIX FOR THE BUG
        isRolling = false;
        selectedSkill = '';
        showResult = false;
        outcome = null;
        applied = false;
        pendingOutcome = null;
        rollBreakdown = null;
        effectMessage = '';
        stateChanges = {};
        modifiers = [];
        manualEffects = [];
      },
      
      onError: (error: Error) => {
        console.error(`❌ [CheckCard] Error in ${checkType} check:`, error);
        isRolling = false;
        ui?.notifications?.error(`Failed to perform ${checkType} check: ${error.message}`);
      }
    });
  }
  
  async function handleApplyResult(event: CustomEvent) {
    if (!pendingOutcome || !outcome) return;
    
    console.log(`📝 [CheckCard] Applying ${checkType} result:`, outcome);
    
    // Parse resolution data
    const { outcomeResolutionService } = await import('./OutcomeDisplay/logic/OutcomeResolutionService');
    const resolutionData = outcomeResolutionService.fromEventDetail(event.detail);
    
    // Apply through controller
    const result = await resultHandler.applyResolution(
      pendingOutcome.item,
      outcome,
      resolutionData
    );
    
    if (result.success) {
      console.log(`✅ [CheckCard] ${checkType} resolution applied successfully`);
      applied = true;
      pendingOutcome = null;
    } else {
      console.error(`❌ [CheckCard] Failed to apply ${checkType} resolution:`, result.error);
      ui?.notifications?.error(`Failed to apply result: ${result.error || 'Unknown error'}`);
    }
  }
  
  function handleCancel() {
    console.log(`🔄 [CheckCard] User cancelled outcome display - resetting for re-roll`);
    // User clicked cancel on OutcomeDisplay - reset for re-roll
    showResult = false;
    outcome = null;
    selectedSkill = '';
    applied = false;
    pendingOutcome = null;
    rollBreakdown = null;
    effectMessage = '';
    stateChanges = {};
    modifiers = [];
    manualEffects = [];
  }
  
  async function handleReroll() {
    console.log(`🔁 [CheckCard] Rerolling ${checkType} with fame`);
    const { handleRerollWithFame } = await import('../../../controllers/shared/RerollHelpers');
    
    await handleRerollWithFame({
      currentItem: displayItem,
      selectedSkill,
      phaseName: `${checkType}Phase`,
      resetUiState: handleCancel,
      triggerRoll: handleSkillClick
    });
  }
  
  async function handleDebugOutcomeChange(event: CustomEvent) {
    if (!displayItem) return;
    
    const newOutcome = event.detail.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    console.log(`🐛 [CheckCard] Debug outcome changed to: ${newOutcome}`);
    
    outcome = newOutcome;
    applied = false;
    
    // Recalculate display data
    const displayData = await resultHandler.getDisplayData(displayItem, newOutcome, actorName);
    effectMessage = displayData.effect;
    stateChanges = displayData.stateChanges || {};
    modifiers = displayData.modifiers || [];
    manualEffects = displayData.manualEffects || [];
    
    pendingOutcome = {
      item: displayItem,
      outcome: newOutcome,
      effects: new Map(Object.entries(displayData.stateChanges || {}))
    };
  }
  
  onDestroy(() => {
    checkHandler?.cleanup();
  });
</script>

<div class="check-card">
  {#if !showResult}
    <!-- Before roll: Show skills and possible outcomes -->
    {#if showPossibleOutcomes && possibleOutcomes.length > 0}
      <PossibleOutcomes outcomes={possibleOutcomes} showTitle={false} />
    {/if}
    
    {#if displayItem?.skills && displayItem.skills.length > 0}
      <div class="skill-options">
        <div class="skill-options-title">Choose Your Response:</div>
        <div class="skill-tags">
          {#each displayItem.skills as skillOption}
            <SkillTag
              skill={skillOption.skill}
              description={skillOption.description || ''}
              selected={selectedSkill === skillOption.skill}
              disabled={isRolling || !isViewingCurrentPhase || applied}
              loading={isRolling && selectedSkill === skillOption.skill}
              on:execute={() => handleSkillClick(skillOption.skill)}
            />
          {/each}
        </div>
      </div>
    {/if}
  {:else if outcome}
    <!-- After roll: Show OutcomeDisplay -->
    <OutcomeDisplay
      {outcome}
      {actorName}
      skillName={selectedSkill}
      effect={effectMessage}
      {stateChanges}
      {modifiers}
      {manualEffects}
      {rollBreakdown}
      {applied}
      primaryButtonLabel="Apply Result"
      showFameReroll={true}
      debugMode={true}
      on:primary={handleApplyResult}
      on:cancel={handleCancel}
      on:reroll={handleReroll}
      on:debugOutcomeChanged={handleDebugOutcomeChange}
    />
  {/if}
</div>

<style lang="scss">
  .check-card {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .skill-options {
    margin: 20px 0;
    
    .skill-options-title {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.4;
      color: var(--text-primary);
      margin-bottom: 15px;
    }
  }
  
  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
</style>
