<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted, checkPhaseAutoCompletions } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   
   // Import clean architecture components
   import { createUnrestPhaseController } from '../../../controllers/UnrestPhaseController';
   import type { UnrestPhaseController } from '../../../controllers/UnrestPhaseController';
   import { ProcessUnrestCommand } from '../../../commands/impl/ProcessUnrestCommand';
   import { commandExecutor } from '../../../commands/base/CommandExecutor';
   import type { CommandContext } from '../../../commands/base/Command';
   import { diceService } from '../../../services/domain/DiceService';
   
   // Import UI components
   import SkillTag from '../../kingdom/components/SkillTag.svelte';
   import PossibleOutcomes from '../../kingdom/components/PossibleOutcomes.svelte';
   import { initializeRollResultHandler } from '../../../api/foundry-actors';
   
   // Controller instance
   let unrestController: UnrestPhaseController;
   
   // UI State only - no business logic
   let showIncidentResult = false;
   let selectedSkill = '';
   let isRolling = false;
   let incidentResolved = false;
   let rollOutcome: string = '';
   
   // Reactive UI state
   $: incidentChecked = isPhaseStepCompleted('calculate-unrest');
   $: unrestStatus = unrestController?.getUnrestStatus($kingdomState) || { 
      currentUnrest: 0, 
      tier: 0, 
      tierName: 'Stable',
      penalty: 0 
   };
   
   // Check for auto-completions when tier is 0
   $: if (unrestStatus.tier === 0) {
      checkPhaseAutoCompletions(TurnPhase.PHASE_III);
   }
   
   // Initialize controller and roll handler on mount
   onMount(() => {
      unrestController = createUnrestPhaseController();
      initializeRollResultHandler();
      
      // Calculate initial unrest generation
      calculateUnrestGeneration();
   });
   
   // Listen for kingdom roll completion events
   function handleRollCompleteEvent(event: CustomEvent) {
      const { checkId, outcome, actorName, checkType, skillName } = event.detail;
      const currentIncident = unrestController?.getCurrentIncident();
      
      // Only handle incident type checks for our current incident
      if (checkType === 'incident' && currentIncident && checkId === currentIncident.id) {
         resolveIncidentWithOutcome(outcome, skillName || '', actorName);
      }
   }
   
   // Set up event listener when component mounts
   onMount(() => {
      window.addEventListener('kingdomRollComplete', handleRollCompleteEvent as EventListener);
      
      return () => {
         window.removeEventListener('kingdomRollComplete', handleRollCompleteEvent as EventListener);
      };
   });
   
   // Calculate unrest generation for this phase
   function calculateUnrestGeneration() {
      if (!unrestController) return;
      
      const generation = unrestController.calculateUnrestGeneration($kingdomState);
      // Generation is calculated and stored in controller state
   }
   
   // Roll for incident using controller
   async function rollForIncident() {
      if (!unrestController || unrestStatus.tier === 0) return;
      
      isRolling = true;
      showIncidentResult = false;
      
      // Animate the check
      setTimeout(async () => {
         // Use controller to roll for incident
         const result = unrestController.rollForIncident(unrestStatus.tier);
         
         showIncidentResult = true;
         isRolling = false;
         
         // Mark that we've checked for incidents, but don't apply unrest generation
         // Unrest generation should only be applied during the actual phase processing,
         // not when rolling for incidents
         if (!incidentChecked) {
            markPhaseStepCompleted('calculate-unrest');
         }
      }, 800);
   }
   
   // Apply unrest generation using command pattern
   async function applyUnrestGeneration() {
      if (!unrestController) return;
      
      const generation = unrestController.calculateUnrestGeneration($kingdomState);
      if (generation.total === 0) return;
      
      // Create command context
      const context: CommandContext = {
         kingdomState: get(kingdomState),
         currentTurn: $gameState.currentTurn || 1,
         currentPhase: 'Phase III: Unrest'
      };
      
      // Create command for unrest generation
      const command = ProcessUnrestCommand.generate(generation.total, 'phase-generation');
      
      // Execute command
      const result = await commandExecutor.execute(command, context);
      
      if (!result.success) {
         console.error('Failed to apply unrest generation:', result.error);
      }
   }
   
   // Start incident resolution with selected skill
   function resolveIncident(skill: string) {
      selectedSkill = skill;
      isRolling = true;
      // The actual roll will be handled by the Foundry integration
   }
   
   // Handle incident resolution outcome
   async function resolveIncidentWithOutcome(outcome: string, skill: string, actorName?: string) {
      if (!unrestController) return;
      
      const currentIncident = unrestController.getCurrentIncident();
      if (!currentIncident) return;
      
      // Generate a roll total based on outcome (this would normally come from Foundry)
      const dc = 15 + unrestStatus.tier * 5;
      let rollTotal = dc; // Default to success
      
      switch (outcome) {
         case 'criticalSuccess':
            rollTotal = dc + 10;
            break;
         case 'success':
            rollTotal = dc + 1;
            break;
         case 'failure':
            rollTotal = dc - 1;
            break;
         case 'criticalFailure':
            rollTotal = dc - 10;
            break;
      }
      
      // Use controller to resolve incident
      const resolution = await unrestController.resolveIncident(
         currentIncident,
         skill,
         rollTotal,
         dc,
         actorName
      );
      
      if (resolution.success && resolution.resolution) {
         incidentResolved = true;
         rollOutcome = outcome;
         selectedSkill = skill;
         
         // Apply incident effects using commands
         await applyIncidentEffects(resolution.resolution.effects);
         
         if (!incidentChecked) {
            markPhaseStepCompleted('calculate-unrest');
         }
      }
      
      isRolling = false;
   }
   
   // Apply incident effects using command pattern
   async function applyIncidentEffects(effects: Map<string, any>) {
      const context: CommandContext = {
         kingdomState: get(kingdomState),
         currentTurn: $gameState.currentTurn || 1,
         currentPhase: 'Phase III: Unrest'
      };
      
      for (const [key, value] of effects) {
         switch (key) {
            case 'unrest':
               const unrestCommand = value > 0 
                  ? ProcessUnrestCommand.generate(value, 'incident')
                  : ProcessUnrestCommand.reduce(Math.abs(value), 'incident');
               await commandExecutor.execute(unrestCommand, context);
               break;
            // Other effects would be handled with appropriate commands
         }
      }
   }
   
   // Process imprisoned unrest actions
   async function processImprisonedUnrest(action: 'execute' | 'pardon', amount?: number) {
      if (!unrestController) return;
      
      const currentImprisoned = $kingdomState.imprisonedUnrest || 0;
      const result = unrestController.processImprisonedUnrest(currentImprisoned, action, amount);
      
      // Apply changes using commands
      const context: CommandContext = {
         kingdomState: get(kingdomState),
         currentTurn: $gameState.currentTurn || 1,
         currentPhase: 'Phase III: Unrest'
      };
      
      if (action === 'execute' && result.imprisonedChange < 0) {
         const command = ProcessUnrestCommand.release(Math.abs(result.imprisonedChange));
         await commandExecutor.execute(command, context);
      } else if (action === 'pardon' && result.unrestChange < 0) {
         const command = ProcessUnrestCommand.imprison(Math.abs(result.unrestChange));
         await commandExecutor.execute(command, context);
      }
   }
   
   // Get controller state for display
   $: controllerState = unrestController?.getState();
   $: currentIncident = controllerState?.currentIncident || null;
   $: incidentLevel = currentIncident ? unrestController?.getIncidentSeverity(currentIncident) : null;
   
   // Get tier styling from controller
   $: tierClass = unrestController?.getTierStyleClass(unrestStatus.tierName) || 'stable';
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
         <div class="unrest-current">{unrestStatus.currentUnrest}</div>
         <div class="unrest-tier-badge tier-{tierClass}">
            {unrestStatus.tierName}
         </div>
      </div>
      
      {#if $kingdomState.imprisonedUnrest > 0}
         <div class="imprisoned-unrest">
            <i class="fas fa-lock"></i>
            <span>Imprisoned Unrest:</span>
            <span class="imprisoned-value">{$kingdomState.imprisonedUnrest}</span>
         </div>
      {/if}
      
      {#if unrestStatus.penalty !== 0}
         <div class="unrest-penalty">
            <i class="fas fa-exclamation-triangle penalty-icon"></i>
            <span class="penalty-text">Kingdom Check Penalty:</span>
            <span class="penalty-value">{unrestStatus.penalty}</span>
         </div>
      {/if}
   </div>
   
   <!-- Step 2: Incident Section -->
   {#if unrestStatus.tier > 0}
      <div class="incident-section">
         <div class="incident-header">
            <div class="incident-title">
               Step 2: Check for {incidentLevel ? incidentLevel.charAt(0) + incidentLevel.slice(1).toLowerCase() : ''} Incidents
            </div>
            <button 
               class="roll-incident-btn"
               on:click={rollForIncident}
               disabled={isRolling || incidentChecked}
            >
               <i class="fas {incidentChecked ? 'fa-check' : 'fa-dice-d20'} {isRolling ? 'spinning' : ''}"></i> 
               {#if incidentChecked}
                  Unrest Calculated
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
                                 />
                              {/each}
                           </div>
                        </div>
                     {/if}
                     
                     {#if incidentResolved}
                        <div class="incident-effects">
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
                        </div>
                     {:else}
                        <PossibleOutcomes 
                           outcomes={[
                              { result: 'success', label: 'Success', description: currentIncident.successEffect },
                              { result: 'failure', label: 'Failure', description: currentIncident.failureEffect },
                              { result: 'criticalFailure', label: 'Critical Failure', description: currentIncident.criticalFailureEffect }
                           ]}
                           showTitle={false}
                        />
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
   /* Styles remain exactly the same as original */
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
      font-size: var(--font-3xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--text-primary);
      
      .unrest-icon {
         color: var(--color-amber);
         font-size: var(--font-3xl);
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
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.05em;
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
         font-weight: bold;
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
