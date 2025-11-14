/**
 * Shared dialog utilities for game commands
 */

/**
 * Show selection dialog (Foundry VTT Dialog)
 * 
 * @param title - Dialog title
 * @param items - Items to choose from
 * @param fieldName - Form field name (default: 'selection')
 * @returns Selected item ID or null if cancelled
 */
export async function showSelectionDialog<T = any>(
  title: string,
  items: Array<{ id: string; label: string; data?: T }>,
  fieldName: string = 'selection'
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    
    const content = `
      <form>
        <div class="form-group">
          <label>Select an option:</label>
          <select name="${fieldName}" style="width: 100%; padding: 5px;">
            ${items.map(item => `<option value="${item.id}">${item.label}</option>`).join('')}
          </select>
        </div>
      </form>
    `;
    
    new Dialog({
      title,
      content,
      buttons: {
        ok: {
          label: 'Select',
          callback: (html: any) => {
            const selectedId = html.find(`[name="${fieldName}"]`).val();
            resolve(selectedId);
          }
        },
        cancel: {
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'ok'
    }).render(true);
  });
}

/**
 * Show simple confirmation dialog
 * 
 * @param title - Dialog title
 * @param content - Dialog content (HTML)
 * @returns True if confirmed, false if cancelled
 */
export async function showConfirmDialog(
  title: string,
  content: string
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    
    new Dialog({
      title,
      content,
      buttons: {
        yes: {
          label: 'Yes',
          callback: () => resolve(true)
        },
        no: {
          label: 'No',
          callback: () => resolve(false)
        }
      },
      default: 'no'
    }).render(true);
  });
}
