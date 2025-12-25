/**
 * Testing Mode Store
 *
 * Local UI state for Testing Mode - allows developers to cycle through
 * party members when testing gameplay. This state is NOT persisted and
 * resets on page reload.
 *
 * Note: "Acted" status is derived from kingdomData.turnState.actionLog
 * (single source of truth) rather than maintained separately here.
 * See TestingModeCharacterBar.svelte for the derivation logic.
 */

import { writable, derived, get } from 'svelte/store';
import { TurnPhase } from '../actors/KingdomActor';
import { kingdomData } from './KingdomStore';

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

// Derived: Currently selected character
export const selectedCharacter = derived(
  [testingModeCharacters, selectedCharacterIndex],
  ([$chars, $idx]) => $chars[$idx] || null
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
 * Auto-advance to the next character who hasn't acted
 * Derives "acted" status from actionLog (single source of truth)
 */
export function autoAdvanceToNextAvailable(): void {
  const chars = get(testingModeCharacters);
  const currentIdx = get(selectedCharacterIndex);

  // Get acted character names from actionLog (single source of truth)
  const kingdom = get(kingdomData);
  const actionLog = kingdom?.turnState?.actionLog || [];

  const actedCharacterNames = new Set(
    actionLog
      .filter((entry: any) => entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
      .map((entry: any) => entry.characterName)
  );

  // Find next character who hasn't acted
  for (let i = 1; i <= chars.length; i++) {
    const nextIdx = (currentIdx + i) % chars.length;
    if (!actedCharacterNames.has(chars[nextIdx].characterName)) {
      console.log(`🧪 [TestingMode] Auto-advancing to ${chars[nextIdx].characterName}`);
      selectedCharacterIndex.set(nextIdx);
      return;
    }
  }
  // All have acted - stay on current
  console.log('🧪 [TestingMode] All characters have acted, staying on current');
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
}
