# Event Testing Workflow

## Overview

This document outlines the systematic testing process for all 37 kingdom events. It follows the same 6-step workflow established for incidents but adapted for events.

## Current State

### Existing Infrastructure
- **37 event pipelines** in `src/pipelines/events/`
- **DebugEventSelector** in `src/view/kingdom/components/DebugEventSelector.svelte` - allows GM to load any event
- Events appear in the **Events Phase** (`EventsPhase.svelte`)
- Events use `checkType: 'event'` in pipelines

### Missing Infrastructure (To Build)
1. **`src/constants/migratedEvents.ts`** - Event status tracking file (like `migratedIncidents.ts`)
2. **EventDebugPanel** (optional) - Dedicated panel showing all events by category with status badges

---

## Step 1: Create Event Status Tracking File

Create `src/constants/migratedEvents.ts` following the incident pattern:

```typescript
/**
 * Event Testing Status Tracking
 * 
 * Tracks which events have been tested with the PipelineCoordinator.
 */

export type EventStatus = 'untested' | 'testing' | 'tested';

/**
 * Event status tracking
 * Key: event ID
 * Value: current status
 */
export const EVENT_STATUS = new Map<string, EventStatus>([
  // Beneficial Events
  ['archaeological-find', 'untested'],      // #1
  ['boomtown', 'untested'],                 // #2
  ['economic-surge', 'untested'],           // #3
  ['food-surplus', 'untested'],             // #4
  ['good-weather', 'untested'],             // #5
  ['immigration', 'untested'],              // #6
  ['magical-discovery', 'untested'],        // #7
  ['natures-blessing', 'untested'],         // #8
  ['remarkable-treasure', 'untested'],      // #9
  ['scholarly-discovery', 'untested'],      // #10
  ['trade-agreement', 'untested'],          // #11
  ['visiting-celebrity', 'untested'],       // #12
  
  // Dangerous Events
  ['assassination-attempt', 'untested'],    // #13
  ['bandit-activity', 'untested'],          // #14
  ['cult-activity', 'untested'],            // #15
  ['drug-den', 'untested'],                 // #16
  ['feud', 'untested'],                     // #17
  ['food-shortage', 'untested'],            // #18
  ['inquisition', 'untested'],              // #19
  ['local-disaster', 'untested'],           // #20
  ['monster-attack', 'untested'],           // #21
  ['natural-disaster', 'untested'],         // #22
  ['notorious-heist', 'untested'],          // #23
  ['plague', 'untested'],                   // #24
  ['public-scandal', 'untested'],           // #25
  ['raiders', 'untested'],                  // #26
  ['sensational-crime', 'untested'],        // #27
  ['undead-uprising', 'untested'],          // #28
  
  // Neutral/Mixed Events
  ['criminal-trial', 'untested'],           // #29
  ['demand-expansion', 'untested'],         // #30
  ['demand-structure', 'untested'],         // #31
  ['diplomatic-overture', 'untested'],      // #32
  ['festive-invitation', 'untested'],       // #33
  ['grand-tournament', 'untested'],         // #34
  ['land-rush', 'untested'],                // #35
  ['military-exercises', 'untested'],       // #36
  ['pilgrimage', 'untested'],               // #37
]);

/**
 * Event numbers (for display in badges)
 */
export const EVENT_NUMBERS = new Map<string, number>([
  // ... generate based on above list
]);

export function getEventStatus(eventId: string): EventStatus {
  return EVENT_STATUS.get(eventId) || 'untested';
}

export function getEventNumber(eventId: string): number | undefined {
  return EVENT_NUMBERS.get(eventId);
}
```

---

## Step 2: Verify Event Pipeline Structure

Each event pipeline should have this structure:

```typescript
export const exampleEventPipeline: CheckPipeline = {
  id: 'example-event',
  name: 'Example Event',
  description: 'Description of what happens',
  checkType: 'event',  // MUST be 'event'
  tier: 1,             // Events typically use tier: 1
  
  skills: [
    { skill: 'diplomacy', description: 'negotiate' },
  ],
  
  outcomes: {
    criticalSuccess: {
      description: 'Best outcome',
      endsEvent: false,  // true = ends ongoing event
      modifiers: [...]
    },
    success: {
      description: 'Good outcome',
      modifiers: [...]
    },
    failure: {
      description: 'Bad outcome',
      modifiers: [...]
    },
    criticalFailure: {
      description: 'Worst outcome',
      modifiers: [...]
    },
  },
  
  traits: ["beneficial" | "dangerous" | "ongoing"],
  
  preview: {
    async calculate(ctx) {
      return { resources: [], outcomeBadges: [], warnings: [] };
    }
  },
};
```

---

## Step 3: Testing Workflow (Per Event)

### 3.1 Pre-Test Verification Checklist
- [ ] Event file exists in `src/pipelines/events/`
- [ ] `checkType: 'event'` is set
- [ ] All 4 outcomes exist (`criticalSuccess`, `success`, `failure`, `criticalFailure`)
- [ ] `traits` array includes appropriate trait(s)
- [ ] If beneficial: positive modifiers on success
- [ ] If dangerous: negative modifiers on failure
- [ ] If ongoing: `endsEvent: false` on success, `endsEvent: true` on failure

