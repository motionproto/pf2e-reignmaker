<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BaseCheckCard from '../../../kingdom/components/BaseCheckCard.svelte';
  import CommerceTierInfo from '../../../kingdom/components/CheckCard/components/CommerceTierInfo.svelte';
  import SectionHeader from './SectionHeader.svelte';
  import { getCustomResolutionComponent } from '../../../../controllers/actions/implementations';
  import type { PlayerAction } from '../../../../controllers/actions/action-types';
  import { getActionStatus, getActionNumber } from '../../../../constants/migratedActions';

  const dispatch = createEventDispatcher();

  // Props
  export let category: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
  export let actions: PlayerAction[];
  export let currentActionInstances: Map<string, string>;
  export let activeCheckInstances: any[];
  export let expandedActions: Set<string>;
  export let controller: any;
  export let activeAidsCount: number;
  export let armyDataKey: string;
  export let resourcesKey: string;
  export let isViewingCurrentPhase: boolean;
  export let actionsUsed: number;
  export let currentFame: number;
  export let getAidResultForAction: (actionId: string) => { outcome: string; bonus: number } | null;
  export let isActionAvailable: (action: any) => boolean;
  export let getMissingRequirements: (action: any) => string[];
  export let hideUntrainedSkills: boolean = true;

  // Toggle action expansion
  function handleToggle(actionId: string) {
    dispatch('toggle', { actionId });
  }

  // Forward all events to parent
  function handleExecuteSkill(event: CustomEvent, action: any) {
    dispatch('executeSkill', { event, action });
  }

  function handlePerformReroll(event: CustomEvent, action: any) {
    dispatch('performReroll', { event, action });
  }

  function handleDebugOutcomeChange(event: CustomEvent, action: any) {
    dispatch('debugOutcomeChange', { event, action });
  }

  function handleAid(event: CustomEvent) {
    dispatch('aid', event.detail);
  }

  function handlePrimary(event: CustomEvent) {
    dispatch('primary', event.detail);
  }

  function handleCancel(actionId: string) {
    dispatch('cancel', { actionId });
  }
</script>

