<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createCheckHandler, type CheckConfig, type CheckResult } from '../../../controllers/shared/CheckHandler';
  import { createCheckResultHandler, type DisplayData } from '../../../controllers/shared/CheckResultHandler';
  import { kingdomData } from '../../../stores/KingdomStore';
  import SkillTag from './CheckCard/components/SkillTag.svelte';
  import PossibleOutcomes from './PossibleOutcomes.svelte';
  import OutcomeDisplay from './OutcomeDisplay/OutcomeDisplay.svelte';
  import ActionConfirmDialog from './ActionConfirmDialog.svelte';
  
  // Props
  export let checkType: 'event' | 'incident' | 'action';
  export let item: any;
  export let isViewingCurrentPhase: boolean = true;
  export let controller: any;  // Phase-specific controller
  export let showPossibleOutcomes: boolean = true;
  export let possibleOutcomes: any[] = [];
  export let showAidButton: boolean = false;  // Show aid button before skills
  export let aidResult: { outcome: string; bonus: number } | null = null;  // Aid result display
  
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
  let shortfallResources: string[] = [];
  let rollBreakdown: any = null;
  let pendingOutcome: {
    item: any;
    outcome: string;
    effects: Map<string, any>;
  } | null = null;
  
  // Action confirmation state
  let showActionConfirm = false;
  let pendingSkill = '';
  
  // Aid button handler
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  function handleAidClick() {
    dispatch('aid');
  }
  
  onMount(() => {
    checkHandler = createCheckHandler();
    resultHandler = createCheckResultHandler(checkType, controller);
  });
  
  // Check for persisted applied outcomes in kingdom data
  // IMPORTANT: Always check persisted data first, even if locally applied = true
  // Simplified migration: Read ONLY from turnState
  $: if ($kingdomData?.turnState && item) {
    // For events: Read from turnState.eventsPhase.appliedOutcomes
    if (checkType === 'event') {
      const appliedOutcome = $kingdomData.turnState.eventsPhase?.appliedOutcomes?.find(
        ao => ao.eventId === item.id
      );
      
      if (appliedOutcome) {
        // Restore from persisted outcome (always takes priority)
        displayItem = item;
        showResult = true;
        applied = true;
        outcome = appliedOutcome.outcome;
        actorName = appliedOutcome.eventName;
        effectMessage = appliedOutcome.effect;
        stateChanges = appliedOutcome.stateChanges;
        modifiers = appliedOutcome.modifiers;
        manualEffects = appliedOutcome.manualEffects;
        pendingOutcome = null;
      } else if (!showResult) {
        // No persisted outcome and not showing a result - reset to fresh state
        displayItem = item;
        applied = false;
      } else if (!displayItem) {
        // Just preserve the item if we don't have it
        displayItem = item;
      }
    }
    // For incidents: Read from turnState.unrestPhase.appliedOutcome
    else if (checkType === 'incident') {
      const appliedOutcome = $kingdomData.turnState.unrestPhase?.appliedOutcome;
      
      if (appliedOutcome && appliedOutcome.incidentId === item.id) {
        // Restore from persisted outcome (always takes priority)
        displayItem = item;
        showResult = true;
        applied = true;
        outcome = appliedOutcome.outcome;
        actorName = appliedOutcome.incidentName;
        effectMessage = appliedOutcome.effect;
        stateChanges = appliedOutcome.stateChanges;
        modifiers = appliedOutcome.modifiers;
        manualEffects = appliedOutcome.manualEffects;
        pendingOutcome = null;
      } else if (!showResult) {
        // No persisted outcome and not showing a result - reset to fresh state
        displayItem = item;
        applied = false;
      } else if (!displayItem) {
        // Just preserve the item if we don't have it
        displayItem = item;
      }
    }
    // For other types, preserve item normally
    else if (!displayItem) {
      displayItem = item;
    }
  }
  
  async function handleSkillClick(skill: string) {
    if (!displayItem || isRolling || !isViewingCurrentPhase) return;
    
    // Check if THIS PLAYER has already performed an action (skip for incidents)
    if (checkType !== 'incident') {
      const currentUser = (window as any).game?.user;
      if (currentUser) {
        const { getPlayerAction } = await import('../../../stores/KingdomStore');
        const currentPlayerAction = getPlayerAction(currentUser.id);
        const hasPlayerActed = currentPlayerAction?.actionSpent || false;
        
        if (hasPlayerActed) {
          // This player has already performed an action - show confirmation dialog
          pendingSkill = skill;
          showActionConfirm = true;
          return;  // Wait for user confirmation
        }
      }
    }
    
    // Continue with roll
    await executeSkillCheck(skill);
  }
  
  async function executeSkillCheck(skill: string) {
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
    const { createOutcomeResolutionService } = await import('../../../services/resolution');
    const resolutionService = await createOutcomeResolutionService();
    const resolutionData = resolutionService.fromEventDetail(event.detail);
    
    // Apply through controller
    const result = await resultHandler.applyResolution(
      pendingOutcome.item,
      outcome,
      resolutionData
    );
    
    if (result.success) {
      console.log(`✅ [CheckCard] ${checkType} resolution applied successfully`);
      
      // Parse shortfall information from special effects
      const shortfalls: string[] = [];
      if (result.applied?.specialEffects) {
        for (const effect of result.applied.specialEffects) {
          if (effect.startsWith('shortage_penalty:')) {
            const resource = effect.split(':')[1];
            shortfalls.push(resource);
          }
        }
      }
      
      shortfallResources = shortfalls;
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
  
  async function handleIgnoreEvent() {
    if (!displayItem || isRolling || !isViewingCurrentPhase || applied) return;
    
    console.log(`🚫 [CheckCard] Ignoring event: ${displayItem.name}`);
    
    // Get current turn from kingdom data
    const { kingdomData } = await import('../../../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 1;
    
    // Call controller's ignoreEvent method
    const result = await controller.ignoreEvent(displayItem, currentTurn);
    
    if (result.success) {
      console.log(`✅ [CheckCard] Event ignored successfully`);
      ui?.notifications?.info(`Event ignored - failure effects applied`);
      
      // Show the outcome as applied
      showResult = true;
      outcome = 'failure';
      selectedSkill = 'ignored';
      applied = true;
      
      // Get display data for ignored event (failure outcome)
      const displayData = await resultHandler.getDisplayData(displayItem, 'failure', 'Ignored');
      effectMessage = displayData.effect;
      stateChanges = displayData.stateChanges || {};
      modifiers = displayData.modifiers || [];
      manualEffects = displayData.manualEffects || [];
      
      // Save applied outcome for UI persistence (since ignoreEvent is called directly, not through CheckResultHandler)
      // Simplified migration: Write ONLY to turnState
      const { updateKingdom } = await import('../../../stores/KingdomStore');
      const { getEventDisplayName } = await import('../../../types/event-helpers');
      await updateKingdom(kingdom => {
        if (kingdom.turnState) {
          kingdom.turnState.eventsPhase.appliedOutcomes.push({
            eventId: displayItem.id,
            eventName: getEventDisplayName(displayItem),
            outcome: 'failure' as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            skillUsed: 'ignored',
            effect: displayData.effect,
            stateChanges: displayData.stateChanges || {},
            modifiers: displayData.modifiers || [],
            manualEffects: displayData.manualEffects || []
          });
          kingdom.turnState.eventsPhase.eventResolved = true;
        }
      });
      console.log(`💾 [CheckCard] Saved ignored event outcome for: ${getEventDisplayName(displayItem)}`);
      
      // Parse shortfall information if any
      const shortfalls: string[] = [];
      if (result.applied?.specialEffects) {
        for (const effect of result.applied.specialEffects) {
          if (effect.startsWith('shortage_penalty:')) {
            const resource = effect.split(':')[1];
            shortfalls.push(resource);
          }
        }
      }
      shortfallResources = shortfalls;
      
      pendingOutcome = null;  // Clear pending since we've already applied
    } else {
      console.error(`❌ [CheckCard] Failed to ignore event:`, result.error);
      ui?.notifications?.error(`Failed to ignore event: ${result.error || 'Unknown error'}`);
    }
  }
  
  onDestroy(() => {
    checkHandler?.cleanup();
  });
</script>

<ActionConfirmDialog
  bind:show={showActionConfirm}
  on:confirm={() => {
    showActionConfirm = false;
    executeSkillCheck(pendingSkill);
  }}
  on:cancel={() => {
    showActionConfirm = false;
    pendingSkill = '';
  }}
/>

<div class="check-card">
  {#if !showResult}
    <!-- Before roll: Show skills and possible outcomes -->
    {#if showPossibleOutcomes && possibleOutcomes.length > 0}
      <PossibleOutcomes outcomes={possibleOutcomes} showTitle={false} />
    {/if}
    
    {#if displayItem?.skills && displayItem.skills.length > 0}
      <div class="skill-options">
        <div class="skill-options-header">
          <div class="skill-options-title">Choose Your Response:</div>
          {#if checkType === 'event'}
            <button
              class="ignore-button-inline"
              disabled={isRolling || !isViewingCurrentPhase || applied}
              on:click={handleIgnoreEvent}
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
                disabled={isRolling || !isViewingCurrentPhase || applied}
              >
                <i class="fas fa-hands-helping"></i>
                Aid Another
              </button>
            {/if}
          {/if}
          
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
      {shortfallResources}
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
    
    .skill-options-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      gap: 15px;
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
  
  .ignore-section {
    margin-top: 20px;
    padding-top: 20px;
    text-align: center;
    
    .divider {
      position: relative;
      margin-bottom: 15px;
      
      span {
        position: relative;
        padding: 0 10px;
        color: var(--text-tertiary);
        font-size: var(--font-sm);
        font-style: italic;
        background: var(--surface-primary);
        z-index: 1;
      }
      
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--border-subtle);
      }
    }
    
    .ignore-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-red);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      
      i {
        font-size: var(--font-lg);
      }
      
      &:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .ignore-warning {
      margin-top: 10px;
      margin-bottom: 0;
      font-size: var(--font-sm);
      color: var(--text-tertiary);
      font-style: italic;
      opacity: 0.8;
    }
  }
</style>
