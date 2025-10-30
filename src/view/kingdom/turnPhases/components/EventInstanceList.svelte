<script lang="ts">
  import BaseCheckCard from '../../components/BaseCheckCard.svelte';
  import CustomModifierDisplay from '../../components/CustomModifierDisplay.svelte';
  import { buildEventOutcomes } from '../../../../controllers/shared/EventOutcomeHelpers';
  import { buildPossibleOutcomes } from '../../../../controllers/shared/PossibleOutcomeHelpers';
  
  // Props
  export let type: 'ongoing' | 'resolved' | 'modifiers';
  export let instances: any[] = [];
  export let modifiers: any[] = [];
  export let isViewingCurrentPhase: boolean = true;
  export let getAidResult: (eventId: string) => any = () => null;
  
  // Section configuration
  $: config = getConfig(type);
  
  function getConfig(type: string) {
    switch (type) {
      case 'ongoing':
        return {
          title: 'Ongoing Events',
          titleClass: 'ongoing-events-header',
          listClass: 'ongoing-events-list',
          showAidButton: true,
          showIgnoreButton: true,
          expandable: false,
          showCompletions: false,
          showAvailability: false,
          showSpecial: false,
          primaryButtonLabel: 'Apply Result',
          skillSectionTitle: 'Choose Your Response:'
        };
      case 'resolved':
        return {
          title: 'Resolved Events',
          titleClass: 'resolved-events-header',
          listClass: 'resolved-events-list',
          showAidButton: false,
          showIgnoreButton: false,
          expandable: false,
          showCompletions: false,
          showAvailability: false,
          showSpecial: false,
          primaryButtonLabel: 'Apply Result',
          skillSectionTitle: '',
          statusBadge: { text: 'Resolved', type: 'resolved' as const }
        };
      case 'modifiers':
        return {
          title: 'Custom Modifiers',
          titleClass: 'custom-modifiers-header',
          listClass: 'custom-modifiers-list'
        };
      default:
        return {};
    }
  }
  
  // Build outcomes for events
  function buildOutcomes(event: any) {
    if (!event) return [];
    return buildEventOutcomes(event);
  }
</script>

{#if type === 'modifiers'}
  {#if modifiers.length > 0}
    <div class="custom-modifiers-section">
      <h2 class={config.titleClass}>{config.title}</h2>
      <div class={config.listClass}>
        {#each modifiers as modifier}
          <CustomModifierDisplay {modifier} />
        {/each}
      </div>
    </div>
  {/if}
{:else}
  {#if instances.length > 0}
    <div class="{type}-events-section">
      <h2 class={config.titleClass}>{config.title}</h2>
      <div class={config.listClass}>
        {#each instances as item}
          {@const eventData = item.event || item.instance?.checkData || item.checkData}
          {@const instance = item.instance || item}
          {@const outcomes = buildOutcomes(eventData)}
          {@const possibleOutcomes = eventData ? buildPossibleOutcomes(eventData.effects) : []}
          {@const aidResult = eventData ? getAidResult(eventData.id) : null}
          {@const resolution = item.instance?.appliedOutcome || item.appliedOutcome || null}
          {@const resolved = !!resolution}
          
          <BaseCheckCard
            id={instance.instanceId || instance.checkId}
            checkInstance={instance}
            name={eventData.name}
            description={eventData.description}
            skills={eventData.skills}
            {outcomes}
            traits={eventData.traits || []}
            checkType="event"
            expandable={config.expandable}
            showCompletions={config.showCompletions}
            showAvailability={config.showAvailability}
            showSpecial={config.showSpecial}
            showIgnoreButton={config.showIgnoreButton}
            {isViewingCurrentPhase}
            {possibleOutcomes}
            showAidButton={config.showAidButton}
            {aidResult}
            {resolved}
            {resolution}
            primaryButtonLabel={config.primaryButtonLabel}
            skillSectionTitle={config.skillSectionTitle}
            resolutionInProgress={item.isBeingResolved}
            resolvingPlayerName={item.resolverName}
            isBeingResolvedByOther={item.isResolvedByOther}
            statusBadge={config.statusBadge}
            on:executeSkill
            on:primary
            on:cancel
            on:performReroll
            on:ignore
            on:aid
            on:debugOutcomeChanged
          />
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style lang="scss">
  .ongoing-events-section,
  .resolved-events-section,
  .custom-modifiers-section {
    padding: 20px 0;
  }
  
  .ongoing-events-header,
  .resolved-events-header,
  .custom-modifiers-header {
    margin: 0 0 15px 0;
    color: var(--text-accent);
    font-size: var(--font-xl);
    font-weight: var(--font-weight-normal);
  }
  
  .ongoing-events-list,
  .resolved-events-list,
  .custom-modifiers-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
</style>