{#if actions.length > 0}
  <div class="action-category">
    <div class="category-header">
      <SectionHeader icon={category.icon} name={category.name} />
      <!-- <p class="category-description">{category.description}</p> -->
    </div>

    <div class="actions-list">
      {#each actions as action (action.id)}
        {@const actionStatus = getActionStatus(action.id)}
        {@const actionNumber = getActionNumber(action.id)}
        {@const instanceId = currentActionInstances.get(action.id)}
        {@const checkInstance = instanceId ? activeCheckInstances?.find(i => i.instanceId === instanceId) : null}
        {@const isResolved = !!(checkInstance && checkInstance.status !== 'pending')}
        {@const resolution = checkInstance?.appliedOutcome ? {
          outcome: checkInstance.appliedOutcome.outcome,
          actorName: checkInstance.appliedOutcome.actorName,
          skillName: checkInstance.appliedOutcome.skillName || '',
          modifiers: checkInstance.appliedOutcome.modifiers || [],
          effect: checkInstance.appliedOutcome.effect || '',
          specialEffects: checkInstance.appliedOutcome.specialEffects || [],
          rollBreakdown: checkInstance.appliedOutcome.rollBreakdown,
          effectsApplied: checkInstance.appliedOutcome.effectsApplied || false
        } : undefined}
        {@const customResolution = (resolution && checkInstance?.appliedOutcome?.customComponent) 
          ? { 
              component: checkInstance.appliedOutcome.customComponent, 
              props: checkInstance.appliedOutcome.customResolutionProps || {} 
            }
          : (resolution && controller) 
            ? getCustomResolutionComponent(action.id, resolution.outcome) 
            : null}
        {@const isAvailable = controller ? isActionAvailable(action) : false}
        {@const missingRequirements = !isAvailable && controller ? getMissingRequirements(action) : []}
        {#key `${action.id}-${instanceId || 'none'}-${activeAidsCount}-${isAvailable}-${armyDataKey}-${resourcesKey}`}
          <div class="action-card-wrapper">
            {#if actionNumber}
              <div class="action-badge" 
                   class:untested={actionStatus === 'untested'}
                   class:testing={actionStatus === 'testing'}
                   class:tested={actionStatus === 'tested' || actionStatus === 'verified'}
                   title="{actionStatus === 'untested' ? 'Untested' : actionStatus === 'testing' ? 'Currently Testing' : 'Tested'}">
                {#if actionStatus === 'tested' || actionStatus === 'verified'}
                  <span class="checkmark">✓</span>
                {:else}
                  <span class="number">#{actionNumber}</span>
                {/if}
              </div>
            {/if}
            <BaseCheckCard
            id={action.id}
            checkInstance={checkInstance || null}
            customResolutionComponent={customResolution?.component || null}
            customResolutionProps={customResolution?.props || {}}
            name={action.name}
            description={action.description}
            brief={action.brief || ''}
            skills={action.skills}
            conditionalSkills={action.conditionalSkills}
            outcomes={[
              {
                type: 'criticalSuccess',
                description: action.effects?.criticalSuccess?.description || action.criticalSuccess?.description || action.success?.description || '—',
                modifiers: action.effects?.criticalSuccess?.modifiers || action.criticalSuccess?.modifiers || [],
                gameCommands: action.effects?.criticalSuccess?.gameCommands || []
              },
              {
                type: 'success',
                description: action.effects?.success?.description || action.success?.description || '—',
                modifiers: action.effects?.success?.modifiers || action.success?.modifiers || [],
                gameCommands: action.effects?.success?.gameCommands || []
              },
              {
                type: 'failure',
                description: action.effects?.failure?.description || action.failure?.description || '—',
                modifiers: action.effects?.failure?.modifiers || action.failure?.modifiers || [],
                gameCommands: action.effects?.failure?.gameCommands || []
              },
              {
                type: 'criticalFailure',
                description: action.effects?.criticalFailure?.description || action.criticalFailure?.description || '—',
                modifiers: action.effects?.criticalFailure?.modifiers || action.criticalFailure?.modifiers || [],
                gameCommands: action.effects?.criticalFailure?.gameCommands || []
              }
            ]}
            checkType="action"
            expandable={true}
            showCompletions={true}
            showAvailability={true}
            showSpecial={true}
            showIgnoreButton={false}
            special={action.special}
            cost={action.cost}
            expanded={expandedActions.has(action.id)}
            available={isAvailable}
            {missingRequirements}
            resolved={isResolved}
            {resolution}
            canPerformMore={actionsUsed < 4 && !isResolved}
            currentFame={currentFame}
            showFameReroll={true}
            showAidButton={true}
            aidResult={getAidResultForAction(action.id)}
            {hideUntrainedSkills}
            resolvedBadgeText="Resolved"
            primaryButtonLabel="Apply Result"
            skillSectionTitle="Choose Skill:"
            {isViewingCurrentPhase}
            on:toggle={() => handleToggle(action.id)}
            on:executeSkill={(e) => handleExecuteSkill(e, action)}
            on:performReroll={(e) => handlePerformReroll(e, action)}
            on:debugOutcomeChanged={(e) => handleDebugOutcomeChange(e, action)}
            on:aid={handleAid}
            on:primary={handlePrimary}
            on:cancel={(e) => handleCancel(e.detail.checkId)}
          >
            <div slot="pre-completion-content">
              {#if action.id === 'purchase-resources' || action.id === 'sell-surplus'}
                <CommerceTierInfo />
              {/if}
            </div>
            </BaseCheckCard>
          </div>
        {/key}
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .action-card-wrapper {
    position: relative;
  }

  .action-badge {
    position: absolute;
    top: var(--space-12);
    right: var(--space-12);
    z-index: 10;
    min-width: 2rem;
    height: 2rem;
    padding: 0 var(--space-8);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-sm);
    font-weight: var(--font-weight-bold);
    transition: all 0.2s ease;
    
    &.untested {
      background: var(--color-gray-600);
      color: white;
    }
    
    &.testing {
      background: white;
      color: var(--color-primary);
      border: 2px solid var(--color-primary);
      box-shadow: 0 0 8px rgba(0, 123, 255, 0.3);
    }
    
    &.tested {
      background: var(--color-success);
      color: white;
    }
    
    .checkmark {
      font-size: var(--font-lg);
    }
    
    .number {
      font-size: var(--font-sm);
    }
  }

  .action-category {
   // background: var(--surface-lowest);
    border-radius: var(--radius-md);
    //border: 1px solid var(--border-subtle);
    padding:0 var(--space-20);
  }

  .category-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    margin-bottom: var(--space-16);

    .category-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.5;
    }
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
</style>
