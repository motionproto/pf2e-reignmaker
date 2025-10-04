<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SkillTag from '../../SkillTag.svelte';
  
  export let skills: Array<{ skill: string; description?: string }> = [];
  export let skillSectionTitle: string = 'Choose Skill:';
  export let canPerformMore: boolean = true;
  export let resolved: boolean = false;
  export let isRolling: boolean = false;
  export let localUsedSkill: string = '';
  
  const dispatch = createEventDispatcher();
  
  function handleExecute(event: CustomEvent) {
    dispatch('execute', event.detail);
  }
</script>

<div class="skills-section">
  <h4 class="section-title">{skillSectionTitle}</h4>
  <div class="skills-tags">
    {#each skills as skillOption}
      {@const isDisabled = !canPerformMore || resolved}
      <SkillTag
        skill={skillOption.skill}
        description={skillOption.description || ''} 
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
    margin-top: 20px;
  }
  
  .section-title {
    margin: 0 0 12px 0;
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
    gap: 8px;
    align-items: center;
  }
</style>
