# Event & Modifier System Implementation Plan

## Overview

This document outlines the implementation of an unresolved event system and a comprehensive modifier framework for the Reignmaker kingdom management system. The system will handle persistent conditions from unresolved events, trade agreements, diplomatic effects, and other ongoing kingdom conditions.

## Phase 1: Core Modifier System Architecture

### 1.1 Modifier Interface Definition

```typescript
// src/models/Modifiers.ts

export interface KingdomModifier {
  id: string;                    // Unique identifier
  name: string;                   // Display name
  description: string;            // Description for UI
  source: {
    type: 'event' | 'structure' | 'diplomatic' | 'trade' | 'temporary';
    id: string;                  // ID of the source (event ID, structure ID, etc.)
    name?: string;                // Optional display name of source
  };
  startTurn: number;              // Turn when modifier was applied
  duration: number | 'permanent' | 'until-resolved';
  priority: number;               // Order of application (higher = later)
  
  // Effects on kingdom properties
  effects: {
    // Resource modifiers (per turn)
    gold?: number;
    food?: number;
    lumber?: number;
    stone?: number;
    ore?: number;
    luxuries?: number;
    
    // Kingdom stat modifiers
    unrest?: number;              // Per turn unrest change
    fame?: number;                // Per turn fame change
    
    // Roll modifiers
    rollModifiers?: {
      type: 'all' | 'action' | 'event' | 'incident' | string[];  // Specific skills
      value: number;
      circumstance?: string;      // Description of the circumstance
    }[];
    
    // Special effects
    special?: string[];           // Array of special effect codes
  };
  
  // Resolution information (for resolvable modifiers)
  resolution?: {
    skills: string[];             // Skills that can resolve this
    dc?: number;                  // Override DC if different from standard
    automatic?: {                 // Automatic resolution conditions
      condition: string;          // e.g., "build_structure:temple"
      description: string;        // User-friendly description
    };
  };
  
  // Display information
  visible: boolean;               // Whether to show in UI
  severity: 'beneficial' | 'neutral' | 'dangerous' | 'critical';
  icon?: string;                  // Icon class for UI
}
```

### 1.2 Modifier Manager Service

```typescript
// src/services/ModifierService.ts

export class ModifierService {
  private modifiers: KingdomModifier[] = [];
  
  // Add a new modifier
  addModifier(modifier: KingdomModifier): void
  
  // Remove a modifier by ID
  removeModifier(id: string): boolean
  
  // Get all active modifiers
  getActiveModifiers(): KingdomModifier[]
  
  // Process modifiers at turn start
  processTurnStart(currentTurn: number): ModifierEffects
  
  // Check for expired modifiers
  checkExpiredModifiers(currentTurn: number): KingdomModifier[]
  
  // Get modifiers from a specific source
  getModifiersBySource(sourceType: string, sourceId?: string): KingdomModifier[]
  
  // Calculate total effects from all modifiers
  calculateTotalEffects(): ModifierEffects
  
  // Attempt to resolve a modifier
  resolveModifier(modifierId: string, skill: string, rollResult: number): ResolutionResult
}
```

## Phase 2: Event System Updates

### 2.1 Event Interface Updates

```typescript
// Addition to existing KingdomEvent interface

export interface EventUnresolvedBehavior {
  type: 'continuous' | 'autoResolve' | 'expires' | 'transforms';
  
  // For continuous events
  continuous?: {
    becomesModifier: true;
    modifierTemplate: Partial<KingdomModifier>;
    escalation?: {
      turnsUntilEscalation: number;
      escalatedModifier: Partial<KingdomModifier>;
    };
  };
  
  // For auto-resolving events
  autoResolve?: {
    outcome: 'failure' | 'criticalFailure';
    message: string;
  };
  
  // For expiring events
  expires?: {
    message: string;
    effects?: Partial<ModifierEffects>;
  };
  
  // For transforming events
  transforms?: {
    newEventId: string;
    message: string;
  };
}
```

### 2.2 Event JSON Structure

Each event JSON file needs an `ifUnresolved` field:

```json
{
  "id": "bandit-activity",
  "name": "Bandit Activity",
  // ... existing fields ...
  "ifUnresolved": {
    "type": "continuous",
    "continuous": {
      "becomesModifier": true,
      "modifierTemplate": {
        "name": "Ongoing Bandit Raids",
        "description": "Bandits continue to raid your territory",
        "duration": "until-resolved",
        "severity": "dangerous",
        "effects": {
          "gold": -1,
          "food": -1,
          "unrest": 1
        },
        "resolution": {
          "skills": ["intimidation", "diplomacy", "stealth"],
          "automatic": {
            "condition": "hire_adventurers",
            "description": "Hire adventurers to deal with the bandits"
          }
        }
      }
    }
  }
}
```

## Phase 3: Implementation Steps

