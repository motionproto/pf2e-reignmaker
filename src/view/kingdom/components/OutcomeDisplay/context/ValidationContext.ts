/**
 * Validation Context - Centralized validation state for OutcomeDisplay
 * 
 * This context allows sub-components to register their validation requirements
 * instead of OutcomeDisplay manually tracking each type.
 * 
 * Usage in sub-components:
 * ```typescript
 * import { getValidationContext } from '../context/ValidationContext';
 * 
 * const validationContext = getValidationContext();
 * 
 * onMount(() => {
 *   validationContext.register('my-component', {
 *     id: 'my-component',
 *     needsResolution: true,
 *     isResolved: false
 *   });
 * });
 * 
 * $: if (validationContext) {
 *   validationContext.update('my-component', {
 *     isResolved: userHasMadeSelection
 *   });
 * }
 * 
 * onDestroy(() => {
 *   validationContext.unregister('my-component');
 * });
 * ```
 */

import { writable, derived, type Writable } from 'svelte/store';
import { setContext, getContext } from 'svelte';

export interface ValidationProvider {
  id: string;
  needsResolution: boolean;  // Does this component require user input?
  isResolved: boolean;       // Has the user provided the required input?
}

export interface ValidationContext {
  register: (id: string, provider: ValidationProvider) => void;
  unregister: (id: string) => void;
  update: (id: string, updates: Partial<ValidationProvider>) => void;
  subscribe: Writable<Map<string, ValidationProvider>>['subscribe'];
  getUnresolvedProviders: () => ValidationProvider[];
}

const CONTEXT_KEY = 'outcome-validation';

/**
 * Create a new validation context
 */
export function createValidationContext(): ValidationContext {
  const providers = writable<Map<string, ValidationProvider>>(new Map());
  
  return {
    register: (id: string, provider: ValidationProvider) => {
      providers.update(map => {
        map.set(id, provider);
        return map;
      });
    },
    
    unregister: (id: string) => {
      providers.update(map => {
        map.delete(id);
        return map;
      });
    },
    
    update: (id: string, updates: Partial<ValidationProvider>) => {
      providers.update(map => {
        const existing = map.get(id);
        if (existing) {
          map.set(id, { ...existing, ...updates });
        }
        return map;
      });
    },
    
    subscribe: providers.subscribe,
    
    getUnresolvedProviders: () => {
      let result: ValidationProvider[] = [];
      providers.subscribe(map => {
        result = Array.from(map.values()).filter(
          p => p.needsResolution && !p.isResolved
        );
      })();
      return result;
    }
  };
}

/**
 * Set validation context (called by OutcomeDisplay)
 */
export function setValidationContext(): ValidationContext {
  const context = createValidationContext();
  setContext(CONTEXT_KEY, context);
  return context;
}

/**
 * Get validation context (called by sub-components)
 */
export function getValidationContext(): ValidationContext | null {
  try {
    return getContext<ValidationContext>(CONTEXT_KEY);
  } catch {
    // Context not available (component not inside OutcomeDisplay)
    return null;
  }
}

/**
 * Create a derived store that tracks all unresolved providers
 * 
 * Note: This is a helper function, but OutcomeDisplay can also just use
 * a reactive statement directly with the context subscription.
 */
export function createUnresolvedProvidersStore(providers: Writable<Map<string, ValidationProvider>>) {
  return derived<Writable<Map<string, ValidationProvider>>, ValidationProvider[]>(
    providers,
    ($providers: Map<string, ValidationProvider>) => Array.from($providers.values()).filter(
      (p: ValidationProvider) => p.needsResolution && !p.isResolved
    )
  );
}
