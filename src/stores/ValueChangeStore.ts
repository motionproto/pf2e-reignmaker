/**
 * ValueChangeStore - Tracks resource value changes and emits animation events
 * 
 * Responsibilities:
 * - Monitor resource value changes
 * - Filter out manual edits (user typing)
 * - Emit animation events for programmatic changes (modifiers, phases)
 */

import { writable, derived, get } from 'svelte/store';
import { resources } from './KingdomStore';
import { activeEditingCard } from './EditingStore';

export interface AnimationEvent {
  id: string; // Unique ID for this animation
  resource: string;
  delta: number;
  timestamp: number;
}

// Store for active animations
export const activeAnimations = writable<AnimationEvent[]>([]);

// Previous values for comparison
let previousValues: Record<string, number> = {};
let isInitialized = false;
let initializationComplete = false;

// Allow time for kingdom data to fully load before tracking changes
setTimeout(() => {
  initializationComplete = true;
  console.log('🎬 [ValueChangeStore] Initialization window complete, now tracking changes');
}, 1000);

// Initialize previous values
resources.subscribe($resources => {
  if (!isInitialized) {
    // First run - just capture current state, don't trigger animations
    previousValues = { ...$resources };
    isInitialized = true;
    console.log('🎬 [ValueChangeStore] Initialized with current values (no animations triggered)');
    return;
  }
  
  // Don't trigger animations during initialization window
  if (!initializationComplete) {
    console.log('🎬 [ValueChangeStore] Still in initialization window, updating values without animations');
    previousValues = { ...$resources };
    return;
  }
  
  // Now we're fully initialized and can detect real changes
  {
    // Check for changes
    const currentEditingCard = get(activeEditingCard);
    
    // Don't trigger animations if user is editing
    if (currentEditingCard !== null) {
      previousValues = { ...$resources };
      return;
    }
    
    // Detect changes and emit animation events
    const events: AnimationEvent[] = [];
    
    for (const resource in $resources) {
      const currentValue = $resources[resource] || 0;
      const previousValue = previousValues[resource] || 0;
      
      if (currentValue !== previousValue) {
        const delta = currentValue - previousValue;
        
        console.log(`🎬 [ValueChangeStore] Detected change: ${resource} ${previousValue} → ${currentValue} (Δ${delta})`);
        
        events.push({
          id: `anim-${resource}-${Date.now()}-${Math.random()}`,
          resource,
          delta,
          timestamp: Date.now()
        });
      }
    }
    
    // Add new animation events
    if (events.length > 0) {
      console.log(`🎬 [ValueChangeStore] Emitting ${events.length} animation events:`, events);
      activeAnimations.update(current => [...current, ...events]);
    }
    
    // Update previous values
    previousValues = { ...$resources };
  }
});

/**
 * Remove an animation from the active list
 */
export function removeAnimation(animationId: string): void {
  activeAnimations.update(current => 
    current.filter(anim => anim.id !== animationId)
  );
}

/**
 * Clear all animations
 */
export function clearAllAnimations(): void {
  activeAnimations.set([]);
}