### 3.2 Common Issues to Check
1. **Missing criticalSuccess** - Copy success outcome
2. **Old gameCommands format** - Migrate to `preview.calculate()` + `execute()`
3. **Missing outcomeBadges** - Add static badges for preview
4. **No endsEvent property** - Ongoing events need this
5. **Wrong trait** - Ensure matches outcome effects

### 3.3 Test in Foundry
1. Open Events Phase (during kingdom turn)
2. Use Debug selector (GM only) to load the event
3. Test each skill option
4. Test each outcome (roll multiple times)
5. Verify:
   - [ ] Possible outcomes display correctly
   - [ ] Roll works for each skill
   - [ ] Outcome badges show correct values
   - [ ] Modifiers apply correctly
   - [ ] Game commands execute (if any)
   - [ ] Ongoing events persist (if trait present)

### 3.4 Mark as Tested
Update `src/constants/migratedEvents.ts`:
```typescript
['event-id', 'tested'],
```

---

## Step 4: Event Categories

### Beneficial Events (12)
Events with positive effects on success. Should have `traits: ["beneficial"]`.

| # | ID | Name |
|---|-----|------|
| 1 | archaeological-find | Archaeological Find |
| 2 | boomtown | Boomtown |
| 3 | economic-surge | Economic Surge |
| 4 | food-surplus | Food Surplus |
| 5 | good-weather | Good Weather |
| 6 | immigration | Immigration |
| 7 | magical-discovery | Magical Discovery |
| 8 | natures-blessing | Nature's Blessing |
| 9 | remarkable-treasure | Remarkable Treasure |
| 10 | scholarly-discovery | Scholarly Discovery |
| 11 | trade-agreement | Trade Agreement |
| 12 | visiting-celebrity | Visiting Celebrity |

### Dangerous Events (16)
Events with negative effects on failure. Should have `traits: ["dangerous"]`.

| # | ID | Name |
|---|-----|------|
| 13 | assassination-attempt | Assassination Attempt |
| 14 | bandit-activity | Bandit Activity |
| 15 | cult-activity | Cult Activity |
| 16 | drug-den | Drug Den |
| 17 | feud | Feud |
| 18 | food-shortage | Food Shortage |
| 19 | inquisition | Inquisition |
| 20 | local-disaster | Local Disaster |
| 21 | monster-attack | Monster Attack |
| 22 | natural-disaster | Natural Disaster |
| 23 | notorious-heist | Notorious Heist |
| 24 | plague | Plague |
| 25 | public-scandal | Public Scandal |
| 26 | raiders | Raiders |
| 27 | sensational-crime | Sensational Crime |
| 28 | undead-uprising | Undead Uprising |

### Neutral/Mixed Events (9)
Events that can go either way. May have mixed or no traits.

| # | ID | Name |
|---|-----|------|
| 29 | criminal-trial | Criminal Trial |
| 30 | demand-expansion | Demand Expansion |
| 31 | demand-structure | Demand Structure |
| 32 | diplomatic-overture | Diplomatic Overture |
| 33 | festive-invitation | Festive Invitation |
| 34 | grand-tournament | Grand Tournament |
| 35 | land-rush | Land Rush |
| 36 | military-exercises | Military Exercises |
| 37 | pilgrimage | Pilgrimage |

---

## Step 5: Optional - Create EventDebugPanel

Create a dedicated panel similar to `IncidentDebugPanel.svelte`:

**File**: `src/view/kingdom/components/EventDebugPanel.svelte`

Features:
- Group events by trait (beneficial, dangerous, neutral)
- Show testing status badge (untested/testing/tested)
- Click to load event for testing
- Filter by tested/untested
- Reactive to kingdom store updates

---

## Execution Order

Recommended testing order by complexity:

### Phase 1: Simple Events (No Game Commands)
1-12: Beneficial events (straightforward positive effects)

### Phase 2: Dangerous Events
13-28: Events with negative effects (may need handler migration)

### Phase 3: Complex Events  
29-37: Events with special mechanics (demands, trials, etc.)

---

## Quick Reference: File Locations

```
src/
├── constants/
│   └── migratedEvents.ts          # CREATE: Event status tracking
├── pipelines/
│   └── events/
│       └── *.ts                   # 37 event files to test
├── view/
│   └── kingdom/
│       ├── components/
│       │   ├── DebugEventSelector.svelte  # EXISTS: Load any event
│       │   └── EventDebugPanel.svelte     # OPTIONAL: Full debug panel
│       └── turnPhases/
│           └── EventsPhase.svelte         # EXISTS: Events phase UI
```

---

## Notes

- Events are simpler than incidents (most just apply modifiers)
- `endsEvent` property is specific to ongoing events
- Use `DebugEventSelector` in Events Phase to test each event
- Focus on verifying modifiers apply correctly and badges display properly
- Follow same 6-step workflow used for incidents

