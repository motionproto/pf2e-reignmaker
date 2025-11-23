/**
 * InteractionDialogs - Dialog services for check interactions
 *
 * Provides promise-based dialogs for user interactions during check resolution.
 * Used by UnifiedCheckHandler for pre-roll and post-roll interactions.
 */

import { get } from 'svelte/store';
import { kingdomData } from '../stores/KingdomStore';

/**
 * Show entity selection dialog
 *
 * @param entityType - Type of entity to select (settlement, army, faction)
 * @param label - Dialog label
 * @param filter - Optional filter function
 * @param kingdom - Kingdom data to pass to filter
 * @returns Selected entity ID or null if cancelled
 */
export async function showEntitySelectionDialog(
  entityType: 'settlement' | 'army' | 'faction',
  label?: string,
  filter?: (entity: any, kingdom?: any) => boolean | { eligible: boolean; reason?: string },
  kingdomParam?: any,
  getSupplementaryInfo?: ((entity: any) => string) | null
): Promise<string | null> {
  const kingdom = kingdomParam || get(kingdomData);
  if (!kingdom) {
    console.error('[InteractionDialogs] No kingdom data available');
    return null;
  }

  // Get entities based on type
  let entities: any[] = [];
  let entityLabel: string = entityType;

  switch (entityType) {
    case 'settlement':
      entities = kingdom.settlements || [];
      entityLabel = 'Settlement';
      break;
    case 'army':
      entities = kingdom.armies || [];
      entityLabel = 'Army';
      break;
    case 'faction':
      // ✅ FIX: Factions are managed by factionService, not stored in kingdom
      const { factionService } = await import('./factions/index');
      entities = factionService.getAllFactions();
      entityLabel = 'Faction';
      break;
    default:
      console.error(`[InteractionDialogs] Unknown entity type: ${entityType}`);
      return null;
  }

  // Apply filter if provided
  // For factions: Only pre-filter for basic qualification (attitude check)
  // The dialog component will handle showing unavailable factions as grayed out
  if (filter && entityType !== 'faction') {
    entities = entities.filter(e => {
      const result = filter(e, kingdom);
      // Handle both boolean and object returns
      if (typeof result === 'boolean') return result;
      return result.eligible;
    });
  } else if (filter && entityType === 'faction') {
    // For factions: Only filter for basic qualification (Friendly/Helpful attitude)
    // Don't filter out factions that have already provided aid - let dialog show them as grayed
    entities = entities.filter(e => {
      const result = filter(e, kingdom);
      // Handle both boolean and object returns
      const eligible = typeof result === 'boolean' ? result : result.eligible;
      const reason = typeof result === 'object' ? result.reason : undefined;
      
      // Only filter out if the faction doesn't meet attitude requirement
      // Check if the reason is about attitude (basic qualification)
      if (!eligible && reason && reason.includes('Friendly')) {
        return false;
      }
      
      // Keep all other factions (even if already provided aid) - dialog will gray them out
      return true;
    });
  }

  if (entities.length === 0) {
    const game = (globalThis as any).game;
    if (game?.ui?.notifications) {
      game.ui.notifications.warn(`No ${entityLabel.toLowerCase()}s available`);
    }
    return null;
  }

  // Use FactionPickerDialog for faction selection (supports rich display)
  if (entityType === 'faction') {
    const FactionPickerDialog = await import('../ui/dialogs/FactionPickerDialog.svelte');

    return new Promise((resolve) => {
      // Create container element
      const container = document.createElement('div');
      container.id = 'faction-picker-dialog-container';
      document.body.appendChild(container);

      // Create Svelte component instance
      const dialog = new FactionPickerDialog.default({
        target: container,
        props: {
          show: true,
          title: label || `Select ${entityLabel}`,
          eligibleFactions: entities,
          allowMultiple: false,
          count: 1,
          filter,
          kingdom
        }
      });

      // Listen for confirm event
      dialog.$on('confirm', (event: any) => {
        const selectedFactionIds = event.detail.factionIds;
        const selectedId = selectedFactionIds[0] || null;
        
        // Cleanup
        dialog.$destroy();
        container.remove();
        
        resolve(selectedId);
      });

      // Listen for cancel event
      dialog.$on('cancel', () => {
        // Cleanup
        dialog.$destroy();
        container.remove();
        
        resolve(null);
      });
    });
  }

  // Use SettlementSelectionDialog for settlement selection
  if (entityType === 'settlement') {
    const SettlementSelectionDialog = await import('../view/kingdom/components/dialogs/SettlementSelectionDialog.svelte');

    return new Promise((resolve) => {
      // Create container element
      const container = document.createElement('div');
      container.id = 'settlement-selection-dialog-container';
      document.body.appendChild(container);

      // Create Svelte component instance
      const dialog = new SettlementSelectionDialog.default({
        target: container,
        props: {
          show: true,
          title: label || `Select ${entityLabel}`,
          filter,
          getSupplementaryInfo,
          kingdom
        }
      });

      // Listen for confirm event
      dialog.$on('confirm', (event: any) => {
        const selectedId = event.detail.settlementId;
        
        // Cleanup
        dialog.$destroy();
        container.remove();
        
        resolve(selectedId || null);
      });

      // Listen for cancel event
      dialog.$on('cancel', () => {
        // Cleanup
        dialog.$destroy();
        container.remove();
        
        resolve(null);
      });
    });
  }

  // Use simple Foundry dialog for armies (can be upgraded later)
  const options = entities
    .map(e => `<option value="${e.id}">${e.name}</option>`)
    .join('');

  const content = `
    <div class="form-group">
      <label>${label || `Select ${entityLabel}`}</label>
      <select id="entity-select" style="width: 100%">
        <option value="">-- Select ${entityLabel} --</option>
        ${options}
      </select>
    </div>
  `;

  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    new Dialog({
      title: label || `Select ${entityLabel}`,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Confirm',
          callback: (html: any) => {
            const select = html.find('#entity-select')[0] as HTMLSelectElement;
            const selectedId = select.value;
            resolve(selectedId || null);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'confirm',
      close: () => resolve(null)
    }).render(true);
  });
}

