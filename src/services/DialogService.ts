/**
 * DialogService - Helper for mounting Svelte dialogs dynamically
 * 
 * Provides a Promise-based API for showing dialogs and waiting for user response
 */

import type { SvelteComponent, ComponentType } from 'svelte';

interface DialogMountOptions<T> {
  component: ComponentType;
  props: Record<string, any>;
  target?: HTMLElement;
}

/**
 * Mount a Svelte dialog and wait for user response
 * 
 * @param options - Dialog component and props
 * @returns Promise that resolves with user's response or null if cancelled
 */
export async function showDialog<T>(options: DialogMountOptions<T>): Promise<T | null> {
  const { component, props, target = document.body } = options;
  
  return new Promise<T | null>((resolve) => {
    // Create container
    const container = document.createElement('div');
    container.className = 'svelte-dialog-container';
    target.appendChild(container);
    
    // Mount component with show=true
    const instance = new component({
      target: container,
      props: {
        ...props,
        show: true
      }
    });
    
    // Cleanup function
    const cleanup = () => {
      instance.$destroy();
      container.remove();
    };
    
    // Listen for confirm event
    instance.$on('confirm', (event: CustomEvent<T>) => {
      cleanup();
      resolve(event.detail);
    });
    
    // Listen for cancel event
    instance.$on('cancel', () => {
      cleanup();
      resolve(null);
    });
    
    // Listen for close event (backdrop click, ESC key)
    instance.$on('close', () => {
      cleanup();
      resolve(null);
    });
  });
}
