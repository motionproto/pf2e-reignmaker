<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData, unrest, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { getUnrestTierInfo, getUnrestStatus } from '../../../controllers/UnrestPhaseController';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import UI components
   import BaseCheckCard from '../components/BaseCheckCard.svelte';
   import DebugEventSelector from '../components/DebugEventSelector.svelte';
   import { createCheckHandler } from '../../../controllers/shared/CheckHandler';
   // Removed: spendPlayerAction, getPlayerAction, resetPlayerAction - now using actionLog
   
   // UI State only - no business logic
   let phaseExecuting = false;
   let isRolling = false;
   let incidentCheckRoll: number = 0;
   let incidentCheckDC: number = 0;
   let incidentCheckChance: number = 0;
   let unrestPhaseController: any;
   let checkHandler: any;
   let possibleOutcomes: any[] = [];
   
   // NEW ARCHITECTURE: Read from ActiveCheckInstance instead of turnState
   // Don't filter by status - show all incidents (clearCompleted handles cleanup at phase start)
   $: activeIncidents = $kingdomData.activeCheckInstances?.filter(i => i.checkType === 'incident') || [];
   $: currentIncidentInstance = activeIncidents[0] || null;
   $: incidentResolution = currentIncidentInstance?.appliedOutcome || null;
   $: incidentResolved = !!incidentResolution;
   
   // Current user ID
   let currentUserId: string | null = null;
   
   // Check if current user is GM
   $: isGM = (globalThis as any).game?.user?.isGM || false;
   
   // Reactive UI state using shared helper for step completion
   import { getStepCompletion } from '../../../controllers/shared/PhaseHelpers';
   import { buildPossibleOutcomes } from '../../../controllers/shared/PossibleOutcomeHelpers';
   $: stepComplete = getStepCompletion($kingdomData.currentPhaseSteps, 1); // Step 1 = incident check
   $: incidentWasTriggered = $kingdomData.turnState?.unrestPhase?.incidentTriggered ?? null;
   $: unrestStatus = $unrest !== undefined ? (() => {
      const unrestValue = $unrest || 0;
      const tierInfo = getUnrestTierInfo(unrestValue);
      return {
         currentUnrest: unrestValue,
         tier: tierInfo.tier,
         tierName: tierInfo.tierName,
         penalty: tierInfo.penalty,
         description: tierInfo.description,
         statusClass: tierInfo.statusClass
      };
   })() : { currentUnrest: 0, tier: 0, tierName: 'Stable', penalty: 0, description: 'No incidents occur at this level', statusClass: 'stable' };
   
   // Current incident - loaded from instance checkData
   let currentIncident: any = null;
   
   // Generate unique checkId from instance ID to force component remount
   $: incidentCheckId = currentIncidentInstance?.instanceId || null;
   
   // Load incident from instance checkData (already loaded in instance)
   $: {
      if (currentIncidentInstance) {
         currentIncident = currentIncidentInstance.checkData;
         console.log('📋 [UnrestPhase] Loaded incident from instance:', currentIncident?.name);
      } else {
         currentIncident = null;
      }
   }
   
   // NEW ARCHITECTURE: Show incident result if we have an active instance
   $: showIncidentResult = activeIncidents.length > 0;
   
   // Restore roll values for display when incident is rolled
   $: if ($kingdomData.turnState?.unrestPhase?.incidentRoll !== undefined) {
      incidentCheckRoll = $kingdomData.turnState.unrestPhase.incidentRoll;
      incidentCheckDC = $kingdomData.turnState.unrestPhase.incidentChance || 0;
      incidentCheckChance = $kingdomData.turnState.unrestPhase.incidentChance || 0;
   }
   
   // Ensure controller exists when showing incident result section
   // This is important for other clients that didn't click the roll button
   $: if (showIncidentResult && !unrestPhaseController) {
      (async () => {
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         unrestPhaseController = await createUnrestPhaseController();
         console.log('🔄 [UnrestPhase] Controller initialized for synced incident display');
      })();
   }
   
   async function loadIncident(incidentId: string) {
      try {
         const { incidentLoader } = await import('../../../controllers/incidents/incident-loader');
         
         // Use the incident loader to get the incident
         const incident = incidentLoader.getIncidentById(incidentId);
         
         if (incident) {
            currentIncident = incident;
            console.log('📋 [UnrestPhase] Loaded incident:', currentIncident.name);
         } else {
            console.error('❌ [UnrestPhase] Incident not found:', incidentId);
            currentIncident = null;
         }
      } catch (error) {
         console.error('❌ [UnrestPhase] Error loading incident:', error);
         currentIncident = null;
      }
   }
   
   // Build possible outcomes for the incident (synchronous - must be available for render)
   $: possibleOutcomes = currentIncident ? buildPossibleOutcomes(currentIncident.effects) : [];
   
   // Build outcomes array for BaseCheckCard
   $: incidentOutcomes = currentIncident ? (() => {
      const outcomes: Array<{
         type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
         description: string;
         modifiers?: Array<{ resource: string; value: number }>;
      }> = [];
      
      if (currentIncident.effects.criticalSuccess) {
         outcomes.push({
            type: 'criticalSuccess',
            description: currentIncident.effects.criticalSuccess.msg
         });
      }
      if (currentIncident.effects.success) {
         outcomes.push({
            type: 'success',
            description: currentIncident.effects.success.msg
         });
      }
      if (currentIncident.effects.failure) {
         outcomes.push({
            type: 'failure',
            description: currentIncident.effects.failure.msg
         });
      }
      if (currentIncident.effects.criticalFailure) {
         outcomes.push({
            type: 'criticalFailure',
            description: currentIncident.effects.criticalFailure.msg
         });
      }
      
      return outcomes;
   })() : [];
   
   // Initialize phase steps when component mounts
   onMount(async () => {
      console.log('🟡 [UnrestPhase] Component mounted, initializing phase...');
      
      // Initialize the phase (this sets up currentPhaseSteps!)
      const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
      unrestPhaseController = await createUnrestPhaseController();
      checkHandler = createCheckHandler();
      await unrestPhaseController.startPhase();
      console.log('✅ [UnrestPhase] Phase initialized with controller');
      
      // Store current user ID
      const game = (window as any).game;
      currentUserId = game?.user?.id || null;
      
      // Note: appliedOutcome is legacy - resolution now stored in incidentResolution
      // If needed, could restore from appliedOutcome here, but resolution is now the primary source
   });
   
   // Helper functions removed - now using UnrestIncidentProvider
   
   
   async function rollForIncident() {
      // Use controller to check if rolling is allowed
      const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
      const controller = await createUnrestPhaseController();
      const canRoll = controller.canRollForIncident();
      
      if (!canRoll.allowed) {
         console.log('🛑 [UnrestPhase] Cannot roll -', canRoll.reason);
         return;
      }
      
      if (phaseExecuting) {
         console.log('🛑 [UnrestPhase] Cannot roll - phase executing');
         return;
      }
      
      console.log('🎲 [UnrestPhase] Starting incident roll...');
      isRolling = true;
      showIncidentResult = false;
      
      try {
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         const controller = await createUnrestPhaseController();
         
      console.log('🎮 [UnrestPhase] Controller created, calling checkForIncidents...');
      
      // Call the manual incident check method that completes the step
      const result = await controller.checkForIncidents();
      
      console.log('🎲 [UnrestPhase] Incident check result:', result);
      
      // Store roll results for display
      incidentCheckRoll = result.roll || 0;
      incidentCheckDC = result.chance || 0;
      incidentCheckChance = result.chance || 0;
      
      // The controller already handles setting the incident ID, now explicitly load it
      if (result.incidentTriggered && result.incidentId) {
         console.log('⚠️ [UnrestPhase] Incident triggered! ID:', result.incidentId);
         // Explicitly load the incident before showing results
         await loadIncident(result.incidentId);
      } else {
         console.log('✅ [UnrestPhase] No incident occurred');
         // Ensure incident is cleared
         currentIncident = null;
      }
      
      console.log('👁️ [UnrestPhase] Incident roll complete, currentIncident:', currentIncident?.name || 'null');
         
      } catch (error) {
         console.error('❌ [UnrestPhase] Error rolling for incident:', error);
      } finally {
         isRolling = false;
         console.log('🏁 [UnrestPhase] Rolling finished, isRolling:', isRolling);
      }
   }
   
   
   // Event handler - execute skill check
   async function handleExecuteSkill(event: CustomEvent) {
      if (!currentIncident || !checkHandler || !unrestPhaseController) return;
      
      const { skill } = event.detail;
      
      // Note: Incidents don't consume player actions - they're separate checks
      // Execute the skill check
      await executeSkillCheck(skill);
   }
   
   async function executeSkillCheck(skill: string, enabledModifiers?: string[]) {
      if (!currentIncident || !checkHandler || !unrestPhaseController) return;
      
      // Note: Incidents don't consume player actions - they're separate checks
      
      await checkHandler.executeCheck({
         checkType: 'incident',
         item: currentIncident,
         skill,
         enabledModifiers,
         
         onStart: () => {
            console.log(`🎬 [UnrestPhase] Starting incident check with skill: ${skill}`);
            isRolling = true;
         },
         
         onComplete: async (result: any) => {
            console.log(`✅ [UnrestPhase] Incident check completed:`, result.outcome);
            isRolling = false;
            
            // ARCHITECTURE: Delegate to controller for outcome data extraction and storage
            if (!currentIncident) return;
            const outcomeData = unrestPhaseController.getIncidentModifiers(currentIncident, result.outcome);
            
            const resolution = {
               outcome: result.outcome,
               actorName: result.actorName,
               skillName: skill,
               effect: outcomeData.msg,
               modifiers: outcomeData.modifiers,
               manualEffects: outcomeData.manualEffects,
               rollBreakdown: result.rollBreakdown
            };
            
            // ✅ Store in KingdomActor via controller (syncs to all clients)
            await unrestPhaseController.storeIncidentResolution(currentIncident.id, resolution);
         },
         
         onCancel: async () => {
            console.log(`🚫 [UnrestPhase] Incident check cancelled - resetting state`);
            isRolling = false;
            
            // ✅ Clear from KingdomActor via controller (syncs to all clients)
            if (unrestPhaseController) {
               await unrestPhaseController.clearIncidentResolution();
            }
            
            // Note: Incidents don't consume player actions
         },
         
         onError: (error: Error) => {
            console.error(`❌ [UnrestPhase] Error in incident check:`, error);
            isRolling = false;
            ui?.notifications?.error(`Failed to perform incident check: ${error.message}`);
         }
      });
   }
   
   // Event handler - apply result
   async function handleApplyResult(event: CustomEvent) {
      if (!incidentResolution || !currentIncident) return;
      
      console.log(`📝 [UnrestPhase] Applying incident result:`, incidentResolution.outcome);
      console.log(`🔍 [UnrestPhase] Event detail received:`, event.detail);
      
      // NEW ARCHITECTURE: event.detail.resolution is already ResolutionData from OutcomeDisplay
      const resolutionData = event.detail.resolution;
      console.log(`📋 [UnrestPhase] ResolutionData:`, resolutionData);
      
      // Call controller directly with ResolutionData
      const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
      const controller = await createUnrestPhaseController();
      
      const result = await controller.resolveIncident(
         currentIncident.id,
         incidentResolution.outcome,
         resolutionData
      );
      
      if (result.success) {
         console.log(`✅ [UnrestPhase] Incident resolution applied successfully`);
         
         // NOTE: markApplied() now called automatically in resolvePhaseOutcome()
         // No need to call controller.markIncidentApplied() separately
         
         // Parse shortfall information from the new result structure
         const shortfalls: string[] = [];
         if (result.applied?.applied?.specialEffects) {
            for (const effect of result.applied.applied.specialEffects) {
               if (effect.startsWith('shortage_penalty:')) {
                  shortfalls.push(effect.split(':')[1]);
               }
            }
         }
         
         if (shortfalls.length > 0) {
            incidentResolution.shortfallResources = shortfalls;
         }
      } else {
         console.error(`❌ [UnrestPhase] Failed to apply incident resolution:`, result.error);
         ui?.notifications?.error(`Failed to apply result: ${result.error || 'Unknown error'}`);
      }
   }
   
   // Event handler - cancel resolution
   async function handleCancel() {
      console.log(`🔄 [UnrestPhase] User cancelled outcome - resetting for re-roll`);
      
      // ✅ Clear from KingdomActor via controller (syncs to all clients)
      if (unrestPhaseController) {
         await unrestPhaseController.clearIncidentResolution();
      }
      
      // Note: Incidents don't consume player actions
   }
   
   // Event handler - reroll with fame
   async function handleReroll(event: CustomEvent) {
      if (!currentIncident) return;
      const { skill, previousFame, enabledModifiers } = event.detail;
      console.log(`🔁 [UnrestPhase] Performing reroll with skill: ${skill}`, { enabledModifiers });

      // Reset UI state for new roll
      await handleCancel();

      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger new roll with preserved modifiers
      try {
         await executeSkillCheck(skill, enabledModifiers);
      } catch (error) {
         console.error('[UnrestPhase] Error during reroll:', error);
         // Restore fame if the roll failed
         const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
         if (previousFame !== undefined) {
            await restoreFameAfterFailedReroll(previousFame);
         }
         ui?.notifications?.error('Failed to reroll. Fame has been restored.');
      }
   }
   
   // Event handler - debug outcome change
   async function handleDebugOutcomeChanged(event: CustomEvent) {
      if (!currentIncident || !incidentResolution) return;
      
      const newOutcome = event.detail.outcome;
      console.log(`🐛 [UnrestPhase] Debug outcome changed to: ${newOutcome}`);
      
      // Fetch new modifiers for the new outcome
      const outcomeData = unrestPhaseController.getIncidentModifiers(currentIncident, newOutcome);
      
      // Update BOTH outcome AND modifiers
      incidentResolution = {
         ...incidentResolution,
         outcome: newOutcome,
         effect: outcomeData.msg,
         modifiers: outcomeData.modifiers,
         manualEffects: outcomeData.manualEffects
      };
   }
   
   // Use status class from provider
   $: tierClass = unrestStatus.statusClass;
