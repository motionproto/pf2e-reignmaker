<script lang="ts">
  import {
    testingModeCharacters,
    selectedCharacterIndex,
    selectCharacter,
    autoAdvanceToNextAvailable
  } from '../../../stores/TestingModeStore';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { TurnPhase } from '../../../actors/KingdomActor';

  // Derive acted character names from actionLog (single source of truth)
  // This tracks which characters have taken actions in the current turn
  $: actionLog = $kingdomData.turnState?.actionLog || [];

  // Build a set of character names that have acted (from actionLog entries in ACTIONS or EVENTS phases)
  $: actedCharacterNames = new Set(
    actionLog
      .filter((entry: any) => entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
      .map((entry: any) => entry.characterName)
  );

  // Check if a character has acted by matching their name against actionLog
  function hasCharacterActed(characterName: string): boolean {
    return actedCharacterNames.has(characterName);
  }

  // Track previous action count to detect new actions
  let previousActionCount = 0;

  // Auto-advance to next character when a new action is logged
  $: {
    const currentActionCount = actionLog.filter(
      (entry: any) => entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS
    ).length;

    if (currentActionCount > previousActionCount && previousActionCount > 0) {
      // A new action was logged - auto-advance to next available character
      console.log('🧪 [TestingModeCharacterBar] New action logged, auto-advancing...');
      autoAdvanceToNextAvailable();
    }
    previousActionCount = currentActionCount;
  }
</script>

<div class="testing-mode-bar">
  <div class="bar-label">
    <i class="fas fa-flask"></i>
    <span>Testing Mode</span>
  </div>
  <div class="character-list">
    {#each $testingModeCharacters as char, index}
      {@const hasActed = hasCharacterActed(char.characterName)}
      <button
        class="character-pill"
        class:selected={index === $selectedCharacterIndex}
        class:acted={hasActed}
        on:click={() => selectCharacter(index)}
      >
        <span class="char-name">{char.characterName}</span>
        <span class="char-level">Lv.{char.level}</span>
        {#if hasActed}
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
