/**
 * Utility for mounting Svelte dialog components dynamically
 * Used for dialogs that need to be shown from hooks or other non-Svelte contexts
 */

type SvelteComponent = any;

/**
 * Mount a Svelte dialog component and return a promise that resolves when confirmed/canceled
 */
export async function mountSvelteDialog<T = void>(
  ComponentClass: any,
  props: Record<string, any> = {}
): Promise<{ confirmed: boolean; data?: T }> {
  return new Promise((resolve) => {
    // Create a container for the dialog
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '1000';
    container.style.pointerEvents = 'none';
    
    // Make dialog children interactive
    container.style.setProperty('pointer-events', 'none', 'important');
    
    document.body.appendChild(container);
    
    // Mount the Svelte component
    const component = new ComponentClass({
      target: container,
      props: {
        ...props,
        show: true,
      },
    });
    
    // Re-enable pointer events for the actual dialog content
    setTimeout(() => {
      const dialogElements = container.querySelectorAll('.dialog-backdrop, .dialog');
      dialogElements.forEach(el => {
        (el as HTMLElement).style.pointerEvents = 'auto';
      });
    }, 0);
    
    // Set up event handlers
    const cleanup = () => {
      component.$destroy();
      document.body.removeChild(container);
    };
    
    component.$on('confirm', () => {
      cleanup();
      resolve({ confirmed: true });
    });
    
    component.$on('cancel', () => {
      cleanup();
      resolve({ confirmed: false });
    });
    
    component.$on('close', () => {
      cleanup();
      resolve({ confirmed: false });
    });
  });
}
