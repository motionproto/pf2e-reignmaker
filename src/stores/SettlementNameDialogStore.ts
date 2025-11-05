/**
 * Store for settlement name dialog state
 * Used by map editor to prompt for settlement names
 */

import { writable } from 'svelte/store';

interface DialogState {
  show: boolean;
  hexId: string | null;
  resolve: ((name: string | null) => void) | null;
}

function createSettlementNameDialogStore() {
  const { subscribe, set, update } = writable<DialogState>({
    show: false,
    hexId: null,
    resolve: null
  });

  return {
    subscribe,
    
    /**
     * Open dialog and wait for user input
     * Returns a promise that resolves with the settlement name or null if canceled
     */
    prompt(hexId: string): Promise<string | null> {
      return new Promise((resolve) => {
        set({
          show: true,
          hexId,
          resolve
        });
      });
    },
    
    /**
     * Confirm with settlement name
     */
    confirm(name: string) {
      update(state => {
        if (state.resolve) {
          state.resolve(name);
        }
        return {
          show: false,
          hexId: null,
          resolve: null
        };
      });
    },
    
    /**
     * Cancel dialog
     */
    cancel() {
      update(state => {
        if (state.resolve) {
          state.resolve(null);
        }
        return {
          show: false,
          hexId: null,
          resolve: null
        };
      });
    }
  };
}

export const settlementNameDialog = createSettlementNameDialogStore();
