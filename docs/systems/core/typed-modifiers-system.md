# Typed Modifiers System

**Purpose:** Type-safe resource modifications using explicit TypeScript discriminants instead of regex pattern matching

---

## Overview

The Typed Modifiers System provides structured, type-safe handling of all resource changes in the kingdom:
- **Static modifiers** - Fixed numeric values
- **Dice modifiers** - Player-rolled values
- **Choice modifiers** - Player-selected resources

**Key Benefit:** Eliminates brittle regex patterns with compile-time type safety.

---

## Modifier Types

### StaticModifier

Fixed numeric value applied to a resource.

```typescript
interface StaticModifier {
  type: 'static';
  resource: ResourceType;
  value: number;
  duration?: ModifierDuration;
}
```

**Example:**
```json
{
  "type": "static",
  "resource": "unrest",
  "value": 1,
  "duration": "immediate"
}
```

**Usage:** Most common modifier type for immediate numerical changes.

### DiceModifier

Requires player to roll dice for the value.

```typescript
interface DiceModifier {
  type: 'dice';
  resource: ResourceType;
  formula: string;        // Just the formula (no negative sign)
  negative?: boolean;     // Separate flag for negative
  duration?: ModifierDuration;
}
```

**Examples:**
```json
{
  "type": "dice",
  "resource": "gold",
  "formula": "2d6",
  "negative": true,
  "duration": "immediate"
}
```

**Pattern:** Formula is always positive, `negative` flag controls application.

### ChoiceModifier

Player chooses from multiple resource options.

```typescript
interface ChoiceModifier {
  type: 'choice';
  resources: ResourceType[];  // Player selects from these
  value: number | DiceValue;  // Can be static or dice
  duration?: ModifierDuration;
}
```

**Example:**
```json
{
  "type": "choice",
  "resources": ["lumber", "ore", "food", "stone"],
  "value": {
    "formula": "2d4+1",
    "negative": true
  },
  "duration": "immediate"
}
```

**UI:** Renders as dropdown selection in OutcomeDisplay.

---

## Duration Types

### Immediate

Applies once when outcome is applied. Used for **all event/incident modifiers**.

```json
{
  "duration": "immediate"
}
```

**Use Case:** Any modifier that applies when you click "Apply Result"
- Event outcomes (always immediate)
- Incident outcomes (always immediate)
- Action results (usually immediate)

**Important:** Even if the event has trait `"ongoing"` (event repeats), modifiers are still `"immediate"` (apply once per roll).

### Ongoing

Applies automatically every turn during Status phase. Used for **structures** and **custom modifiers**.

```json
{
  "duration": "ongoing"
}
```

**Use Cases:**
1. **Structure bonuses** - Farm gives +1 Agriculture every turn
2. **Custom modifiers** - Created by ModifierService for unresolved events/incidents

**Important:** NOT used for event/incident modifiers. The event itself can be ongoing (repeats), but its modifiers apply immediately each roll.

### Turn Count

Lasts for specific number of turns. Rarely used.

```json
{
  "duration": 3  // Expires after 3 turns
}
```

**Use Case:** Temporary buffs/debuffs with fixed duration (mostly theoretical, not used in current data).

---

## Duration Semantics

**Key Distinction:**

- **Event trait `"ongoing"`** → Event repeats each turn until resolved
- **Modifier duration `"immediate"`** → Modifier applies once when you click "Apply Result"
- **Modifier duration `"ongoing"`** → Modifier applies automatically every turn (structures only)

**Example (drug-den event):**
```json
{
  "traits": ["ongoing"],  // Event repeats
  "criticalFailure": {
    "modifiers": [
      { "resource": "unrest", "value": 2, "duration": "immediate" },  // Apply once
      { "resource": "damage_structure", "value": 1, "duration": "immediate" }  // Apply once
    ],
    "endsEvent": false  // Event will appear again next turn
  }
}
```

**Flow:**
1. Turn 1: Roll → Critical failure → Click "Apply Result" → +2 unrest, structure damaged (applied once)
2. Turn 2: Event appears again → Must roll again → New outcome applies

