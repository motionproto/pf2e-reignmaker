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
      const { factionService } = await import('./factions');
      entities = factionService.getAllFactions();
      entityLabel = 'Faction';
      break;
    default:
      console.error(`[InteractionDialogs] Unknown entity type: ${entityType}`);
      return null;
  }

  // Apply filter if provided
  if (filter) {
    entities = entities.filter(e => {
      const result = filter(e, kingdom);
      // Handle both boolean and object returns
      if (typeof result === 'boolean') return result;
      return result.eligible;
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
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '10000';
    container.style.maxWidth = '600px';
    container.style.width = '90%';
    document.body.appendChild(container);

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    backdrop.style.zIndex = '9999';
    document.body.appendChild(backdrop);

    let selectedData: any = null;

    // Create Svelte component instance
    const instance = new component({
      target: container,
      props
    });

    // Listen for selection event
    instance.$on('selection', (event: any) => {
      selectedData = event.detail;
      console.log('[ConfigurationDialog] Selection received:', selectedData);
    });

    // Add confirm button below component
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '16px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'flex-end';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm';
    confirmButton.className = 'dialog-button dialog-button-yes';
    confirmButton.style.padding = '8px 16px';
    confirmButton.style.cursor = 'pointer';
    confirmButton.onclick = () => {
      cleanup();
      resolve(selectedData);
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'dialog-button dialog-button-no';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.onclick = () => {
      cleanup();
      resolve(null);
    };

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    container.appendChild(buttonContainer);

    // Cleanup function
    function cleanup() {
      instance.$destroy();
      container.remove();
      backdrop.remove();
    }

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Handle backdrop click
    backdrop.onclick = () => {
      cleanup();
      resolve(null);
      document.removeEventListener('keydown', handleEscape);
    };
  });
}
