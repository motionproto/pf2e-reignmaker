<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData, unrest, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { getUnrestTierInfo, getUnrestStatus } from '../../../controllers/UnrestPhaseController';
   import { logger } from '../../../utils/Logger';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   export let hideUntrainedSkills: boolean = true;
   
   // Import UI components
   import BaseCheckCard from '../components/BaseCheckCard.svelte';
   import IncidentDebugPanel from '../components/IncidentDebugPanel.svelte';
   // Removed: spendPlayerAction, getPlayerAction, resetPlayerAction - now using actionLog
   
   // Import incident status tracking
   import { getIncidentStatus, getIncidentNumber } from '../../../constants/migratedIncidents';

   // UI State only - no business logic
   let phaseExecuting = false;
   let isRolling = false;
   let incidentCheckRoll: number = 0;
   let incidentCheckDC: number = 0;
   let incidentCheckChance: number = 0;
   let unrestPhaseController: any;
   let possibleOutcomes: any[] = [];
   
   // NEW ARCHITECTURE: Read from OutcomePreview (pendingOutcomes) instead of legacy activeCheckInstances
   // Don't filter by status - show all incidents (clearCompleted handles cleanup at phase start)
   // Filter out debug tests (isDebugTest flag in metadata)
   $: activeIncidents = $kingdomData?.pendingOutcomes?.filter(i => 
      i.checkType === 'incident' && !i.metadata?.isDebugTest
   ) || [];
   $: currentIncidentInstance = activeIncidents[0] || null;
   $: incidentResolution = currentIncidentInstance?.appliedOutcome || null;
   $: incidentResolved = !!incidentResolution;
   
   // Current user ID
   let currentUserId: string | null = null;
   
   // Check if current user is GM
   $: isGM = (globalThis as any).game?.user?.isGM || false;
   
   // Debug mode toggle state (default to open for incident testing)
   let showDebugPanel = true;
   
   // Reactive UI state using shared helper for step completion
   import { getStepCompletion } from '../../../controllers/shared/PhaseHelpers';
   import { buildPossibleOutcomes } from '../../../controllers/shared/PossibleOutcomeHelpers';
   import { buildEventOutcomes } from '../../../controllers/shared/EventOutcomeHelpers';
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
   $: incidentCheckId = currentIncidentInstance?.previewId || null;
   
   // Load incident from instance checkData (already loaded in instance)
   $: {
      if (currentIncidentInstance) {
         currentIncident = currentIncidentInstance.checkData;
         console.log('[UnrestPhase] Loaded currentIncident:', currentIncident?.name, 'has outcomes:', !!currentIncident?.outcomes);
      } else {
         currentIncident = null;
      }
   }
   
   // NEW ARCHITECTURE: Show incident result if we have an active instance
   $: showIncidentResult = activeIncidents.length > 0;
   $: console.log('[UnrestPhase] showIncidentResult:', showIncidentResult, 'activeIncidents:', activeIncidents.length, 'unrestPhaseController:', !!unrestPhaseController, 'incidentCheckId:', incidentCheckId);
   
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

      })();
   }
   
   async function loadIncident(incidentId: string) {
      try {
         const { pipelineRegistry } = await import('../../../pipelines/PipelineRegistry');
         
         // Use the pipeline registry to get the incident
         const incident = pipelineRegistry.getPipeline(incidentId);
         
         if (incident) {
            currentIncident = incident;

         } else {
            logger.error('❌ [UnrestPhase] Incident not found:', incidentId);
            currentIncident = null;
         }
      } catch (error) {
         logger.error('❌ [UnrestPhase] Error loading incident:', error);
         currentIncident = null;
      }
   }
   
   // Build possible outcomes for the incident (synchronous - must be available for render)
   $: possibleOutcomes = currentIncident ? buildPossibleOutcomes(currentIncident.outcomes) : [];
   $: console.log('[UnrestPhase] possibleOutcomes:', possibleOutcomes.length, possibleOutcomes);
   
   // Get incident testing status
   $: incidentStatus = currentIncidentInstance?.checkId ? getIncidentStatus(currentIncidentInstance.checkId) : null;
   $: incidentNumber = currentIncidentInstance?.checkId ? getIncidentNumber(currentIncidentInstance.checkId) : undefined;
   $: console.log('[UnrestPhase] Incident testing status:', { 
      checkId: currentIncidentInstance?.checkId, 
      incidentStatus, 
      incidentNumber 
   });
   
   // Build outcomes array for BaseCheckCard using shared helper
   $: incidentOutcomes = (currentIncident && currentIncident.outcomes) 
      ? buildEventOutcomes(currentIncident) 
      : [];
   $: console.log('[UnrestPhase] incidentOutcomes:', incidentOutcomes.length, incidentOutcomes);
   
   // Initialize phase steps when component mounts
   onMount(async () => {
      // Initialize the phase (this sets up currentPhaseSteps!)
      const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
      unrestPhaseController = await createUnrestPhaseController();
      await unrestPhaseController.startPhase();

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

         return;
      }
      
      if (phaseExecuting) {

         return;
      }

      isRolling = true;
      showIncidentResult = false;
      
      try {
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         const controller = await createUnrestPhaseController();

      // Call the manual incident check method that completes the step
      const result = await controller.rollForIncident();

      // Store roll results for display
      incidentCheckRoll = result.roll || 0;
      incidentCheckDC = result.chance || 0;
      incidentCheckChance = result.chance || 0;
      
      // The controller already handles setting the incident ID, now explicitly load it
      if (result.incidentTriggered && result.incidentId) {

         // Explicitly load the incident before showing results
         await loadIncident(result.incidentId);
      } else {

         // Ensure incident is cleared
         currentIncident = null;
      }

      } catch (error) {
         logger.error('❌ [UnrestPhase] Error rolling for incident:', error);
      } finally {
         isRolling = false;

      }
   }
   
   
   // Event handler - execute skill check
   async function handleExecuteSkill(event: CustomEvent) {
      if (!currentIncident || !unrestPhaseController) return;
      
      const { skill } = event.detail;
      
      // Note: Incidents don't consume player actions - they're separate checks
      // Execute the skill check
      await executeSkillCheck(skill);
   }
   
   async function executeSkillCheck(skill: string, enabledModifiers?: string[]) {
      if (!currentIncident) return;

      // Note: Incidents don't consume player actions - they're separate checks

      try {
         isRolling = true;

         // Use PipelineCoordinator for incidents (same as actions)
         const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
         const { getCurrentUserCharacter } = await import('../../../services/pf2e');

         const pipelineCoordinator = await getPipelineCoordinator();
         const actingCharacter = getCurrentUserCharacter();
         if (!actingCharacter) {
            throw new Error('No character selected');
         }

         await pipelineCoordinator.executePipeline(currentIncident.id, {
            checkType: 'incident',
            actor: {
               selectedSkill: skill,
               fullActor: actingCharacter,
               actorName: actingCharacter.name,
               actorId: actingCharacter.id,
               level: actingCharacter.level || 1,
               proficiencyRank: 0
            }
         });

         // Pipeline handles everything: roll, create instance, calculate preview, wait for apply
         // No need for manual storeIncidentResolution - pipeline does it

      } catch (error) {
         if ((error as Error).message === 'Action cancelled by user') {
            logger.info('[UnrestPhase] User cancelled incident check');
         } else {
            logger.error(`❌ [UnrestPhase] Error in incident check:`, error);
            ui?.notifications?.error(`Failed to perform incident check: ${(error as Error).message}`);
         }
      } finally {
         isRolling = false;
      }
   }
   
   // Event handler - apply result
   async function handleApplyResult(event: CustomEvent) {
      if (!incidentResolution || !currentIncidentInstance) return;

      // Get resolution data from OutcomeDisplay
      const resolutionData = event.detail.resolution;
      const instanceId = currentIncidentInstance.previewId;

      // Use PipelineCoordinator to confirm and execute (same as actions)
      const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
      const pipelineCoordinator = await getPipelineCoordinator();
      pipelineCoordinator.confirmApply(instanceId, resolutionData);

      // Pipeline handles Steps 7-9: post-apply interactions, execute, cleanup
   }
   
   // Event handler - cancel resolution
   async function handleCancel() {
      if (!currentIncidentInstance) return;

      // Clear the instance via OutcomePreviewService (same as actions)
      const { createOutcomePreviewService } = await import('../../../services/OutcomePreviewService');
      const outcomePreviewService = await createOutcomePreviewService();
      await outcomePreviewService.clearInstance(currentIncidentInstance.previewId);

      // Note: Incidents don't consume player actions
   }
   
   // Event handler - reroll with fame
   async function handleReroll(event: CustomEvent) {
      if (!currentIncident) return;
      const { skill, previousFame, enabledModifiers } = event.detail;

      // Reset UI state for new roll
      await handleCancel();

      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger new roll with preserved modifiers
      try {
         await executeSkillCheck(skill, enabledModifiers);
      } catch (error) {
         logger.error('[UnrestPhase] Error during reroll:', error);
         // Restore fame if the roll failed
         const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
         if (previousFame !== undefined) {
            await restoreFameAfterFailedReroll(previousFame);
         }
         ui?.notifications?.error('Failed to reroll. Fame has been restored.');
      }
   }
   
   
   // Use status class from provider
   $: tierClass = unrestStatus.statusClass;
