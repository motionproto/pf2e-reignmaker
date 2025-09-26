/**
 * Kingdom Modifier System
 * Handles persistent conditions that affect the kingdom over time
 */

/**
 * Types of modifier sources
 */
export type ModifierSourceType = 'event' | 'structure' | 'diplomatic' | 'trade' | 'temporary' | 'spell' | 'army';

/**
 * Duration types for modifiers
 */
export type ModifierDuration = number | 'permanent' | 'until-resolved' | 'until-cancelled';

/**
 * Severity levels for modifiers
 */
export type ModifierSeverity = 'beneficial' | 'neutral' | 'dangerous' | 'critical';

/**
 * Types of rolls that can be modified
 */
export type ModifierRollType = 'all' | 'action' | 'event' | 'incident' | string[];

/**
 * Roll modifier configuration
 */
export interface RollModifier {
  type: ModifierRollType;          // What types of rolls this affects
  value: number;                    // Modifier value
  circumstance?: string;            // Description of the circumstance
  skills?: string[];               // Specific skills affected (if type is string[])
}

/**
 * Effects that a modifier can apply to the kingdom
 */
export interface ModifierEffects {
  // Resource modifiers (per turn)
  gold?: number;
  food?: number;
  lumber?: number;
  stone?: number;
  ore?: number;
  luxuries?: number;
  resources?: number;              // Generic resource loss/gain
  
  // Kingdom stat modifiers (per turn)
  unrest?: number;                 // Per turn unrest change
  fame?: number;                   // Per turn fame change
  infamy?: number;                 // Per turn infamy change
  
  // Army and military effects
  armyMorale?: number;            // Modifier to army morale checks
  armyCapacity?: number;          // Modifier to army support capacity
  
  // Roll modifiers
  rollModifiers?: RollModifier[];
  
  // Special effect codes
  special?: string[];             // Array of special effect codes for unique mechanics
}

/**
 * Resolution information for resolvable modifiers
 */
export interface ModifierResolution {
  skills: string[];                // Skills that can resolve this
  dc?: number;                     // Override DC if different from standard
  automatic?: {                    // Automatic resolution conditions
    condition: string;             // e.g., "action:hire_adventurers", "build:temple"
    description: string;           // User-friendly description
  };
  onResolution?: {                // What happens when resolved
    successMsg?: string;          // Message on successful resolution
    failureMsg?: string;          // Message on failed resolution
    removeOnSuccess?: boolean;    // Whether to remove modifier on success (default: true)
    removeOnFailure?: boolean;    // Whether to remove modifier on failure (default: false)
  };
}

/**
 * Main Kingdom Modifier interface
 */
export interface KingdomModifier {
  // Core identification
  id: string;                     // Unique identifier
  name: string;                    // Display name (localization key)
  description: string;             // Description for UI (localization key)
  
  // Source tracking
  source: {
    type: ModifierSourceType;
    id: string;                   // ID of the source (event ID, structure ID, etc.)
    name?: string;                // Optional display name of source
  };
  
  // Timing and duration
  startTurn: number;              // Turn when modifier was applied
  duration: ModifierDuration;
  endTurn?: number;              // Calculated end turn (if duration is numeric)
  priority: number;              // Order of application (higher = later)
  
  // Effects on the kingdom
  effects: ModifierEffects;
  
  // Resolution information (for resolvable modifiers)
  resolution?: ModifierResolution;
  
  // Display information
  visible: boolean;              // Whether to show in UI
  severity: ModifierSeverity;
  icon?: string;                 // Icon class for UI
  category?: string;             // Category for grouping in UI
  
  // Escalation (for worsening conditions)
  escalation?: {
    turnsUntilEscalation: number;
    escalatedModifier: Partial<KingdomModifier>;
    hasEscalated?: boolean;
  };
}

/**
 * Result of attempting to resolve a modifier
 */
export interface ResolutionResult {
  success: boolean;
  modifier: KingdomModifier;
  message: string;
  removed: boolean;
  newModifier?: KingdomModifier;  // If the modifier transforms instead of being removed
}

/**
 * Summary of all modifier effects
 */
export interface ModifierSummary {
  totalEffects: ModifierEffects;
  activeModifiers: KingdomModifier[];
  expiredModifiers: KingdomModifier[];
  resolvableModifiers: KingdomModifier[];
}

/**
 * Helper functions for working with modifiers
 */
