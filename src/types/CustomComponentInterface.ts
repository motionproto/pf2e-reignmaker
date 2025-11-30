/**
 * Standard Interface for Custom Components in postRollInteractions
 * 
 * This interface defines the contract that all custom components must follow
 * when used in action pipelines for inline user interaction.
 * 
 * PHILOSOPHY:
 * - Components are self-contained and encapsulated
 * - Components manage their own validation state
 * - Components emit standardized resolution events
 * - OutcomeDisplay only needs to listen for one event type
 * 
 * USAGE:
 * 1. Component registers with ValidationContext on mount
 * 2. Component updates validation state when user interacts
 * 3. Component emits 'resolution' event with standardized data
 * 4. OutcomeDisplay receives event and enables "Apply Result" button
 */

import type { OutcomePreview } from '../models/OutcomePreview';
import type { EventModifier } from './events';

/**
 * Required props that ALL custom components receive
 */
export interface CustomComponentProps {
  /** Check instance for state persistence across clients */
  instance: OutcomePreview | null;
  
  /** Current outcome from skill check */
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  
  /** Additional component-specific configuration from pipeline */
  config?: Record<string, any>;
}

/**
 * Validation state that components register with ValidationContext
 */
export interface ComponentValidationState {
  /** Unique identifier for this component instance */
  id: string;
  
  /** Does this component require user input before applying? */
  needsResolution: boolean;
  
  /** Has the user completed their input? */
  isResolved: boolean;
}

/**
 * Standard resolution data emitted by custom components
 */
export interface ComponentResolutionData {
  /** Is the component ready for the result to be applied? */
  isResolved: boolean;
  
  /** Resource modifiers to apply (e.g., +2 lumber) */
  modifiers: EventModifier[];
  
  /** Additional metadata for pipeline execution */
  metadata: Record<string, any>;
}

/**
 * Event detail structure for the 'resolution' event
 */
export interface ComponentResolutionEvent extends CustomEvent {
  detail: ComponentResolutionData;
}

/**
 * Lifecycle contract for custom components
 * 
 * Components should follow this pattern:
 * 
 * ```typescript
 * export let instance: OutcomePreview | null = null;
 * export let outcome: string;
 * export let config: Record<string, any> = {};
 * 
 * const dispatch = createEventDispatcher();
 * const validationContext = getValidationContext();
 * const providerId = 'my-component';
 * 
 * // 1. Register on mount
 * onMount(() => {
 *   validationContext.register(providerId, {
 *     id: providerId,
 *     needsResolution: true,
 *     isResolved: false
 *   });
 * });
 * 
 * // 2. Update when state changes
 * $: validationContext.update(providerId, {
 *   needsResolution: true,
 *   isResolved: !!selectedValue
 * });
 * 
 * // 3. Emit resolution event
 * function handleSelection(value: any) {
 *   dispatch('resolution', {
 *     isResolved: true,
 *     modifiers: [{ type: 'static', resource: 'lumber', value: 2 }],
 *     metadata: { selectedValue: value }
 *   });
 * }
 * 
 * // 4. Unregister on destroy
 * onDestroy(() => {
 *   validationContext.unregister(providerId);
 * });
 * ```
 */
export interface CustomComponentLifecycle {
  /** Called when component mounts - register with ValidationContext */
  onMount: () => void;
  
  /** Called when user interacts - update validation state */
  onStateChange: (isResolved: boolean) => void;
  
  /** Called when selection is finalized - emit resolution event */
  onResolve: (data: ComponentResolutionData) => void;
  
  /** Called when component unmounts - unregister from ValidationContext */
  onDestroy: () => void;
}

/**
 * Helper type for components to implement
 */
export type CustomComponent = {
  instance: OutcomePreview | null;
  outcome: string;
  config?: Record<string, any>;
};

/**
 * Type guard to check if an event is a ComponentResolutionEvent
 */
export function isComponentResolutionEvent(event: any): event is ComponentResolutionEvent {
  return event?.detail && 
         typeof event.detail.isResolved === 'boolean' &&
         Array.isArray(event.detail.modifiers) &&
         typeof event.detail.metadata === 'object';
}