</script>

<div class="unrest-phase">
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
            <i class="fas {stepComplete ? 'fa-check' : 'fa-dice-d20'} {!stepComplete && isRolling ? 'spinning' : ''}"></i>
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
                        outcomePreview={currentIncidentInstance}
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
                        skillSectionTitle="Choose Your Response:"
                        {hideUntrainedSkills}
                        {incidentStatus}
                        {incidentNumber}
                        on:executeSkill={handleExecuteSkill}
                        on:primary={handleApplyResult}
                        on:cancel={handleCancel}
                        on:performReroll={handleReroll}
                     />
            {/key}
         {:else}
            <div class="loading-state">
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
   
   <!-- Debug Panel (GM Only) - Collapsible section for testing all incidents -->
   {#if isGM}
      <div class="debug-section">
         <button 
            class="debug-toggle"
            on:click={() => showDebugPanel = !showDebugPanel}
         >
            <i class="fas fa-bug"></i>
            <span>Debug Mode</span>
            <i class="fas fa-chevron-{showDebugPanel ? 'up' : 'down'}"></i>
         </button>
         
         {#if showDebugPanel}
            <IncidentDebugPanel {hideUntrainedSkills} />
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .unrest-phase {
      display: flex;
      flex-direction: column;
      gap: var(--space-20);
   }
   
   .unrest-dashboard {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      padding: var(--space-20);
   }
   
   // Split view layout - Two equal columns
   .unrest-split-view {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-24);
      align-items: center;
   }
   
   // Left side - Status display and actions
   .unrest-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-16);
      
      .status-display {
         display: flex;
         align-items: center;
         gap: var(--space-16);
         font-size: var(--font-4xl);
         font-weight: var(--font-weight-semibold);
      
         
         i {
            font-size: var(--font-5xl);
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
         padding: var(--space-4) var(--space-8);
         background: var(--surface-accent-low);
         border: 1px solid var(--border-accent-subtle);
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
         gap: var(--space-24);
      }
      
      .main-unrest {
         display: flex;
         flex-direction: column;
         align-items: center;
         text-align: center;
         
         .unrest-value {
            font-size: var(--font-6xl);
            font-weight: var(--font-weight-bold);
            line-height: 1;
            color: var(--text-primary);
            text-shadow: var(--text-shadow-md);
         }
         
         .unrest-label {
            font-size: var(--font-md);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.05rem;
            color: var(--text-tertiary);
            margin-top: var(--space-8);
         }
      }
      
      .imprisoned-unrest {
         display: flex;
         flex-direction: column;
         
         .imprisoned-value {
            display: flex;
            align-items: flex-end;
            gap: var(--space-16);
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
            letter-spacing: 0.05rem;
            color: var(--text-tertiary);
            margin-top: var(--space-16);
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
      padding: var(--space-10) var(--space-20);
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.025rem;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-0.0625rem);
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
      margin-top: var(--space-8);
      font-size: var(--font-sm);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      
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
      background: var(--overlay-lowest);
      padding: var(--space-20);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-faint);
   }
   
   .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-20);
      flex-wrap: wrap;
      gap: var(--space-16);
   }
   
   .incident-title {
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--text-primary);
   }
   
   .roll-incident-btn {
      padding: var(--space-10) var(--space-20);
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.025rem;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-0.0625rem);
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
      margin-top: var(--space-20);
   }
   
   .incident-display {
      padding: var(--space-20);
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
   }
   
   .roll-result {
      text-align: center;
      margin-bottom: var(--space-20);
      
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
         letter-spacing: 0.025rem;
         color: var(--text-tertiary);
         text-transform: uppercase;
         margin-top: var(--space-4);
      }
   }
   
   @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
   }
   
   .incident-info {
      position: relative;
      padding: var(--space-20);
      background: var(--overlay-low);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-20);
      
      .incident-name {
         font-size: var(--font-3xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         margin-bottom: var(--space-10);
      }
      
      .incident-description {
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
      }
      
      .incident-level-badge {
         position: absolute;
         top: 0.9375rem;
         right: 0.9375rem;
         padding: var(--space-4) var(--space-12);
         border-radius: var(--radius-full);
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         line-height: 1.2;
         letter-spacing: 0.05rem;
         text-transform: uppercase;
         
         &.level-minor {
            background: var(--surface-accent-high);
            color: var(--color-amber-light);
            border: 1px solid var(--color-amber);
         }
         
         &.level-moderate {
            background: rgba(249, 115, 22, 0.2);
            color: var(--color-orange);
            border: 1px solid var(--color-orange-border);
         }
         
         &.level-major {
            background: var(--surface-primary-high);
            color: var(--color-red);
            border: 1px solid var(--color-red);
         }
      }
   }
   
   
   .no-incident {
      padding: var(--space-24);
      background: linear-gradient(135deg,
         var(--surface-success-lower),
         rgba(24, 24, 27, 0.3));
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-green-border);
      text-align: center;
      
      .no-incident-icon {
         font-size: var(--font-6xl);
         color: var(--color-green);
         margin-bottom: var(--space-16);
      }
      
      .no-incident-text {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         margin-bottom: var(--space-8);
      }
      
      .no-incident-desc {
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
      }
   }
   
   .loading-state {
      text-align: center;
      padding: var(--space-20);
      color: var(--text-secondary);
   }
   
   // Debug section
   .debug-section {
      margin-top: var(--space-24);
      padding-top: var(--space-20);
      border-top: 1px solid var(--border-faint);
   }
   
   .debug-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      width: 100%;
      padding: var(--space-12) var(--space-16);
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid var(--border-special-subtle);
      border-radius: var(--radius-md);
      color: rgba(196, 181, 253, 1);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      margin-bottom: var(--space-16);
      
      i:first-child {
         font-size: var(--font-lg);
      }
      
      span {
         flex: 1;
         text-align: left;
      }
      
      i:last-child {
         font-size: var(--font-md);
      }
      
      &:hover {
         background: rgba(139, 92, 246, 0.15);
         border-color: var(--border-special-medium);
      }
   }
</style>