</script>

<div class="unrest-phase">
   <!-- Debug Incident Selector (GM Only) -->
   {#if isGM}
      <DebugEventSelector type="incident" currentItemId={currentIncidentInstance?.checkId || null} />
   {/if}
   
   <!-- Step 1: Unrest Dashboard -->
   <div class="unrest-dashboard">
      <div class="unrest-split-view">
         <!-- Left Side: Status and Actions -->
         <div class="unrest-left">
            <div class="status-display tier-{tierClass}">
               {#if unrestStatus.tierName === 'Stable'}
                  <i class="fas fa-dove"></i>
               {:else if unrestStatus.tierName === 'Discontent'}
                  <i class="fas fa-fist-raised"></i>
               {:else if unrestStatus.tierName === 'Unrest'}
                  <i class="fas fa-fire"></i>
               {:else if unrestStatus.tierName === 'Rebellion'}
                  <i class="fas fa-house-fire"></i>
               {/if}
               <span>{unrestStatus.tierName}</span>
            </div>
            
            <div class="status-subtitle">
               {unrestStatus.description}
            </div>
            
            {#if unrestStatus.penalty !== 0}
               <div class="penalty-indicator">
                  <span>Penalty: {unrestStatus.penalty}</span>
               </div>
            {/if}
         </div>
         
         <!-- Right Side: Unrest Values -->
         <div class="unrest-right">
            <div class="unrest-container">
               <!-- Main Unrest -->
               <div class="main-unrest">
                  <div class="unrest-value">{unrestStatus.currentUnrest}</div>
                  <div class="unrest-label">Unrest</div>
               </div>
               
               <!-- Imprisoned Unrest -->
               {#if $kingdomData.imprisonedUnrest > 0}
                  <div class="imprisoned-unrest">
                     <div class="imprisoned-value">
                        <i class="fas fa-dungeon"></i>
                        <span>{$kingdomData.imprisonedUnrest}</span>
                     </div>
                     <div class="imprisoned-label">Imprisoned</div>
                  </div>
               {/if}
            </div>
         </div>
      </div>
   </div>
   
   <!-- Roll for Incident Button -->
   {#if unrestStatus.tier > 0}
      <div class="button-area">
         <button 
            class="roll-incident-btn"
            on:click={rollForIncident}
            disabled={!isViewingCurrentPhase || isRolling || stepComplete}
         >
            <i class="fas {stepComplete ? 'fa-check' : 'fa-dice-d20'} {isRolling ? 'spinning' : ''}"></i>
            {#if stepComplete}
               Checked
            {:else if isRolling}
               Rolling...
            {:else}
               Roll for Incident
            {/if}
         </button>
      </div>
      {#if stepComplete}
         <div class="roll-result-text">
            {#if incidentWasTriggered}
               <i class="fas fa-exclamation-triangle"></i>
               <span>Rolled {incidentCheckRoll}% &lt; {incidentCheckDC}% chance - Incident triggered</span>
            {:else}
               <i class="fas fa-check-circle"></i>
               <span>Rolled {incidentCheckRoll}% &gt;= {incidentCheckDC}% chance - No incident</span>
            {/if}
         </div>
      {/if}
   {/if}
   
   <!-- Step 2: Incident Results -->
   {#if showIncidentResult}
      {#if currentIncident}
         <!-- Use BaseCheckCard for incident resolution - only show when controller is ready -->
         {#if unrestPhaseController && incidentCheckId}
            {#key incidentCheckId}
               <BaseCheckCard
                        id={incidentCheckId}
                        name={currentIncident.name}
                        description={currentIncident.description}
                        skills={currentIncident.skills}
                        outcomes={incidentOutcomes}
                        traits={currentIncident.traits || []}
                        checkType="incident"
                        checkInstance={currentIncidentInstance}
                        expandable={false}
                        showCompletions={false}
                        showAvailability={false}
                        showSpecial={false}
                        showIgnoreButton={false}
                        {isViewingCurrentPhase}
                        {possibleOutcomes}
                        showAidButton={false}
                        resolved={incidentResolved}
                        resolution={incidentResolution}
                        primaryButtonLabel="Apply Result"
                        skillSectionTitle="Choose Your Response:"
                        on:executeSkill={handleExecuteSkill}
                        on:primary={handleApplyResult}
                        on:cancel={handleCancel}
                        on:performReroll={handleReroll}
                        on:debugOutcomeChanged={handleDebugOutcomeChanged}
                     />
            {/key}
         {:else}
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
               <i class="fas fa-spinner fa-spin"></i> Loading...
            </div>
         {/if}
      {:else}
         <div class="no-incident">
            <i class="fas fa-shield-alt no-incident-icon"></i>
            <div class="no-incident-text">No Incident</div>
            <div class="no-incident-desc">The kingdom avoids crisis this turn</div>
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   .unrest-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .unrest-dashboard {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      padding: 20px;
   }
   
   // Split view layout - Two equal columns
   .unrest-split-view {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      align-items: center;
   }
   
   // Left side - Status display and actions
   .unrest-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      
      .status-display {
         display: flex;
         align-items: center;
         gap: 1rem;
         font-size: var(--font-4xl);
         font-weight: var(--font-weight-semibold);
      
         
         i {
            font-size: 2.5rem;
         }
         
         &.tier-stable {
            color: var(--color-green);
            
            i {
               color: var(--color-green);
            }
         }
         
         &.tier-discontent {
            color: var(--color-amber-light);
            
            i {
               color: var(--color-amber);
            }
         }
         
         &.tier-unrest {
            color: var(--color-orange);
            
            i {
               color: var(--color-orange);
            }
         }
         
         &.tier-rebellion {
            color: var(--color-red);
            
            i {
               color: var(--color-red);
            }
         }
      }
      
      .status-subtitle {
         font-size: var(--font-md);
         color: var(--text-secondary);
         line-height: 1.3;
      }
      
      .penalty-indicator {
         display: inline-flex;
         align-items: center;
         padding: 4px 8px;
         background: rgba(245, 158, 11, 0.1);
         border: 1px solid rgba(245, 158, 11, 0.3);
         border-radius: var(--radius-sm);
         color: var(--color-amber-light);
         font-size: var(--font-lg);
         font-weight: var(--font-weight-medium);
         width: fit-content;
      }
   }
   
   // Right side - Unrest value display
   .unrest-right {
      display: flex;
      align-items: center;
      justify-content: center;
      
      .unrest-container {
         display: flex;
         align-items: flex-end;
         gap: 30px;
      }
      
      .main-unrest {
         display: flex;
         flex-direction: column;
         align-items: center;
         text-align: center;
         
         .unrest-value {
            font-size: 56px;
            font-weight: var(--font-weight-bold);
            line-height: 1;
            color: var(--text-primary);
            text-shadow: var(--text-shadow-md);
         }
         
         .unrest-label {
            font-size: var(--font-md);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-tertiary);
            margin-top: 8px;
         }
      }
      
      .imprisoned-unrest {
         display: flex;
         flex-direction: column;
         
         .imprisoned-value {
            display: flex;
            align-items: flex-end;
            gap: 1rem;
            font-size: var(--font-2xl);
            font-weight: var(--font-weight-bold);
            color: var(--text-secondary);
            
            i {
               font-size: var(--font-4xl);
               line-height: 1;
            }
            
            span {
               font-weight: var(--font-weight-bold);
               line-height: 1;
            }
         }
         
         .imprisoned-label {
            font-size: var(--font-md);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-tertiary);
            margin-top: 1rem;
         }
      }
   }
   
   // Button area - centered button container
   .button-area {
      display: flex;
      align-items: flex-start;
      justify-content: center;
   }
   
   // Roll for Incident button - standalone, larger size
   .roll-incident-btn {
      padding: 10px 20px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.025em;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         background: var(--color-gray-700);
      }
      
      i.spinning {
         animation: spin 1s linear infinite;
      }
   }
   
   .roll-result-text {
      text-align: center;
      margin-top: 8px;
      font-size: var(--font-sm);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      
      i {
         font-size: var(--font-md);
         
         &.fa-exclamation-triangle {
            color: var(--color-amber);
         }
         
         &.fa-check-circle {
            color: var(--color-green);
         }
      }
   }
   
   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }
   
   .incident-section {
      background: rgba(0, 0, 0, 0.05);
      padding: 20px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
   }
   
   .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 15px;
   }
   
   .incident-title {
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--text-primary);
   }
   
   .roll-incident-btn {
      padding: 10px 20px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.025em;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         background: var(--color-gray-700);
      }
      
      i.spinning {
         animation: spin 1s linear infinite;
      }
   }
   
   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }
   
   .incident-result-container {
      margin-top: 20px;
   }
   
   .incident-display {
      padding: 20px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
   }
   
   .roll-result {
      text-align: center;
      margin-bottom: 20px;
      
      .roll-value {
         font-size: var(--font-5xl);
         font-weight: var(--font-weight-bold);
         color: var(--color-amber-light);
         text-shadow: var(--text-shadow-md);
         
         &.rolling {
            animation: pulse 0.5s ease-in-out;
         }
      }
      
      .roll-label {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         letter-spacing: 0.025em;
         color: var(--text-tertiary);
         text-transform: uppercase;
         margin-top: 5px;
      }
   }
   
   @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
   }
   
   .incident-info {
      position: relative;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      
      .incident-name {
         font-size: var(--font-3xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         margin-bottom: 10px;
      }
      
      .incident-description {
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
      }
      
      .incident-level-badge {
         position: absolute;
         top: 15px;
         right: 15px;
         padding: 5px 12px;
         border-radius: var(--radius-full);
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         line-height: 1.2;
         letter-spacing: 0.05em;
         text-transform: uppercase;
         
         &.level-minor {
            background: rgba(251, 191, 36, 0.2);
            color: var(--color-amber-light);
            border: 1px solid var(--color-amber);
         }
         
         &.level-moderate {
            background: rgba(249, 115, 22, 0.2);
            color: var(--color-orange);
            border: 1px solid var(--color-orange-border);
         }
         
         &.level-major {
            background: rgba(239, 68, 68, 0.2);
            color: var(--color-red);
            border: 1px solid var(--color-red);
         }
      }
   }
   
   
   .no-incident {
      padding: 40px;
      background: linear-gradient(135deg,
         rgba(34, 197, 94, 0.05),
         rgba(24, 24, 27, 0.3));
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-green-border);
      text-align: center;
      
      .no-incident-icon {
         font-size: 48px;
         color: var(--color-green);
         margin-bottom: 15px;
      }
      
      .no-incident-text {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         margin-bottom: 8px;
      }
      
      .no-incident-desc {
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
      }
   }
</style>