/**
 * Show text input dialog
 *
 * @param label - Input label
 * @param defaultValue - Default value
 * @returns Input text or null if cancelled
 */
export async function showTextInputDialog(
  label: string,
  defaultValue: string = ''
): Promise<string | null> {
  const content = `
    <div class="form-group">
      <label>${label}</label>
      <input type="text" id="text-input" value="${defaultValue}" style="width: 100%" />
    </div>
  `;

  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    new Dialog({
      title: label,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Confirm',
          callback: (html: any) => {
            const input = html.find('#text-input')[0] as HTMLInputElement;
            resolve(input.value || null);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'confirm',
      close: () => resolve(null)
    }).render(true);
  });
}

/**
 * Show choice dialog
 *
 * @param label - Dialog label
 * @param options - Array of choice options
 * @returns Selected option or null if cancelled
 */
export async function showChoiceDialog(
  label: string,
  options: string[]
): Promise<string | null> {
  const optionsHtml = options
    .map(opt => `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`)
    .join('');

  const content = `
    <div class="form-group">
      <label>${label}</label>
      <select id="choice-select" style="width: 100%">
        <option value="">-- Select Option --</option>
        ${optionsHtml}
      </select>
    </div>
  `;

  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    new Dialog({
      title: label,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Confirm',
          callback: (html: any) => {
            const select = html.find('#choice-select')[0] as HTMLSelectElement;
            const selectedValue = select.value;
            resolve(selectedValue || null);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'confirm',
      close: () => resolve(null)
    }).render(true);
  });
}

/**
 * Show confirmation dialog
 *
 * @param message - Confirmation message
 * @returns True if confirmed, false if cancelled
 */
export async function showConfirmationDialog(
  message: string
): Promise<boolean> {
  const content = `<p>${message}</p>`;

  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    new Dialog({
      title: 'Confirm',
      content,
      buttons: {
        yes: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Yes',
          callback: () => resolve(true)
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: 'No',
          callback: () => resolve(false)
        }
      },
      default: 'yes',
      close: () => resolve(false)
    }).render(true);
  });
}

/**
 * Show custom configuration dialog
 *
 * Mounts a Svelte component and waits for user to submit data
 *
 * @param component - Svelte component constructor
 * @param props - Props to pass to component
 * @returns Component data or null if cancelled
 */
export async function showConfigurationDialog(
  component: any,
  props: any
): Promise<any> {
  return new Promise((resolve) => {
    // Create container element
    const container = document.createElement('div');
    container.id = 'configuration-dialog-container';
    document.body.appendChild(container);

    let selectedData: any = null;
    let resolved = false;

    // Create Svelte component instance
    const instance = new component({
      target: container,
      props
    });

    // Cleanup function
    function cleanup() {
      if (!resolved) {
        resolved = true;
        instance.$destroy();
        container.remove();
      }
    }

    // Listen for 'confirm' event (full dialog components like RecruitArmyDialog)
    instance.$on('confirm', (event: any) => {
      console.log('[ConfigurationDialog] Confirm received:', event.detail);
      selectedData = event.detail;
      cleanup();
      resolve(selectedData);
    });

    // Listen for 'cancel' event (full dialog components)
    instance.$on('cancel', () => {
      console.log('[ConfigurationDialog] Cancel received');
      cleanup();
      resolve(null);
    });

    // Listen for 'selection' event (inline components like ResourceChoiceSelector)
    instance.$on('selection', (event: any) => {
      selectedData = event.detail;
      console.log('[ConfigurationDialog] Selection received:', selectedData);
      // Note: For inline components, we don't cleanup here - parent handles it
    });
  });
}
