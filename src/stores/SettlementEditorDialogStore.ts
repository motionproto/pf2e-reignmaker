/**
 * Store for settlement editor dialog state
 * Used by map editor to prompt for settlement data with full properties
 */

import { writable } from 'svelte/store';
import type { Settlement, SettlementTier } from '../models/Settlement';

interface DialogState {
  show: boolean;
  hexId: string | null;
  existingSettlement: Settlement | null;  // For editing existing settlements
  resolve: ((data: SettlementData | null) => void) | null;
}

export interface SettlementData {
  name: string;
  tier: SettlementTier;
  level: number;
  isCapital: boolean;
  connectedByRoads: boolean;
  // Note: ownedBy removed - ownership is derived from hex.claimedBy
}

function createSettlementEditorDialogStore() {
  const { subscribe, set, update } = writable<DialogState>({
    show: false,
    hexId: null,
    existingSettlement: null,
    resolve: null
  });

  return {
    subscribe,
    
    /**
     * Open dialog for new settlement and wait for user input
     * Returns a promise that resolves with settlement data or null if canceled
     */
    prompt(hexId: string): Promise<SettlementData | null> {
      return new Promise((resolve) => {
        set({
          show: true,
          hexId,
          existingSettlement: null,
          resolve
        });
      });
    },
    
    /**
     * Open dialog for editing existing settlement
     * Returns a promise that resolves with updated data or null if canceled
     */
    edit(hexId: string, settlement: Settlement): Promise<SettlementData | null> {
      return new Promise((resolve) => {
        set({
          show: true,
          hexId,
          existingSettlement: settlement,
          resolve
        });
      });
    },
    
    /**
     * Confirm with settlement data
     */
    confirm(data: SettlementData) {
      update(state => {
        if (state.resolve) {
          state.resolve(data);
        }
        return {
          show: false,
          hexId: null,
          existingSettlement: null,
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
          existingSettlement: null,
          resolve: null
        };
      });
    }
  };
}

export const settlementEditorDialog = createSettlementEditorDialogStore();
