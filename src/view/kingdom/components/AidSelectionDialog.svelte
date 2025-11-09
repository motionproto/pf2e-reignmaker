<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
  import { getSkillBonuses } from '../../../services/pf2e';

  export let show: boolean = false;
  export let actionName: string = '';

  const dispatch = createEventDispatcher<{
    confirm: { skill: string };
    cancel: void;
  }>();

  const PLACEHOLDER = '__pick';
  let selectedSkill = PLACEHOLDER;

  // Reset to placeholder when dialog opens
  $: if (show) {
    selectedSkill = PLACEHOLDER;
  }

  const skills = [
    { value: 'acrobatics', label: 'Acrobatics' },
    { value: 'arcana', label: 'Arcana' },
    { value: 'athletics', label: 'Athletics' },
    { value: 'crafting', label: 'Crafting' },
    { value: 'deception', label: 'Deception' },
    { value: 'diplomacy', label: 'Diplomacy' },
    { value: 'intimidation', label: 'Intimidation' },
    { value: 'lore', label: 'Lore' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'nature', label: 'Nature' },
    { value: 'occultism', label: 'Occultism' },
    { value: 'performance', label: 'Performance' },
    { value: 'religion', label: 'Religion' },
    { value: 'society', label: 'Society' },
    { value: 'stealth', label: 'Stealth' },
    { value: 'survival', label: 'Survival' },
    { value: 'thievery', label: 'Thievery' }
  ];

  // Get skill bonuses for the current user's character
  $: skillBonuses = getSkillBonuses(skills.map(s => s.value));

  // Create enhanced skills with bonuses for display
  $: skillsWithBonuses = skills.map(skill => {
    const bonus = skillBonuses.get(skill.value) ?? null;
    const displayLabel = bonus !== null 
      ? `${skill.label} (${bonus >= 0 ? '+' : ''}${bonus})`
      : skill.label;
    return {
      ...skill,
      bonus,
      displayLabel
    };
  });

  // Get display label for selected skill (with bonus if available)
  $: selectedLabel = skillsWithBonuses.find(s => s.value === selectedSkill)?.displayLabel || 'Pick a skill';

  function handleConfirm() {
    dispatch('confirm', { skill: selectedSkill });
    show = false;
  }

  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
</script>

<Dialog 
  bind:show 
  title="Aid Another: {actionName}"
  confirmLabel="Roll"
  confirmDisabled={selectedSkill === PLACEHOLDER}
  width="450px"
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
>
  <div class="aid-dialog-content">
    <p class="dialog-description">
      Select which skill you want to use to aid this action. Your aid check will use the standard Aid Another DC(15).
    </p>
    <div class="skill-select-group">
      <label for="skill-select">Skill:</label>
      <div class="custom-select-wrapper">
        <select 
          id="skill-select" 
          bind:value={selectedSkill} 
          class="skill-select"
          data-placeholder={selectedSkill === PLACEHOLDER}
        >
          <option value={PLACEHOLDER} disabled>Pick a skill</option>
          {#each skillsWithBonuses as skill}
            <option value={skill.value}>
              {skill.displayLabel}
            </option>
          {/each}
        </select>
        <div class="select-display">
          {selectedLabel}
        </div>
      </div>
    </div>
  </div>
</Dialog>

<style>
  .aid-dialog-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
  }

  .dialog-description {
    margin: 0;
    color: var(--text-secondary, #b0b0b3);
    font-size: var(--font-md);
    line-height: 1.5;
  }

  .skill-select-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .skill-select-group label {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary, #b0b0b3);
    font-size: var(--font-md);
  }

  .custom-select-wrapper {
    position: relative;
  }

  .skill-select {
    width: 100%;
    padding: var(--space-16);
    padding-right: var(--space-24);
    border: 1px solid var(--border-default, #3a3a3d);
    border-radius: var(--radius-sm, 4px);
    background: var(--color-gray-900, #3f3f46);
    color: transparent;
    font-size: var(--font-md);
    cursor: pointer;
    font-family: inherit;
    -webkit-appearance: menulist;
    -moz-appearance: menulist;
    appearance: menulist;
  }

  .skill-select:focus {
    outline: 2px solid var(--color-amber, #fbbf24);
    outline-offset: 0.1250rem;
    border-color: var(--color-amber, #fbbf24);
  }

  .skill-select option {
    background: var(--color-gray-800, #27272a);
    color: #ffffff;
    padding: var(--space-8);
  }

  .select-display {
    position: absolute;
    top: 50%;
    left: 0;
    right: 2.5rem;
    padding: 0 var(--space-16);
    transform: translateY(-50%);
    pointer-events: none;
    font-size: var(--font-md);
    line-height: 1;
    color: #ffffff;
    font-style: normal;
  }

  /* Apply placeholder styling based on selectedSkill value */
  .custom-select-wrapper:has(.skill-select[data-placeholder="true"]) .select-display {
    color: var(--text-tertiary, #6b7280);
    font-style: italic;
  }
</style>
