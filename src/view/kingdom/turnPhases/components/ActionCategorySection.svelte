<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BaseCheckCard from '../../../kingdom/components/BaseCheckCard.svelte';
  import CommerceTierInfo from '../../../kingdom/components/CheckCard/components/CommerceTierInfo.svelte';
  import SectionHeader from './SectionHeader.svelte';
  import type { PlayerAction } from '../../../../controllers/actions/pipeline-types';
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
  export let pendingOutcomes: any[];
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

  // NOTE: Reroll handling has been moved to OutcomeDisplay.svelte
  // OutcomeDisplay now calls PipelineCoordinator.rerollFromStep3() directly

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
        {@const actionNumber = getActionNumber(action.id) ?? undefined}
        {@const instanceId = currentActionInstances.get(action.id)}
        {@const checkInstance = instanceId ? pendingOutcomes?.find(i => i.previewId === instanceId) : null}
        {@const isResolved = !!(checkInstance && checkInstance.status !== 'pending')}
        {@const resolution = checkInstance?.appliedOutcome ? {
          outcome: checkInstance.appliedOutcome.outcome,
          actorName: checkInstance.appliedOutcome.actorName,
          skillName: checkInstance.appliedOutcome.skillName || '',
          modifiers: checkInstance.appliedOutcome.modifiers || [],
          effect: checkInstance.appliedOutcome.effect || '',
          specialEffects: checkInstance.appliedOutcome.specialEffects || [],
          rollBreakdown: checkInstance.appliedOutcome.rollBreakdown,
          effectsApplied: checkInstance.appliedOutcome.effectsApplied || false,
          componentName: checkInstance.appliedOutcome.componentName  // ✅ CRITICAL: Preserve for OutcomeDisplay registry lookup
        } : undefined}
        {@const customResolution = (resolution && checkInstance?.appliedOutcome?.customComponent) 
          ? { 
              component: checkInstance.appliedOutcome.customComponent, 
              props: checkInstance.appliedOutcome.customResolutionProps || {} 
            }
          : null}
        {@const isAvailable = controller ? isActionAvailable(action) : false}
        {@const missingRequirements = !isAvailable && controller ? getMissingRequirements(action) : []}
        {#key `${action.id}-${instanceId || 'none'}-${activeAidsCount}-${isAvailable}-${armyDataKey}-${resourcesKey}`}
          <div class="action-card-wrapper">
            <BaseCheckCard
            id={action.id}
            outcomePreview={checkInstance || null}
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
                description: action.outcomes.criticalSuccess?.description ?? action.outcomes.success?.description ?? '',
                modifiers: action.outcomes.criticalSuccess?.modifiers ?? [],
                gameCommands: action.outcomes.criticalSuccess?.gameCommands ?? []
              },
              {
                type: 'success',
                description: action.outcomes.success?.description ?? '',
                modifiers: action.outcomes.success?.modifiers ?? [],
                gameCommands: action.outcomes.success?.gameCommands ?? []
              },
              {
                type: 'failure',
                description: action.outcomes.failure?.description ?? '',
                modifiers: action.outcomes.failure?.modifiers ?? [],
                gameCommands: action.outcomes.failure?.gameCommands ?? []
              },
              {
                type: 'criticalFailure',
                description: action.outcomes.criticalFailure?.description ?? '',
                modifiers: action.outcomes.criticalFailure?.modifiers ?? [],
                gameCommands: action.outcomes.criticalFailure?.gameCommands ?? []
              }
            ]}
            checkType="action"
            expandable={true}
            showCompletions={true}
            showAvailability={true}
            showSpecial={true}
            showIgnoreButton={false}
            special={action.special}
            cost={action.cost instanceof Map ? action.cost : (action.cost ? new Map(Object.entries(action.cost)) : null)}
            expanded={expandedActions.has(action.id)}
            on:toggle={() => handleToggle(action.id)}
            available={isAvailable}
            {missingRequirements}
            resolved={isResolved}
            {resolution}
            canPerformMore={actionsUsed < 4 && !isResolved}
            currentFame={currentFame}
            showAidButton={true}
            aidResult={getAidResultForAction(action.id)}
            {hideUntrainedSkills}
            resolvedBadgeText="Resolved"
            skillSectionTitle="Choose Skill:"
            {isViewingCurrentPhase}
            {actionStatus}
            {actionNumber}
            on:executeSkill={(e) => handleExecuteSkill(e, action)}
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