export class ModifierUtils {
  /**
   * Check if a modifier has expired
   */
  static hasExpired(modifier: KingdomModifier, currentTurn: number): boolean {
    if (typeof modifier.duration === 'number') {
      const endTurn = modifier.startTurn + modifier.duration;
      return currentTurn > endTurn;
    }
    return false;
  }
  
  /**
   * Check if a modifier needs escalation
   */
  static needsEscalation(modifier: KingdomModifier, currentTurn: number): boolean {
    if (!modifier.escalation || modifier.escalation.hasEscalated) {
      return false;
    }
    const turnsActive = currentTurn - modifier.startTurn;
    return turnsActive >= modifier.escalation.turnsUntilEscalation;
  }
  
  /**
   * Create an escalated version of a modifier
   */
  static createEscalatedModifier(modifier: KingdomModifier): KingdomModifier {
    if (!modifier.escalation) {
      return modifier;
    }
    
    return {
      ...modifier,
      ...modifier.escalation.escalatedModifier,
      id: `${modifier.id}-escalated`,
      escalation: {
        ...modifier.escalation,
        hasEscalated: true
      }
    };
  }
  
  /**
   * Combine effects from multiple modifiers
   */
  static combineEffects(modifiers: KingdomModifier[]): ModifierEffects {
    const combined: ModifierEffects = {
      rollModifiers: []
    };
    
    for (const modifier of modifiers) {
      const effects = modifier.effects;
      
      // Combine resource effects
      if (effects.gold) combined.gold = (combined.gold || 0) + effects.gold;
      if (effects.food) combined.food = (combined.food || 0) + effects.food;
      if (effects.lumber) combined.lumber = (combined.lumber || 0) + effects.lumber;
      if (effects.stone) combined.stone = (combined.stone || 0) + effects.stone;
      if (effects.ore) combined.ore = (combined.ore || 0) + effects.ore;
      if (effects.luxuries) combined.luxuries = (combined.luxuries || 0) + effects.luxuries;
      if (effects.resources) combined.resources = (combined.resources || 0) + effects.resources;
      
      // Combine kingdom stat effects
      if (effects.unrest) combined.unrest = (combined.unrest || 0) + effects.unrest;
      if (effects.fame) combined.fame = (combined.fame || 0) + effects.fame;
      if (effects.infamy) combined.infamy = (combined.infamy || 0) + effects.infamy;
      
      // Combine army effects
      if (effects.armyMorale) combined.armyMorale = (combined.armyMorale || 0) + effects.armyMorale;
      if (effects.armyCapacity) combined.armyCapacity = (combined.armyCapacity || 0) + effects.armyCapacity;
      
      // Collect roll modifiers
      if (effects.rollModifiers) {
        combined.rollModifiers!.push(...effects.rollModifiers);
      }
      
      // Collect special effects
      if (effects.special) {
        combined.special = combined.special || [];
        combined.special.push(...effects.special);
      }
    }
    
    return combined;
  }
  
  /**
   * Get roll modifier for a specific check type and skill
   */
  static getRollModifier(
    modifiers: KingdomModifier[], 
    checkType: 'action' | 'event' | 'incident',
    skill?: string
  ): number {
    let total = 0;
    
    for (const modifier of modifiers) {
      if (!modifier.effects.rollModifiers) continue;
      
      for (const rollMod of modifier.effects.rollModifiers) {
        // Check if this modifier applies to this check type
        if (rollMod.type === 'all') {
          total += rollMod.value;
        } else if (rollMod.type === checkType) {
          total += rollMod.value;
        } else if (Array.isArray(rollMod.type) && skill && rollMod.type.includes(skill)) {
          total += rollMod.value;
        }
      }
    }
    
    return total;
  }
  
  /**
   * Create a modifier from an unresolved event
   */
  static createFromUnresolvedEvent(event: any, currentTurn: number): KingdomModifier {
    const ifUnresolved = event.ifUnresolved;
    
    if (!ifUnresolved || ifUnresolved.type !== 'continuous') {
      throw new Error(`Event ${event.id} cannot become a modifier`);
    }
    
    const template = ifUnresolved.continuous.modifierTemplate;
    
    return {
      id: `event-${event.id}-unresolved`,
      name: template.name || event.name,
      description: template.description || event.description,
      source: {
        type: 'event',
        id: event.id,
        name: event.name
      },
      startTurn: currentTurn,
      duration: template.duration || 'until-resolved',
      priority: template.priority || 100,
      effects: template.effects || {},
      resolution: template.resolution,
      visible: true,
      severity: template.severity || 'dangerous',
      icon: template.icon,
      escalation: ifUnresolved.continuous.escalation
    };
  }
}
