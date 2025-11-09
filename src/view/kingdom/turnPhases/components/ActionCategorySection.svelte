<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BaseCheckCard from '../../../kingdom/components/BaseCheckCard.svelte';
  import CommerceTierInfo from '../../../kingdom/components/CheckCard/components/CommerceTierInfo.svelte';
  import SectionHeader from './SectionHeader.svelte';
  import { getCustomResolutionComponent } from '../../../../controllers/actions/implementations';
  import type { PlayerAction } from '../../../../controllers/actions/action-types';

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
      <p class="category-description">{category.description}</p>
    </div>

    <div class="actions-list">
      {#each actions as action (action.id)}
        {@const instanceId = currentActionInstances.get(action.id)}
        {@const checkInstance = instanceId ? activeCheckInstances?.find(i => i.instanceId === instanceId) : null}
        {@const isResolved = !!(checkInstance && checkInstance.status !== 'pending')}
        {@const resolution = checkInstance?.appliedOutcome ? {
          outcome: checkInstance.appliedOutcome.outcome,
          actorName: checkInstance.appliedOutcome.actorName,
          skillName: checkInstance.appliedOutcome.skillName || '',
          modifiers: checkInstance.appliedOutcome.modifiers || [],
          effect: checkInstance.appliedOutcome.effect || '',
          rollBreakdown: checkInstance.appliedOutcome.rollBreakdown,
          effectsApplied: checkInstance.appliedOutcome.effectsApplied || false
        } : undefined}
        {@const customResolution = (resolution && controller) ? getCustomResolutionComponent(action.id, resolution.outcome) : null}
        {@const isAvailable = controller ? isActionAvailable(action) : false}
        {@const missingRequirements = !isAvailable && controller ? getMissingRequirements(action) : []}
        {#key `${action.id}-${instanceId || 'none'}-${activeAidsCount}-${isAvailable}-${armyDataKey}-${resourcesKey}`}
          <BaseCheckCard
            id={action.id}
            checkInstance={checkInstance || null}
            customResolutionComponent={customResolution?.component || null}
            customResolutionProps={customResolution?.props || {}}
            name={action.name}
            description={action.description}
            brief={action.brief || ''}
            skills={action.skills}
            outcomes={[
              {
                type: 'criticalSuccess',
                description: action.criticalSuccess?.description || action.success?.description || '—',
                modifiers: action.criticalSuccess?.modifiers || []
              },
              {
                type: 'success',
                description: action.success?.description || '—',
                modifiers: action.success?.modifiers || []
              },
              {
                type: 'failure',
                description: action.failure?.description || '—',
                modifiers: action.failure?.modifiers || []
              },
              {
                type: 'criticalFailure',
                description: action.criticalFailure?.description || '—',
                modifiers: action.criticalFailure?.modifiers || []
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
        {/key}
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .action-category {
    background: var(--color-gray-900);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-accent-75);
    padding: 20px;
  }

  .category-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;

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
    gap: 12px;
  }
</style>
