<script lang="ts">
  import {
    testingModeCharacters,
    selectedCharacterIndex,
    actedCharacterIds,
    selectCharacter
  } from '../../../stores/TestingModeStore';
</script>

<div class="testing-mode-bar">
  <div class="bar-label">
    <i class="fas fa-flask"></i>
    <span>Testing Mode</span>
  </div>
  <div class="character-list">
    {#each $testingModeCharacters as char, index}
      <button
        class="character-pill"
        class:selected={index === $selectedCharacterIndex}
        class:acted={$actedCharacterIds.has(char.actorId)}
        on:click={() => selectCharacter(index)}
      >
        <span class="char-name">{char.characterName}</span>
        <span class="char-level">Lv.{char.level}</span>
        {#if $actedCharacterIds.has(char.actorId)}
          <i class="fas fa-check acted-check"></i>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .testing-mode-bar {
    background: var(--overlay-low);
    border: 1px solid var(--border-special);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-16);
    margin: 0 var(--space-16) var(--space-8);
    display: flex;
    align-items: center;
    gap: var(--space-16);
  }

  .bar-label {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--border-special);
    white-space: nowrap;

    i {
      font-size: var(--font-lg);
    }
  }

  .character-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    flex: 1;
  }

  .character-pill {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-12);
    border-radius: var(--radius-full);
    border: 2px solid var(--border-medium);
    background: var(--surface-low);
    color: var(--text-primary);
    font-size: var(--font-sm);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-higher);
      border-color: var(--border-special);
    }

    &.selected {
      background: var(--surface-special-low);
      border-color: var(--border-special);
      box-shadow: 0 0 0.5rem var(--surface-special-low);
    }

    &.acted {
      opacity: 0.6;

      .char-name {
        text-decoration: line-through;
      }
    }

    &.selected.acted {
      opacity: 1;
    }
  }

  .char-name {
    font-weight: var(--font-weight-medium);
  }

  .char-level {
    color: var(--text-secondary);
    font-size: var(--font-xs);
  }

  .acted-check {
    color: var(--color-green);
    font-size: var(--font-xs);
    margin-left: var(--space-4);
  }
</style>
