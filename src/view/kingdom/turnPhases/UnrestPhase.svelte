<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import { TurnPhase, TurnPhaseConfig } from '../../../models/KingdomState';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import UI components
   import SkillTag from '../../kingdom/components/SkillTag.svelte';
   import PossibleOutcomes from '../../kingdom/components/PossibleOutcomes.svelte';
   
   // UI State only - no business logic
   let automationRunning = false;
   let showIncidentResult = false;
   let selectedSkill = '';
   let isRolling = false;
   let incidentResolved = false;
   let rollOutcome: string = '';
   
   // Reactive UI state from store
   $: stepComplete = isPhaseStepCompleted('unrest-complete');
   $: unrestStatus = $kingdomData ? {
      currentUnrest: $kingdomData.unrest || 0,
      tier: Math.min(3, Math.floor(($kingdomData.unrest || 0) / 5)),
      tierName: getTierName(Math.min(3, Math.floor(($kingdomData.unrest || 0) / 5))),
      penalty: Math.min(3, Math.floor(($kingdomData.unrest || 0) / 5))
   } : { currentUnrest: 0, tier: 0, tierName: 'Stable', penalty: 0 };
   
   // Current incident from kingdom data - mock implementation
   $: currentIncident = $kingdomData.currentIncidentId ? {
      id: $kingdomData.currentIncidentId,
      name: 'Sample Incident',
      description: 'A sample incident for demonstration purposes',
      level: 'MINOR',
      skillOptions: [
         { skill: 'diplomacy', description: 'Use diplomacy to resolve peacefully' },
         { skill: 'intimidation', description: 'Use intimidation to suppress the incident' }
      ],
      successEffect: 'The incident is resolved successfully',
      failureEffect: 'The incident causes minor unrest',
      criticalFailureEffect: 'The incident escalates significantly'
   } : null;
   
   // No automatic behavior - incident checks are now manual only
   onMount(() => {
      // Component mounted - unrest status is displayed, but no automatic actions
      console.log('🟡 [UnrestPhase] Component mounted - incident checks are manual');
   });
   
   function getTierName(tier: number): string {
      switch (tier) {
         case 0: return 'Stable';
         case 1: return 'Discontent';
         case 2: return 'Unrest';  
         case 3: return 'Rebellion';
         default: return 'Stable';
      }
   }
   
   function getIncidentById(incidentId: string) {
      // This would normally fetch from incident data
      // For now, return mock data or null
      return null;
   }
   
   
   async function rollForIncident() {
      if (unrestStatus.tier === 0) return;
      
      if (automationRunning) return;
      
      isRolling = true;
      showIncidentResult = false;
      
      try {
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         const controller = await createUnrestPhaseController();
         const result = await controller.rollForIncident(unrestStatus.tier);
         
         showIncidentResult = true;
         
         if (result.shouldCheck) {
            console.log('✅ [UnrestPhase] Incident roll completed', result);
         } else {
            console.log('ℹ️ [UnrestPhase] No incident check needed for this tier');
         }
      } catch (error) {
         console.error('❌ [UnrestPhase] Error rolling for incident:', error);
      } finally {
         isRolling = false;
      }
   }
   
   async function resolveIncident(skill: string) {
      if (!currentIncident) return;
      
      selectedSkill = skill;
      isRolling = true;
      
      try {
         const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
         const controller = await createUnrestPhaseController();
         
         // Create mock incident object for controller
         const mockIncident = {
            id: currentIncident.id,
            name: currentIncident.name,
            description: currentIncident.description,
            level: currentIncident.level as any, // Cast to avoid enum mismatch
            percentileMin: 1,
            percentileMax: 100,
            skillOptions: currentIncident.skillOptions || [],
            successEffect: currentIncident.successEffect,
            failureEffect: currentIncident.failureEffect,
            criticalFailureEffect: currentIncident.criticalFailureEffect,
            imagePath: null
         };
         
         const result = await controller.resolveIncident(
            mockIncident,
            skill,
            15, // mock roll total
            12, // mock DC
            'Player'
         );
         
         if (result.success) {
            incidentResolved = true;
            rollOutcome = result.resolution?.outcome || 'success';
            console.log('✅ [UnrestPhase] Incident resolved successfully');
         } else {
            console.error('❌ [UnrestPhase] Incident resolution failed:', result.error);
         }
      } catch (error) {
         console.error('❌ [UnrestPhase] Error resolving incident:', error);
      } finally {
         isRolling = false;
      }
   }
   
   // Get tier styling
   function getTierStyleClass(tierName: string): string {
      switch (tierName.toLowerCase()) {
         case 'stable': return 'stable';
         case 'discontent': return 'discontent';
         case 'unrest': return 'unrest';
         case 'rebellion': return 'rebellion';
         default: return 'stable';
      }
   }
   
   $: tierClass = getTierStyleClass(unrestStatus.tierName);
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
               {#if unrestStatus.tier === 0}
                  No incidents occur at this level
               {:else if unrestStatus.tier === 1}
                  Minor incidents possible
               {:else if unrestStatus.tier === 2}
                  Moderate incidents possible
               {:else}
                  Major incidents possible
               {/if}
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
   {#if unrestStatus.tier > 0 && showIncidentResult}
      <div class="incident-section">
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
   
   .resolution-banner {
      padding: 15px;
      border-radius: var(--radius-md);
      border: 1px solid;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: var(--font-weight-medium);
      
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
