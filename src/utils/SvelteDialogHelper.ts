/**
 * Helper utilities for programmatically mounting and showing Svelte dialogs
 */

/**
 * Mount a Svelte dialog component and wait for user interaction
 * @param Component - Svelte component class
 * @param props - Initial props for the component
 * @returns Promise that resolves with the event data when confirmed, or null if cancelled
 */
export async function showSvelteDialog<T = any>(
  Component: any,
  props: Record<string, any> = {}
): Promise<T | null> {
  return new Promise((resolve) => {
    // Create container
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Set show to true
    const componentProps = {
      ...props,
      show: true
    };

    // Mount component
    const instance = new Component({
      target: container,
      props: componentProps
    });

    // Handle events
    instance.$on('confirm', (event: CustomEvent) => {
      cleanup();
      resolve(event.detail as T);
    });

    instance.$on('cancel', () => {
      cleanup();
      resolve(null);
    });

    // Cleanup function
    function cleanup() {
      try {
        instance.$destroy();
        document.body.removeChild(container);
      } catch (error) {
        console.warn('Failed to cleanup dialog:', error);
      }
    }
  });
}