**Wrong Pattern (DON'T DO THIS):**
```json
{
  "traits": ["ongoing"],
  "failure": {
    "modifiers": [
      { "resource": "unrest", "value": 1, "duration": "ongoing" }  // ❌ WRONG
    ]
  }
}
```

This would skip the modifier during event application (code expects "ongoing" to mean "applied during Status phase").

---

## Resource Types

```typescript
type ResourceType = 
  // Basic resources
  | 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries'
  // Kingdom stats
  | 'unrest' | 'fame'
  // Special resources
  | 'imprisoned_unrest'  // Unrest from imprisoning dissidents
  | 'damage_structure';  // Damage to kingdom structures
```

---

## Outcome Structure

All outcomes (events, incidents, actions) use the same structure:

```typescript
interface EventOutcome {
  msg?: string;                   // Description with {resourceName} placeholders
  modifiers?: EventModifier[];    // Resource changes
  manualEffects?: string[];       // GM instructions (not auto-applied)
  endsEvent?: boolean;            // For events: should it persist?
}

type EventModifier = StaticModifier | DiceModifier | ChoiceModifier;
```

### Message Placeholders

Use `{resourceName}` in messages to auto-display values:

```json
{
  "msg": "Lose {gold} gold and {fame} fame",
  "modifiers": [
    { "type": "static", "resource": "gold", "value": -10 },
    { "type": "dice", "resource": "fame", "formula": "1d4", "negative": true }
  ]
}
```

**Resolution:**
1. System detects dice modifier
2. Player rolls 1d4 (result: 3)
3. Message becomes: "Lose 10 gold and 3 fame"
4. Effects applied: gold -10, fame -3

---

## Type Discrimination

### Detection Pattern

```typescript
// Use type field, not pattern matching
function processModifier(modifier: EventModifier) {
  switch (modifier.type) {
    case 'static':
      return applyStatic(modifier.resource, modifier.value);
      
    case 'dice':
      // Rendered as clickable badge in OutcomeBadges.svelte
      return showDiceBadge(modifier.formula, modifier.negative);
      
    case 'choice':
      return showChoiceDropdown(modifier.resources, modifier.value);
  }
}
```

### Type Guards

```typescript
import { isDiceModifier, isChoiceModifier, isStaticModifier } from '../types/modifiers';

if (isDiceModifier(modifier)) {
  // TypeScript knows: modifier.formula exists
  const roll = rollDice(modifier.formula);
}
```

---

## Manual Effects

Some effects cannot be automated (map changes, NPC reactions, etc.):

```json
{
  "msg": "The plague becomes endemic!",
  "modifiers": [
    { "type": "static", "resource": "unrest", "value": 3 }
  ],
  "manualEffects": [
    "Mark your largest settlement as 'Quarantined' (no new structures for 1 turn)",
    "Remove 1d3 hexes of farmland from your kingdom map"
  ]
}
```

**Display:** Warning-styled box with orange highlighting in OutcomeDisplay.

**Application:** Player/GM manually applies these effects.

---

## Game Commands System

Game commands provide automated gameplay mechanics alongside resource modifiers.

**Dual-Effect Architecture:**

Action outcomes use two parallel systems:
- **Modifiers** - Resource changes (gold, food, unrest, fame, etc.)
- **GameCommands** - Gameplay mechanics (claim hexes, recruit armies, build structures, etc.)

```typescript
interface ActionEffect {
  description: string;
  modifiers?: EventModifier[];        // Resource changes (this system)
  gameCommands?: GameCommand[];       // Gameplay mechanics (see game-commands-system.md)
}
```

**Implementation:**
- 25+ typed command interfaces in `src/controllers/actions/game-commands.ts`
- Command execution via `GameCommandsService` and `GameCommandsResolver`
- Full integration with player actions in `data/player-actions/*.json`

**Command Categories:**
- Territory & Expansion (claimHexes, buildRoads, fortifyHex)
- Construction (buildStructure, foundSettlement, upgradeSettlement)
- Military Operations (recruitArmy, trainArmy, deployArmy, disbandArmy)
- Diplomatic Actions (establishDiplomaticRelations, requestEconomicAid)
- Event Management (resolveEvent, hireAdventurers, arrestDissidents)

See `docs/systems/core/game-commands-system.md` for comprehensive documentation.

---

## Integration Points

### With Check Instance System

OutcomePreviews store outcomes with typed modifiers:

```typescript
appliedOutcome: {
  modifiers: EventModifier[];  // Typed array
  manualEffects: string[];
  // ... other fields
}
```

### With PipelineCoordinator

**Automatic Badge Conversion (Step 5):**

All JSON modifiers are automatically converted to outcome badges during Step 5 (Calculate Preview) of the pipeline:

```typescript
// PipelineCoordinator.step5_calculatePreview()
// STEP 5A: Auto-convert JSON modifiers to badges (ALWAYS)
const modifierBadges = convertModifiersToBadges(modifiers, ctx.metadata);

// STEP 5B: Call custom preview.calculate if defined (OPTIONAL)
let customPreview = { resources: [], outcomeBadges: [] };
if (pipeline.preview.calculate) {
  customPreview = await unifiedCheckHandler.calculatePreview(...);
}

// STEP 5C: Merge JSON badges + custom badges
const preview = {
  outcomeBadges: [
    ...modifierBadges,              // JSON modifiers (AUTOMATIC)
    ...customPreview.outcomeBadges  // Custom badges (OPTIONAL)
  ]
};
```

**Benefits:**
- ✅ **Zero boilerplate** - Actions don't need to call conversion manually
- ✅ **Single source** - All badge creation happens in one place
- ✅ **Consistent styling** - All resources use appropriate icons and colors
- ✅ **Special cases** - Unrest color logic handled automatically (lose = green, gain = red)

**Conversion Service:**
- Location: `src/pipelines/shared/convertModifiersToBadges.ts`
- Handles: Static modifiers, dice modifiers, special resources
- Smart coloring: Unrest uses inverted logic (losing unrest is positive)
- Always uses resource-appropriate icons from `getResourceIcon()`

**Badge Color Logic:**

Normal resources (gold, food, lumber, etc.):
- Gain → 🟢 Green (positive variant)
- Lose → 🔴 Red (negative variant)

Unrest (special case):
- Lose → 🟢 Green (positive variant) - Reducing unrest is beneficial!
- Gain → 🔴 Red (negative variant) - Increasing unrest is harmful!

```typescript
// convertModifiersToBadges.ts
if (resource === 'unrest') {
  variant = isNegative ? 'positive' : 'negative';  // Inverted logic
} else {
  variant = isNegative ? 'negative' : 'positive';  // Normal logic
}
```

**Critical Success Fame Badge:**

All critical successes automatically display a +1 Fame badge with golden star icon (applied in PipelineCoordinator Step 8).

```typescript
// OutcomeBadges.svelte
$: fameBadge = outcome === 'criticalSuccess' ? [{
  icon: 'fa-star',
  template: 'Fame increased by {{value}}',
  value: { type: 'static', amount: 1 },
  variant: 'positive'
}] : [];
```

### With OutcomeDisplay

OutcomeDisplay displays unified outcome badges:
- Shows all badges in "Outcome:" section
- Dice badges are interactive (click to roll)
- Static badges display immediately
- Validates all dice resolved before enabling "Apply Result"

**Note:** The old `stateChanges` and `modifiers` props have been removed. All outcome display now uses the unified `outcomeBadges` array populated by the pipeline.

### With GameEffectsService

GameEffectsService receives final numeric values after user interaction:

```typescript
interface ResolutionData {
  numericModifiers: Array<{
    resource: string;
    value: number;  // Already rolled/chosen
  }>;
  manualEffects: string[];
  complexActions: any[];  // Future: game effects
}
```

---

## Migration from String-Based

### Before (Regex Pattern)

```json
{
  "resource": "gold",
  "value": "-2d6"
}
```

**Problems:**
- Brittle regex matching
- No type safety
- Hard to validate
- Easy to introduce bugs

### After (Typed)

```json
{
  "type": "dice",
  "resource": "gold",
  "formula": "2d6",
  "negative": true
}
```

**Benefits:**
- ✅ Explicit type field
- ✅ Compile-time validation
- ✅ Self-documenting
- ✅ Easy to extend

---

## Build Integration

### Hand-Written Types

**File:** `src/types/modifiers.ts`

**Status:** Hand-written, never auto-generated

**Header:**
```typescript
// ⚠️ HAND-WRITTEN - DO NOT AUTO-GENERATE ⚠️
```

**Contents:**
- Core modifier type definitions
- Duration types
- Resource types
- Type guards and utilities

### Auto-Generated Types

**Files:** `src/types/events.ts`, `src/types/incidents.ts`

**Pattern:** Import from `modifiers.ts`:
```typescript
import type { 
  EventModifier, 
  ModifierDuration,
  StaticModifier,
  DiceModifier,
  ChoiceModifier 
} from './modifiers';
```

**Build Command:**
```bash
npm run generate-types
# or
python3 buildscripts/generate-types.py
```

---

## Action Implementation Patterns

**Since January 2025**, the pipeline uses an **execute-first pattern** where modifiers are applied automatically. Most pipelines need no execute function at all.

### Simple Actions (Automatic - Preferred)

For actions that only modify resources, JSON modifiers are applied automatically:

```typescript
// src/pipelines/actions/dealWithUnrest.ts
const pipeline = createActionPipeline('deal-with-unrest', {
  requirements: () => ({ met: true }),
  // No preview needed - JSON modifiers auto-convert to badges
  // No execute needed - modifiers applied automatically by execute-first pattern!
});
```

**Key Points:**
- ✅ Set `preview: undefined` - pipeline handles conversion automatically
- ✅ JSON modifiers become badges automatically
- ✅ No execute function needed for simple actions
- ✅ Execute-first pattern handles all modifier application
- ✅ Includes shortfall detection (+1 unrest per shortfall)

### Complex Actions (Custom Execute)

For actions needing custom logic beyond resource changes:

```typescript
const pipeline = createActionPipeline('my-action', {
  preview: {
    calculate: (ctx) => {
      // JSON modifiers already auto-converted by pipeline!
      // Just return ADDITIONAL custom badges here
      return {
        outcomeBadges: [
          textBadge(`Special effect for ${ctx.metadata.name}`, 'fa-star', 'positive')
        ]
      };
    }
  },
  
  execute: async (ctx) => {
    // JSON modifiers ALREADY applied by execute-first pattern
    // Just implement custom game logic here
    
    // For dynamic costs, use GameCommandsService:
    const gameCommandsService = await createGameCommandsService();
    await gameCommandsService.applyNumericModifiers([
      { resource: 'gold', value: -calculatedCost }
    ], ctx.outcome);
    
    // Custom logic
    await doCustomThing(ctx);
    return { success: true };
  }
});
```

**Key Points:**
- ✅ JSON modifiers → Applied automatically (always)
- ✅ Custom badges → Added via preview.calculate (optional)
- ✅ Dynamic costs → Use `applyNumericModifiers()` in execute
- ✅ Final display → JSON badges + custom badges (merged by pipeline)

## Best Practices

### Data Authoring

- ✅ Use clear names: `"Gold Loss from Trade Embargo"`
- ✅ Explicit negatives: `negative: true` for losses
- ✅ Resource placeholders: Match `msg` to modifier resources
- ✅ Manual effects: Clear instructions for GM
- ✅ Let pipeline handle badge conversion (don't duplicate in code)

### Code Implementation

- ✅ Use type discrimination, not regex
- ✅ Use type guards for narrowing
- ✅ Validate structure at build time
- ✅ Handle all cases exhaustively
- ✅ Set `preview: undefined` for simple actions
- ✅ Only use `preview.calculate` when adding custom badges

### UI Implementation

- ✅ OutcomeDisplay handles all types automatically
- ✅ Show dice before rolling
- ✅ Disable "Apply" until all interactions complete
- ✅ Display manual effects prominently
- ✅ Never display stateChanges/modifiers props (removed)
- ✅ Only display outcomeBadges array

---

## Examples

### Static Value

```json
{
  "success": {
    "msg": "Gain {gold} gold and {fame} fame",
    "modifiers": [
      { "type": "static", "resource": "gold", "value": 10 },
      { "type": "static", "resource": "fame", "value": 2 }
    ]
  }
}
```

### Dice Roll

```json
{
  "failure": {
    "msg": "Lose {gold} gold",
    "modifiers": [
      {
        "type": "dice",
        "resource": "gold",
        "formula": "2d6",
        "negative": true
      }
    ]
  }
}
```

### Player Choice

```json
{
  "failure": {
    "msg": "Minor artifacts; gain 1 of your choice",
    "modifiers": [
      {
        "type": "choice",
        "resources": ["food", "lumber", "ore", "stone"],
        "value": 1,
        "duration": 1
      }
    ]
  }
}
```

### Mixed with Manual Effects

```json
{
  "criticalFailure": {
    "msg": "The plague becomes endemic!",
    "modifiers": [
      { "type": "static", "resource": "food", "formula": "-1d4", "duration": "ongoing" },
      { "type": "static", "resource": "unrest", "value": 3 }
    ],
    "manualEffects": [
      "Mark your largest settlement as 'Quarantined'",
      "Remove 1d3 hexes of farmland from your kingdom map"
    ],
    "endsEvent": false
  }
}
```

---

## Summary

The Typed Modifiers System provides:

- ✅ Explicit type discrimination (no regex)
- ✅ Compile-time type safety
- ✅ Self-documenting data structures
- ✅ Consistent handling across all outcome types
- ✅ Easy validation and extension
- ✅ Automatic UI rendering in OutcomeDisplay

This architecture replaces brittle string parsing with a robust, maintainable type system that scales with the project's complexity.
