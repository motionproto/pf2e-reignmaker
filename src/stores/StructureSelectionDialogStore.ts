/**
 * Store for structure selection dialog state
 * Used during critical success settlement creation to choose a free structure
 */

import { writable } from 'svelte/store';

interface DialogState {
  show: boolean;
  resolve: ((structureId: string | null) => void) | null;
}

function createStructureSelectionDialogStore() {
  const { subscribe, set, update } = writable<DialogState>({
    show: false,
    resolve: null
  });

  return {
    subscribe,
    
    /**
     * Open dialog and wait for user input
     * Returns a promise that resolves with the structure ID or null if canceled
     */
    prompt(): Promise<string | null> {
      return new Promise((resolve) => {
        set({
          show: true,
          resolve
        });
      });
    },
    
    /**
     * Confirm with structure ID
     */
    confirm(structureId: string | null) {
      update(state => {
        if (state.resolve) {
          state.resolve(structureId);
        }
        return {
          show: false,
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
          resolve: null
        };
      });
    }
  };
}

export const structureSelectionDialog = createStructureSelectionDialogStore();
