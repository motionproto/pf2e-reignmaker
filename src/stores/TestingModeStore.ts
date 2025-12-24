/**
 * Testing Mode Store
 *
 * Local UI state for Testing Mode - allows developers to cycle through
 * party members when testing gameplay. This state is NOT persisted and
 * resets on page reload.
 */

import { writable, derived, get } from 'svelte/store';

export interface TestingModeCharacter {
  actorId: string;
  characterName: string;
  level: number;
  actor: any; // Full Foundry actor object
}

// Core state stores
export const testingModeEnabled = writable<boolean>(false);
export const testingModeCharacters = writable<TestingModeCharacter[]>([]);
export const selectedCharacterIndex = writable<number>(0);
export const actedCharacterIds = writable<Set<string>>(new Set());

// Derived: Currently selected character
export const selectedCharacter = derived(
  [testingModeCharacters, selectedCharacterIndex],
  ([$chars, $idx]) => $chars[$idx] || null
);

// Derived: Characters that haven't acted yet
export const availableCharacters = derived(
  [testingModeCharacters, actedCharacterIds],
  ([$chars, $acted]) => $chars.filter(c => !$acted.has(c.actorId))
);

/**
 * Toggle Testing Mode on/off
 */
export function toggleTestingMode(enabled: boolean): void {
  testingModeEnabled.set(enabled);
  if (!enabled) {
    // Reset state when disabling
    testingModeCharacters.set([]);
    selectedCharacterIndex.set(0);
    actedCharacterIds.set(new Set());
  }
}

/**
 * Select a character by index
 */
export function selectCharacter(index: number): void {
  const chars = get(testingModeCharacters);
  if (index >= 0 && index < chars.length) {
    selectedCharacterIndex.set(index);
  }
}

/**
 * Mark a character as having acted
 */
export function markCharacterAsActed(actorId: string): void {
  actedCharacterIds.update(acted => {
    const newSet = new Set(acted);
    newSet.add(actorId);
    return newSet;
  });
}

/**
 * Auto-advance to the next character who hasn't acted
 */
export function autoAdvanceToNextAvailable(): void {
  const chars = get(testingModeCharacters);
  const acted = get(actedCharacterIds);
  const currentIdx = get(selectedCharacterIndex);

  // Find next character who hasn't acted
  for (let i = 1; i <= chars.length; i++) {
    const nextIdx = (currentIdx + i) % chars.length;
    if (!acted.has(chars[nextIdx].actorId)) {
      selectedCharacterIndex.set(nextIdx);
      return;
    }
  }
  // All have acted - stay on current
}

/**
 * Reset acted characters (for new turn)
 */
export function resetActedCharacters(): void {
  actedCharacterIds.set(new Set());
}

/**
 * Initialize characters from the party actor's members
 */
export function initializeCharacters(): void {
  const game = (globalThis as any).game;
  if (!game?.actors) return;

  // Find the party actor
  const partyActor = game.actors.find((a: any) => a.type === 'party');

  let characterActors: any[] = [];

  if (partyActor?.members) {
    // members can be a Set, Map, or Collection - convert to array
    characterActors = Array.from(partyActor.members);
    console.log(`🧪 [TestingMode] Found ${characterActors.length} party members`);
  }

  // Filter to only character types (exclude familiars, etc.)
  characterActors = characterActors.filter((a: any) => a.type === 'character');

  const characters: TestingModeCharacter[] = characterActors.map((actor: any) => ({
    actorId: actor.id,
    characterName: actor.name,
    level: actor.system?.details?.level?.value || 1,
    actor: actor
  }));

  console.log(`🧪 [TestingMode] Initialized ${characters.length} characters:`, characters.map(c => c.characterName));

  testingModeCharacters.set(characters);
  selectedCharacterIndex.set(0);
  actedCharacterIds.set(new Set());
}
