import { writable } from 'svelte/store';

// Store to track which card is currently being edited (only one at a time)
export const activeEditingCard = writable<string | null>(null);

export function setActiveEditingCard(cardId: string | null) {
   activeEditingCard.set(cardId);
}

export function clearActiveEditingCard() {
   activeEditingCard.set(null);
}
