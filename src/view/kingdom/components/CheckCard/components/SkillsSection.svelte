<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SkillTag from './SkillTag.svelte';
  import { getSkillBonuses } from '../../../../../services/pf2e';
  
  export let skills: Array<{ skill: string; description?: string }> = [];
  export let skillSectionTitle: string = 'Choose Skill:';
  export let canPerformMore: boolean = true;
  export let resolved: boolean = false;
  export let isRolling: boolean = false;
  export let localUsedSkill: string = '';
  export let showAidButton: boolean = false;
  export let aidResult: { outcome: string; bonus: number } | null = null;
  
  const dispatch = createEventDispatcher();
  
  // Get skill bonuses for all skills in this section
  $: skillBonuses = getSkillBonuses(skills.map(s => s.skill));
  
  function handleExecute(event: CustomEvent) {
    dispatch('execute', event.detail);
  }
  
  function handleAidClick() {
    dispatch('aid');
  }
</script>

<div class="skills-section">
  <h4 class="section-title">{skillSectionTitle}</h4>
  <div class="skills-tags">
    <!-- Aid Another button/badge as first item if enabled -->
    {#if showAidButton && !resolved}
      {#if aidResult}
        <!-- Aid result badge - shown after aid check completes -->
        <div class="aid-result-badge-inline {aidResult.outcome === 'criticalSuccess' ? 'critical-success' : aidResult.outcome === 'success' ? 'success' : 'failure'}">
          <i class="fas fa-hands-helping"></i>
          <span>
            Aid - {aidResult.outcome === 'criticalSuccess' ? `Critical (+${aidResult.bonus}, keep higher)` : `+${aidResult.bonus}`}
          </span>
        </div>
      {:else}
        <!-- Aid Another button - shown before aid check -->
        <button 
          class="aid-button-inline"
          on:click={handleAidClick}
          disabled={!canPerformMore}
        >
          <i class="fas fa-hands-helping"></i>
          Aid Another
        </button>
      {/if}
    {/if}
    
    {#each skills as skillOption}
      {@const isDisabled = !canPerformMore || resolved}
      {@const bonus = skillBonuses.get(skillOption.skill) ?? null}
      <SkillTag
        skill={skillOption.skill}
        description={skillOption.description || ''} 
        bonus={bonus}
        selected={false}
        disabled={isDisabled}
        loading={isRolling && skillOption.skill === localUsedSkill}
        faded={false}
        on:execute={handleExecute}
      />
    {/each}
  </div>
</div>

<style lang="scss">
  .skills-section {
    margin-top: var(--space-20);
  }
  
  .section-title {
    margin: 0 0 var(--space-12) 0;
    color: var(--text-primary);
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.3;
    opacity: 0.8;
  }
  
  .skills-tags {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-8);
    align-items: center;
  }
  
  .aid-button-inline {
    padding: var(--space-10) var(--space-16);
    background: rgba(59, 130, 246, 0.15);
    border: 0.0625rem solid rgba(96, 165, 250, 0.5);
    border-radius: var(--radius-sm);
    color: rgb(147, 197, 253);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    font-family: inherit;
    white-space: nowrap;
  }
  
  .aid-button-inline:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(96, 165, 250, 0.7);
    color: rgb(191, 219, 254);
    transform: translateY(-0.0625rem);
  }
  
  .aid-button-inline:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .aid-result-badge-inline {
    padding: var(--space-10) var(--space-16);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  
  .aid-result-badge-inline.critical-success {
    background: rgba(59, 130, 246, 0.15);
    border: 0.0625rem solid rgba(59, 130, 246, 0.4);
    color: rgb(59, 130, 246);
  }
  
  .aid-result-badge-inline.success {
    background: rgba(34, 197, 94, 0.15);
    border: 0.0625rem solid rgba(34, 197, 94, 0.4);
    color: rgb(34, 197, 94);
  }
  
  .aid-result-badge-inline.failure {
    background: rgba(239, 68, 68, 0.15);
    border: 0.0625rem solid rgba(239, 68, 68, 0.4);
    color: rgb(239, 68, 68);
  }
</style>