### Step 1: Create Modifier System (Priority: High)
- [ ] Create `src/models/Modifiers.ts` with interfaces
- [ ] Create `src/services/ModifierService.ts` 
- [ ] Add `modifiers` array to KingdomState
- [ ] Create modifier store actions in `src/stores/kingdom.ts`

### Step 2: Update Event Data Files (Priority: High)
- [ ] Add `ifUnresolved` field to all 37 event JSON files
- [ ] Categorize events by unresolved behavior:
  - Continuous (become modifiers)
  - Auto-resolve (apply failure once)
  - Expire (opportunity lost)
  - Transform (become different events)
- [ ] Run `python scripts/combine-data.py` to rebuild `dist/events.json`

### Step 3: Create Event Service (Priority: High)
- [ ] Create `src/services/EventService.ts`
- [ ] Load events from `dist/events.json` instead of hardcoding
- [ ] Implement unresolved event processing
- [ ] Handle event-to-modifier conversion

### Step 4: Update UI Components (Priority: Medium)
- [ ] Update `EventsPhase.svelte` to:
  - Show unresolved event warnings
  - Display active event-based modifiers
  - Allow resolution attempts
- [ ] Update `UpkeepPhase.svelte` to:
  - Process unresolved events
  - Apply modifier effects
  - Remove expired modifiers

### Step 5: Integration & Testing (Priority: Medium)
- [ ] Connect modifier system to dice roll calculations
- [ ] Add modifier display to UI
- [ ] Test event resolution flow
- [ ] Test modifier expiration

## Phase 4: Event Categorization

### Events that become Continuous Modifiers:
- **Bandit Activity** - Ongoing raids (-resources, +unrest)
- **Cult Activity** - Spreading influence (+unrest)
- **Demand Structure** - Protests continue (+unrest or -gold)
- **Demand Expansion** - Citizens unhappy (+unrest)
- **Drug Den** - Trade expands (+unrest, -gold)
- **Feud** - Disrupts settlements (+unrest)
- **Food Shortage** - Continuing shortage (-food, +unrest)
- **Inquisition** - Persecution continues (+unrest)
- **Monster Attack** → **Monster Lair Nearby** - Ongoing threat
- **Plague** - Disease spreads (+unrest, -gold)
- **Raiders** - Ongoing pillaging (-resources, +unrest)
- **Undead Uprising** - Undead spread (damages structures)

### Events that Auto-Resolve with Failure:
- **Assassination Attempt** - Leader escapes (+unrest)
- **Local Disaster** - Damage occurs (structure damaged)
- **Natural Disaster** - Damage to hexes (lose production)
- **Public Scandal** - Outrage spreads (+unrest)

### Events that Expire (Opportunity Lost):
- **Archaeological Find** - Site looted (gain 1 resource)
- **Boomtown** - Growth stalls (no effect)
- **Diplomatic Overture** - Opportunity missed
- **Economic Surge** - Surge ends
- **Festive Invitation** - Invitation declined
- **Food Surplus** - Surplus spoils (+unrest after delay)
- **Good Weather** - Weather changes
- **Grand Tournament** - No tournament held
- **Immigration** - Settlers move on
- **Justice Prevails** - Justice delayed
- **Land Rush** - Settlers disperse
- **Magical Discovery** - Magic dissipates
- **Military Exercises** - Training window missed
- **Nature's Blessing** - Blessing passes
- **Notorious Heist** - Thieves escape
- **Pilgrimage** - Pilgrims move on
- **Remarkable Treasure** - Others claim it
- **Scholarly Discovery** - Research stalls
- **Sensational Crime** - Criminal escapes
- **Trade Agreement** - Merchants leave
- **Visiting Celebrity** - Celebrity leaves offended

## Phase 5: Extended Features (Future)

### 5.1 Trade Agreement Modifiers
- Persistent trade bonuses/penalties
- Duration based on diplomatic relations
- Can be cancelled or renegotiated

### 5.2 Diplomatic Modifiers  
- Relations-based modifiers
- War/peace status effects
- Alliance benefits

### 5.3 Structure-Based Modifiers
- Building completion bonuses
- Synergy bonuses between structures
- Damaged structure penalties

### 5.4 Temporary Boosts
- Action success bonuses
- Event rewards with duration
- Magical effects

## Testing Checklist

- [ ] Events generate correct modifiers when unresolved
- [ ] Modifiers apply effects correctly each turn
- [ ] Expired modifiers are removed
- [ ] Resolution attempts work correctly
- [ ] UI displays active modifiers
- [ ] Save/load preserves modifier state
- [ ] Modifier priorities apply in correct order

## Notes

- The modifier system should be generic enough to handle future expansion
- Consider performance with many active modifiers
- Ensure save game compatibility when adding new modifier types
- The UI should clearly show which modifiers are affecting rolls
