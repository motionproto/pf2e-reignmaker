<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData, unrest, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { getUnrestTierInfo, getUnrestStatus } from '../../../controllers/UnrestPhaseController';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import UI components
   import SkillTag from '../../kingdom/components/SkillTag.svelte';
   import PossibleOutcomes from '../../kingdom/components/PossibleOutcomes.svelte';
   import OutcomeDisplay from '../components/OutcomeDisplay.svelte';
   
   // UI State only - no business logic
   let phaseExecuting = false;
   let showIncidentResult = false;
   let selectedSkill = '';
   let isRolling = false;
   let incidentResolved = false;
   let resolutionApplied = false; // Track if resolution has been applied
   let rollOutcome: string = '';
   let rollActor: string = '';
   let rollEffect: string = '';
   let rollStateChanges: any = {};
   let incidentCheckRoll: number = 0;
   let incidentCheckDC: number = 0;
   let incidentCheckChance: number = 0;
   
   // Reactive UI state using new index-based system
   $: stepComplete = $kingdomData.currentPhaseSteps?.[1]?.completed === 1; // Step 1 = incident check
   $: incidentWasTriggered = $kingdomData.incidentTriggered ?? null;
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
   
   // Current incident from kingdom data - get real incident
   let currentIncident: any = null;
   
   // Load incident when incident ID changes, but preserve it if already resolved
   $: if ($kingdomData.currentIncidentId && !incidentResolved) {
      loadIncident($kingdomData.currentIncidentId);
   } else if (!$kingdomData.currentIncidentId && !incidentResolved) {
      currentIncident = null;
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
   
   // Initialize phase steps when component mounts
   onMount(async () => {
      console.log('🟡 [UnrestPhase] Component mounted, initializing phase...');
      
      // Initialize the phase (this sets up currentPhaseSteps!)
      const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
      const controller = await createUnrestPhaseController();
      await controller.startPhase();
      console.log('✅ [UnrestPhase] Phase initialized with controller');
      
      // Component mounted - incident checks are manual
      console.log('🟡 [UnrestPhase] Component ready - incident checks are manual');
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
         
         // Force trigger reactivity by setting to false first, then true
         showIncidentResult = false;
         await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure reactivity
         
         // The controller already handles setting the incident ID, we just need to log it
         if (result.incidentTriggered) {
            console.log('⚠️ [UnrestPhase] Incident triggered! ID:', result.incidentId);
         } else {
            console.log('✅ [UnrestPhase] No incident occurred');
            // Controller already cleared the incident ID (no need for component to do it)
         }
         
         // Now show the result section
         showIncidentResult = true;
         console.log('👁️ [UnrestPhase] showIncidentResult set to true');
         
      } catch (error) {
         console.error('❌ [UnrestPhase] Error rolling for incident:', error);
         // Still show the result section even on error
         showIncidentResult = true;
      } finally {
         isRolling = false;
         console.log('🏁 [UnrestPhase] Rolling finished, isRolling:', isRolling, 'showIncidentResult:', showIncidentResult);
      }
   }
   
   async function resolveIncident(skill: string) {
      if (!currentIncident) return;
      
      selectedSkill = skill;
      isRolling = true;
      
      try {
         console.log(`🎲 [UnrestPhase] Rolling ${skill} check for incident: ${currentIncident.name}`);
         
         // Import PF2e integration for skill rolling
         const { performKingdomSkillCheck, initializeRollResultHandler } = await import('../../../services/pf2e');
         
         // Initialize the roll result handler
         initializeRollResultHandler();
         
         // Set up event listener for roll completion
         const handleRollComplete = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail?.checkId === currentIncident.id && customEvent.detail?.checkType === 'incident') {
               const outcome = customEvent.detail.outcome;
               console.log(`🎯 [UnrestPhase] Skill roll result: ${outcome}`);
               
               // Apply the result through the controller
               finishIncidentResolution(outcome);
               
               // Remove the event listener
               window.removeEventListener('kingdomRollComplete', handleRollComplete);
            }
         };
         
         // Add event listener for roll completion
         window.addEventListener('kingdomRollComplete', handleRollComplete);
         
         // Trigger PF2e skill roll through the existing system
         const rollResult = await performKingdomSkillCheck(
            skill,
            'incident',
            currentIncident.name,
            currentIncident.id,
            {
               successEffect: currentIncident.effects?.success?.msg || 'Success',
               failureEffect: currentIncident.effects?.failure?.msg || 'Failure',
               criticalFailureEffect: currentIncident.effects?.criticalFailure?.msg || 'Critical Failure'
            }
         );
         
         if (!rollResult) {
            console.log('🚫 [UnrestPhase] Skill roll was cancelled');
            window.removeEventListener('kingdomRollComplete', handleRollComplete);
            return;
         }
         
      } catch (error) {
         console.error('❌ [UnrestPhase] Error resolving incident:', error);
         ui.notifications?.error('Failed to roll skill check. Make sure you have a character selected.');
      } finally {
         isRolling = false;
      }
   }
   
   async function finishIncidentResolution(outcome: string) {
      try {
         // Just set the UI state for displaying the outcome - don't call controller.resolveIncident yet
         incidentResolved = true;
         rollOutcome = outcome;
         
         // Get the current character info for display
         const { getCurrentUserCharacter } = await import('../../../services/pf2e');
         const character = await getCurrentUserCharacter();
         const actorName = character?.name || 'Unknown';
         rollActor = actorName;
         
         // Use controller to get display data
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         const controller = await createUnrestPhaseController();
         const displayData = controller.getResolutionDisplayData(
            currentIncident, 
            outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
            actorName
         );
         
         rollEffect = displayData.effect;
         rollStateChanges = displayData.stateChanges;
         
         console.log(`✅ [UnrestPhase] Incident resolution outcome set: ${outcome}`);
      } catch (error) {
         console.error('❌ [UnrestPhase] Error finishing incident resolution:', error);
      }
   }
   
   async function handleResolutionPrimary() {
      try {
         // Now apply the actual resolution through the controller
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         const controller = await createUnrestPhaseController();
         
         // Use controller to map outcome
         const simplifiedOutcome = controller.mapDetailedOutcomeToSimple(
            rollOutcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
         );
         
         const result = await controller.resolveIncident(
            currentIncident.id, 
            simplifiedOutcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
         );
         
         if (result.success) {
            console.log(`✅ [UnrestPhase] Incident ${currentIncident.id} resolved through controller`);
            // Mark that the resolution has been applied to hide buttons
            resolutionApplied = true;
            // The controller will mark the step as complete and clear the incident
         } else {
            console.error('❌ [UnrestPhase] Incident resolution failed');
         }
      } catch (error) {
         console.error('❌ [UnrestPhase] Error applying incident resolution:', error);
      }
   }
   
   function handleResolutionCancel() {
      // Reset the resolution state to allow re-rolling
      incidentResolved = false;
      resolutionApplied = false;
      rollOutcome = '';
      rollActor = '';
      rollEffect = '';
      rollStateChanges = {};
      selectedSkill = '';
   }
   
   // Handle fame reroll for incidents
   async function handleRerollWithFame() {
      if (!currentIncident || !selectedSkill) {
         console.error('[UnrestPhase] Cannot reroll - missing incident or skill');
         return;
      }
      
      // Import shared reroll helpers
      const { canRerollWithFame, deductFameForReroll, restoreFameAfterFailedReroll } = 
         await import('../../../controllers/shared/RerollHelpers');
      
      // Check if reroll is possible
      const fameCheck = await canRerollWithFame();
      if (!fameCheck.canReroll) {
         ui.notifications?.warn(fameCheck.error || 'Not enough fame to reroll');
         return;
      }
      
      // Deduct fame
      const deductResult = await deductFameForReroll();
      if (!deductResult.success) {
         ui.notifications?.error(deductResult.error || 'Failed to deduct fame');
         return;
      }
      
      console.log(`💎 [UnrestPhase] Rerolling with fame (${fameCheck.currentFame} → ${fameCheck.currentFame - 1})`);
      
      // Reset UI state for new roll
      incidentResolved = false;
      resolutionApplied = false;
      rollOutcome = '';
      rollActor = '';
      rollEffect = '';
      rollStateChanges = {};
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger new roll with same skill
      try {
         await resolveIncident(selectedSkill);
      } catch (error) {
         console.error('[UnrestPhase] Error during reroll:', error);
         
         // Restore fame on error
         if (deductResult.previousFame !== undefined) {
            await restoreFameAfterFailedReroll(deductResult.previousFame);
         }
         
         ui.notifications?.error('Failed to reroll. Fame has been restored.');
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
            
            {#if unrestStatus.tier > 0}
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
               {#if stepComplete && showIncidentResult}
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
   
   <!-- Step 2: Incident Results -->
   {#if showIncidentResult}
      <div class="incident-section">
         <div class="incident-result-container">
            {#if currentIncident}
               <div class="incident-display">
                  <div class="incident-info">
                     <div class="incident-name">{currentIncident.name}</div>
                     <div class="incident-description">{currentIncident.description}</div>
                     {#if currentIncident.severity}
                        <div class="incident-level-badge level-{currentIncident.severity}">
                           {currentIncident.severity.toUpperCase()}
                        </div>
                     {/if}
                  </div>
                  
                  {#if !incidentResolved && currentIncident.skills && currentIncident.skills.length > 0}
                     <div class="skill-options">
                        <div class="skill-options-title">Choose Resolution Approach:</div>
                        <div class="skill-tags">
                           {#each currentIncident.skills as option}
                              <SkillTag
                                 skill={option.skill}
                                 description={option.description}
                                 selected={selectedSkill === option.skill}
                                 disabled={incidentResolved || isRolling}
                                 loading={isRolling && selectedSkill === option.skill}
                                 on:execute={() => resolveIncident(option.skill)}
                              />
                           {/each}
                        </div>
                     </div>
                  {/if}
                  
                  {#if incidentResolved}
                     <OutcomeDisplay
                        outcome={rollOutcome}
                        actorName={rollActor}
                        skillName={selectedSkill}
                        effect={rollEffect}
                        stateChanges={rollStateChanges}
                        modifiers={currentIncident?.effects?.[rollOutcome]?.modifiers}
                        primaryButtonLabel="Apply Result"
                        showFameReroll={true}
                        applied={resolutionApplied}
                        choices={currentIncident?.effects?.[rollOutcome]?.choices}
                        on:primary={handleResolutionPrimary}
                        on:cancel={handleResolutionCancel}
                        on:reroll={handleRerollWithFame}
                     />
                  {:else}
                     {#await (async () => {
                        const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
                        const controller = await createUnrestPhaseController();
                        return controller.getIncidentDisplayData(currentIncident);
                     })() then displayData}
                        <PossibleOutcomes 
                           outcomes={displayData.outcomes}
                           showTitle={false}
                        />
                     {/await}
                  {/if}
               </div>
            {:else}
               <div class="no-incident">
                  <i class="fas fa-shield-alt no-incident-icon"></i>
                  <div class="no-incident-text">No Incident</div>
                  <div class="no-incident-desc">The kingdom avoids crisis this turn</div>
               </div>
            {/if}
         </div>
      </div>
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
      
      .roll-incident-btn {
         padding: 8px 16px;
         background: var(--btn-secondary-bg);
         color: var(--text-primary);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         cursor: pointer;
         font-size: var(--font-sm);
         font-weight: var(--font-weight-medium);
         line-height: 1.2;
         letter-spacing: 0.025em;
         display: inline-flex;
         align-items: center;
         gap: 8px;
         transition: all var(--transition-fast);
         width: fit-content;
         
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
         margin-top: 8px;
         font-size: var(--font-sm);
         color: var(--text-secondary);
         display: flex;
         align-items: center;
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
      margin-top: 10px;
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
