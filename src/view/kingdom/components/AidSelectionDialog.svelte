<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show: boolean = false;
  export let actionName: string = '';

  const dispatch = createEventDispatcher<{
    confirm: { skill: string };
    cancel: void;
  }>();

  const PLACEHOLDER = '__pick';
  let selectedSkill = PLACEHOLDER;

  // Reset to placeholder when dialog opens if somehow empty
  $: if (show && selectedSkill === '') selectedSkill = PLACEHOLDER;

  // Reactive statement to log the current selection for debugging
  $: console.log('[AidSelectionDialog] selectedSkill:', selectedSkill);

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

  function handleConfirm() {
    dispatch('confirm', { skill: selectedSkill });
    show = false;
  }

  function handleCancel() {
    dispatch('cancel');
    show = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!show) return;

    if (event.key === 'Enter') {
      handleConfirm();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="dialog-backdrop" on:click={handleBackdropClick}>
    <div class="dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3 class="dialog-title">Aid Another: {actionName}</h3>
        </div>
        <div class="dialog-body">
          <p class="dialog-description">
            Select which skill you want to use to aid this action. Your aid check will use the standard Aid Another DC(15).
          </p>
          <div class="skill-select-group">
            <label for="skill-select">Skill:</label>
            <select id="skill-select" bind:value={selectedSkill} class="skill-select">
              <option value={PLACEHOLDER} disabled>Pick a skill</option>
              {#each skills as skill}
                <option value={skill.value}>
                  {skill.label}
                </option>
              {/each}
            </select>
          </div>
        </div>
        <div class="dialog-footer">
          <button 
            class="dialog-button dialog-button-secondary" 
            on:click={handleCancel}
          >
            Cancel
          </button>
          <button 
            class="dialog-button dialog-button-primary" 
            on:click={handleConfirm}
            disabled={selectedSkill === PLACEHOLDER}
            autofocus
          >
            Roll
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--color-gray-900, #1f1f23);
    border: 2px solid var(--border-highlight, #4a4a4d);
    border-radius: var(--radius-lg, 8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    max-width: 450px;
    width: 90%;
    animation: dialogSlideIn 0.2s ease-out;
  }

  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-content {
    padding: 0;
  }

  .dialog-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-light, #3a3a3d);
    background: var(--color-gray-950, #18181b);
  }

  .dialog-title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary, #ffffff);
  }

  .dialog-body {
    padding: 1.5rem 1rem;
  }

  .dialog-description {
    margin: 0 0 1.5rem 0;
    color: var(--text-secondary, #b0b0b3);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .skill-select-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skill-select-group label {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary, #b0b0b3);
    font-size: 0.95rem;
  }

  .skill-select {
    padding: 1rem;
    padding-right: 2.5rem; /* Add space for the dropdown arrow */
    border: 1px solid var(--border-default, #3a3a3d);
    border-radius: var(--radius-sm, 4px);
    background: var(--color-gray-900, #3f3f46) !important;
    color: #ffffff !important;
    font-size: 1rem !important;
    cursor: pointer;
    font-family: inherit;
    -webkit-appearance: menulist !important;
    -moz-appearance: menulist !important;
    appearance: menulist !important;
  }

  .skill-select:focus {
    outline: 2px solid var(--color-amber, #fbbf24);
    outline-offset: 2px;
    border-color: var(--color-amber, #fbbf24);
  }

  .skill-select option {
    background: var(--color-gray-800, #27272a) !important;
    color: #ffffff !important;
    padding: 0.5rem;
  }

  .dialog-footer {
    padding: 1rem;
    border-top: 1px solid var(--border-light, #3a3a3d);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .dialog-button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-default, #3a3a3d);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.9rem;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
  }

  .dialog-button-primary {
    background: var(--color-amber, #fbbf24);
    color: var(--color-gray-950, #18181b);
    border-color: var(--color-amber, #fbbf24);
  }

  .dialog-button-primary:hover {
    background: var(--color-amber-dark, #f59e0b);
    border-color: var(--color-amber-dark, #f59e0b);
  }

  .dialog-button-primary:focus {
    outline: 2px solid var(--color-amber, #fbbf24);
    outline-offset: 2px;
  }

  .dialog-button-secondary {
    background: var(--color-gray-800, #27272a);
    color: var(--text-secondary, #b0b0b3);
    border-color: var(--border-default, #3a3a3d);
  }

  .dialog-button-secondary:hover {
    background: var(--color-gray-700, #3a3a3d);
  }
</style>
