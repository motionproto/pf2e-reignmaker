<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { IncidentManager, type Incident, type IncidentLevel } from '../../../models/Incidents';
   import { markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import SkillTag from '../../kingdom/components/SkillTag.svelte';
   import { initializeRollResultHandler } from '../../../api/foundry-actors';
   import { onMount, onDestroy } from 'svelte';
   
   // State for incident handling
   let currentIncident: Incident | null = null;
   let lastRoll: number = 0;
   let showIncidentResult = false;
   let selectedSkill = '';
   let isRolling = false;
   let incidentResolved = false;
   let rollOutcome: string = '';
   
   // Check if steps are completed
   $: incidentChecked = isPhaseStepCompleted('unrest-check');
   
   // Calculate unrest values
   $: currentUnrest = $kingdomState.unrest || 0;
   $: tier = IncidentManager.getUnrestTier(currentUnrest);
   $: tierName = IncidentManager.getUnrestTierName(tier);
   $: penalty = IncidentManager.getUnrestPenalty(currentUnrest);
   $: incidentLevel = IncidentManager.getIncidentLevel(tier);
   
   // Get tier-based styling class
   function getTierClass(tierName: string): string {
      const name = tierName.toLowerCase();
      if (name === 'stable') return 'stable';
      if (name === 'discontent') return 'discontent';
      if (name === 'unrest') return 'unrest';
      if (name === 'rebellion') return 'rebellion';
      return 'stable';
   }
   
   function rollForIncident() {
      if (tier === 0) return;
      
      isRolling = true;
      showIncidentResult = false;
      
      // Animate the roll
      setTimeout(() => {
         // Roll for incident
         lastRoll = Math.floor(Math.random() * 100) + 1;
         currentIncident = IncidentManager.rollForIncident(tier);
         showIncidentResult = true;
         isRolling = false;
         
         if (!incidentChecked) {
            markPhaseStepCompleted('unrest-check');
         }
      }, 1000);
   }
   
   // Initialize the global roll result handler
   initializeRollResultHandler();
   
   // Listen for kingdom roll completion events
   function handleRollCompleteEvent(event: CustomEvent) {
      const { checkId, outcome, actorName, checkType, skillName } = event.detail;
      
      // Only handle incident type checks for our current incident
      if (checkType === 'incident' && currentIncident && checkId === currentIncident.id) {
         // Handle incident resolution
         incidentResolved = true;
         rollOutcome = outcome;
         selectedSkill = skillName || '';
         
         // Apply the incident effects based on outcome
         handleIncidentOutcome(outcome);
      }
   }
   
   // Set up event listener when component mounts
   onMount(() => {
      window.addEventListener('kingdomRollComplete', handleRollCompleteEvent as EventListener);
   });
   
   // Clean up event listener when component unmounts
   onDestroy(() => {
      window.removeEventListener('kingdomRollComplete', handleRollCompleteEvent as EventListener);
   });
   
   function resolveIncident(skill: string) {
      selectedSkill = skill;
      isRolling = true;
   }
   
   function handleRollComplete(event: CustomEvent) {
      isRolling = false;
      // The actual outcome handling is done by the roll result handler
   }
   
   function handleIncidentOutcome(outcome: string) {
      if (!currentIncident) return;
      
      // Here you would apply the incident effects to the kingdom state
      // based on the outcome (success, failure, criticalFailure)
      console.log(`Incident resolved with ${outcome}:`, currentIncident);
      
      // Mark the incident as handled
      if (!incidentChecked) {
         markPhaseStepCompleted('unrest-check');
      }
   }
</script>

<div class="unrest-phase">
   <!-- Step 1: Unrest Dashboard -->
   <div class="unrest-dashboard">
      <div class="unrest-header">
         <div class="unrest-title">
            <i class="fas fa-fire unrest-icon"></i>
            <span>Unrest Status</span>
         </div>
      </div>
      
      <div class="unrest-value-display">
         <div class="unrest-current">{currentUnrest}</div>
         <div class="unrest-tier-badge tier-{getTierClass(tierName)}">
            {tierName}
         </div>
      </div>
      
      {#if $kingdomState.imprisonedUnrest > 0}
         <div class="imprisoned-unrest">
            <i class="fas fa-lock"></i>
            <span>Imprisoned Unrest:</span>
            <span class="imprisoned-value">{$kingdomState.imprisonedUnrest}</span>
         </div>
      {/if}
      
      {#if penalty !== 0}
         <div class="unrest-penalty">
            <i class="fas fa-exclamation-triangle penalty-icon"></i>
            <span class="penalty-text">Kingdom Check Penalty:</span>
            <span class="penalty-value">{penalty}</span>
         </div>
      {/if}
   </div>
   
   <!-- Step 2: Incident Section -->
   {#if tier > 0 && incidentLevel}
      <div class="incident-section">
         <div class="incident-header">
            <div class="incident-title">
               Step 2: Check for {incidentLevel.charAt(0) + incidentLevel.slice(1).toLowerCase()} Incidents
            </div>
            <button 
               class="roll-incident-btn"
               on:click={rollForIncident}
               disabled={isRolling || incidentChecked}
            >
               <i class="fas fa-dice-d20 {isRolling ? 'spinning' : ''}"></i> 
               {#if incidentChecked}
                  Incident Checked
               {:else if isRolling}
                  Rolling...
               {:else}
                  Roll for Incident
               {/if}
            </button>
         </div>
         
         {#if showIncidentResult}
            <div class="incident-result-container">
               {#if currentIncident}
                  <div class="incident-display">
                     <div class="roll-result">
                        <div class="roll-value {isRolling ? 'rolling' : ''}">{lastRoll}</div>
                        <div class="roll-label">d100 Roll</div>
                     </div>
                     
                     <div class="incident-info">
                        <div class="incident-name">{currentIncident.name}</div>
                        <div class="incident-description">{currentIncident.description}</div>
                        <div class="incident-level-badge level-{currentIncident.level.toLowerCase()}">
                           {currentIncident.level}
                        </div>
                     </div>
                     
                     {#if currentIncident.skillOptions && currentIncident.skillOptions.length > 0}
                        <div class="skill-options">
                           <div class="skill-options-title">Choose Resolution Approach:</div>
                           <div class="skill-tags">
                              {#each currentIncident.skillOptions as option}
                                 <SkillTag
                                    skill={option.skill}
                                    description={option.description}
                                    selected={selectedSkill === option.skill}
                                    disabled={incidentResolved || isRolling}
                                    loading={isRolling && selectedSkill === option.skill}
                                    checkType="incident"
                                    checkName={currentIncident.name}
                                    checkId={currentIncident.id}
                                    checkEffects={{
                                       criticalSuccess: { description: "The incident is resolved favorably" },
                                       success: currentIncident.successEffect,
                                       failure: currentIncident.failureEffect,
                                       criticalFailure: currentIncident.criticalFailureEffect
                                    }}
                                    on:execute={() => resolveIncident(option.skill)}
                                    on:rollComplete={handleRollComplete}
                                 />
                              {/each}
                           </div>
                        </div>
                     {/if}
                     
                     <div class="incident-effects">
                        {#if incidentResolved}
                           <div class="resolution-banner {rollOutcome}">
                              <i class="fas fa-dice-d20"></i>
                              <span>
                                 {#if rollOutcome === 'criticalSuccess'}
                                    Critical Success! The incident is resolved favorably.
                                 {:else if rollOutcome === 'success'}
                                    Success: {currentIncident.successEffect}
                                 {:else if rollOutcome === 'failure'}
                                    Failure: {currentIncident.failureEffect}
                                 {:else}
                                    Critical Failure: {currentIncident.criticalFailureEffect}
                                 {/if}
                              </span>
                           </div>
                        {:else}
                           <div class="effect-row">
                              <span class="effect-label">Success:</span>
                              <span class="effect-text effect-success">{currentIncident.successEffect}</span>
                           </div>
                           <div class="effect-row">
                              <span class="effect-label">Failure:</span>
                              <span class="effect-text effect-failure">{currentIncident.failureEffect}</span>
                           </div>
                           <div class="effect-row">
                              <span class="effect-label">Critical Failure:</span>
                              <span class="effect-text effect-critical">{currentIncident.criticalFailureEffect}</span>
                           </div>
                        {/if}
                     </div>
                  </div>
               {:else}
                  <div class="no-incident">
                     <div class="roll-result">
                        <div class="roll-value">{lastRoll}</div>
                        <div class="roll-label">d100 Roll</div>
                     </div>
                     <i class="fas fa-shield-alt no-incident-icon"></i>
                     <div class="no-incident-text">No Incident!</div>
                     <div class="no-incident-desc">The kingdom avoids crisis this turn</div>
                  </div>
               {/if}
            </div>
         {/if}
      </div>
   {:else}
      <div class="no-incident">
         <i class="fas fa-dove no-incident-icon"></i>
         <div class="no-incident-text">Kingdom is Stable</div>
         <div class="no-incident-desc">No incidents occur when unrest is at this level</div>
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
      padding: 25px;
   }
   
   .unrest-header {
      margin-bottom: 20px;
   }
   
   .unrest-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: var(--type-heading-1-size);
      font-weight: var(--type-heading-1-weight);
      line-height: var(--type-heading-1-line);
      color: var(--text-primary);
      
      .unrest-icon {
         color: var(--color-amber);
         font-size: 24px;
      }
   }
   
   .unrest-value-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin: 20px 0;
   }
   
   .unrest-current {
      font-size: 48px;
      font-weight: bold;
      color: var(--text-primary);
      text-shadow: var(--text-shadow-md);
   }
   
   .unrest-tier-badge {
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: var(--type-badge-size);
      font-weight: var(--type-badge-weight);
      line-height: var(--type-badge-line);
      letter-spacing: var(--type-badge-spacing);
      text-transform: uppercase;
      
      &.tier-stable {
         background: rgba(34, 197, 94, 0.2);
         color: var(--color-green);
         border: 1px solid var(--color-green-border);
      }
      
      &.tier-discontent {
         background: rgba(251, 191, 36, 0.2);
         color: var(--color-amber-light);
         border: 1px solid var(--color-amber);
      }
      
      &.tier-unrest {
         background: rgba(249, 115, 22, 0.2);
         color: var(--color-orange);
         border: 1px solid var(--color-orange-border);
      }
      
      &.tier-rebellion {
         background: rgba(239, 68, 68, 0.2);
         color: var(--color-red);
         border: 1px solid var(--color-red);
      }
   }
   
   .imprisoned-unrest {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      margin-top: 15px;
      color: var(--text-secondary);
      
      i {
         color: var(--color-gray-500);
      }
      
      .imprisoned-value {
         color: var(--text-primary);
         font-weight: 600;
      }
   }
   
   .unrest-penalty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-md);
      margin-top: 15px;
      
      .penalty-icon {
         color: var(--color-amber);
         font-size: 18px;
      }
      
      .penalty-text {
         color: var(--color-amber-light);
      }
      
      .penalty-value {
         color: var(--color-amber-light);
         font-weight: bold;
         font-size: var(--font-lg);
      }
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
      font-size: var(--type-heading-2-size);
      font-weight: var(--type-heading-2-weight);
      line-height: var(--type-heading-2-line);
      color: var(--text-primary);
   }
   
   .roll-incident-btn {
      padding: 10px 20px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      line-height: var(--type-button-line);
      letter-spacing: var(--type-button-spacing);
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
         font-size: 36px;
         font-weight: bold;
         color: var(--color-amber-light);
         text-shadow: var(--text-shadow-md);
         
         &.rolling {
            animation: pulse 0.5s ease-in-out;
         }
      }
      
      .roll-label {
         font-size: var(--type-label-size);
         font-weight: var(--type-label-weight);
         letter-spacing: var(--type-label-spacing);
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
         font-size: var(--type-heading-1-size);
         font-weight: var(--type-heading-1-weight);
         line-height: var(--type-heading-1-line);
         color: var(--text-primary);
         margin-bottom: 10px;
      }
      
      .incident-description {
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
      }
      
      .incident-level-badge {
         position: absolute;
         top: 15px;
         right: 15px;
         padding: 5px 12px;
         border-radius: var(--radius-full);
         font-size: var(--type-badge-size);
         font-weight: var(--type-badge-weight);
         line-height: var(--type-badge-line);
         letter-spacing: var(--type-badge-spacing);
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
         font-size: var(--type-heading-3-size);
         font-weight: var(--type-heading-3-weight);
         line-height: var(--type-heading-3-line);
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
   
   .resolution-banner {
      padding: 15px;
      border-radius: var(--radius-md);
      border: 1px solid;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
      
      i {
         font-size: 20px;
      }
      
      &.criticalSuccess {
         background: rgba(34, 197, 94, 0.2);
         border-color: var(--color-green);
         color: var(--color-green);
      }
      
      &.success {
         background: rgba(34, 197, 94, 0.1);
         border-color: rgba(34, 197, 94, 0.5);
         color: var(--color-green-light);
      }
      
      &.failure {
         background: rgba(249, 115, 22, 0.1);
         border-color: rgba(249, 115, 22, 0.5);
         color: var(--color-orange);
      }
      
      &.criticalFailure {
         background: rgba(239, 68, 68, 0.2);
         border-color: var(--color-red);
         color: var(--color-red);
      }
   }
   
   .incident-effects {
      padding: 15px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      
      .effect-row {
         display: flex;
         gap: 10px;
         margin-bottom: 10px;
         
         &:last-child {
            margin-bottom: 0;
         }
      }
      
      .effect-label {
         font-weight: 600;
         color: var(--text-secondary);
         min-width: 120px;
      }
      
      .effect-text {
         flex: 1;
         line-height: 1.4;
         
         &.effect-success {
            color: var(--color-green);
         }
         
         &.effect-failure {
            color: var(--color-orange);
         }
         
         &.effect-critical {
            color: var(--color-red);
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
         font-size: var(--type-heading-2-size);
         font-weight: var(--type-heading-2-weight);
         line-height: var(--type-heading-2-line);
         color: var(--text-primary);
         margin-bottom: 8px;
      }
      
      .no-incident-desc {
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
      }
   }
</style>
